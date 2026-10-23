import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash, randomInt } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { appUrl, emailOf, money, resendKey, sendEmail, when } from './email';
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';

// Same region as the Firestore database
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });

initializeApp();
const db = getFirestore();

type TextPart = { text: string; bold?: boolean };

// Notifications are written here (never by clients). The id is fixed so a retry can't duplicate it.
const notify = (uid: string, id: string, text: TextPart[]) =>
  db.doc(`users/${uid}/notifications/${id}`).set({
    icon: 'calendar',
    text,
    unread: true,
    createdAt: FieldValue.serverTimestamp(),
  });

type PriceRule = { days: number[]; start: string; end: string; price: number };
type Service = { id: string; price: number; durationMinutes: number; priceRules?: PriceRule[] };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The price of a service for an appointment that starts at `startsAt`, counted in Brazil's time
// (the same rule as the app: the first price rule that matches the day and the start time wins)
const priceAt = (service: Service, startsAt: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(startsAt);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = WEEKDAYS.indexOf(part('weekday'));
  const time = `${part('hour')}:${part('minute')}`;

  return (
    (service.priceRules ?? []).find((rule) => rule.days.includes(weekday) && time >= rule.start && time < rule.end)
      ?.price ?? service.price
  );
};

// A new booking: the server is the source of truth for prices, then both sides are notified
export const onBookingCreated = onDocumentCreated({ document: 'bookings/{bookingId}', secrets: [resendKey] }, async (event) => {
  const booking = event.data?.data();
  if (!booking) return;

  const { bookingId } = event.params;
  const professional = await db.doc(`professionals/${booking.professionalId}`).get();

  // Recomputes the total and duration from the professional's real services
  const catalog: Service[] = professional.data()?.['services'] ?? [];
  const chosen = (booking.services as Service[]).map((s) => catalog.find((c) => c.id === s.id));
  if (professional.exists && chosen.every(Boolean)) {
    const services = chosen as Service[];
    const startsAt: Date = booking.startsAt.toDate();
    const total = Math.round(services.reduce((sum, s) => sum + priceAt(s, startsAt), 0) * 100) / 100;
    const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    if (total !== booking.total || durationMinutes !== booking.durationMinutes) {
      await event.data!.ref.update({ total, durationMinutes, correctedByServer: true });
    }
  }

  await notify(booking.clientUid, `${bookingId}-requested`, [
    { text: 'Você solicitou um horário com ' },
    { text: booking.professionalName, bold: true },
  ]);

  if (booking.professionalUid) {
    await notify(booking.professionalUid, `${bookingId}-new`, [
      { text: 'Nova solicitação de ' },
      { text: booking.clientName, bold: true },
    ]);
  }

  // The same news by e-mail
  const fresh = (await event.data!.ref.get()).data() ?? booking;
  const details = bookingDetails(fresh);
  const clientEmail = await emailOf(booking.clientUid);
  if (clientEmail) {
    await sendEmail({
      to: clientEmail,
      subject: 'Recebemos o seu pedido de agendamento',
      heading: 'Pedido enviado',
      paragraphs: [`Você solicitou um horário com ${booking.professionalName}. Assim que ela ou ele responder, você recebe um aviso.`],
      details,
      button: { label: 'Ver minha agenda', url: `${appUrl.value()}/agenda` },
    });
  }
  const professionalEmail = await emailOf(booking.professionalUid);
  if (professionalEmail) {
    await sendEmail({
      to: professionalEmail,
      subject: 'Nova solicitação de agendamento',
      heading: 'Nova solicitação',
      paragraphs: [`${booking.clientName} pediu um horário com você.`],
      details,
      button: { label: 'Responder na agenda', url: `${appUrl.value()}/pro` },
    });
  }
});

// What the e-mails say about a booking
const bookingDetails = (booking: FirebaseFirestore.DocumentData) => [
  { label: 'Quando', value: when(booking.startsAt.toDate()) },
  { label: 'Serviços', value: (booking.services as { name: string }[]).map((service) => service.name).join(', ') },
  { label: 'Total', value: money(booking.total) },
];

const VERB: Record<string, string> = {
  confirmed: 'confirmou',
  declined: 'recusou',
  cancelledByProfessional: 'cancelou',
  completed: 'concluiu',
};

// The professional answered the request: tells the client
export const onBookingUpdated = onDocumentUpdated({ document: 'bookings/{bookingId}', secrets: [resendKey] }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;

  // The client cancelled: tells the professional
  if (after.status === 'cancelled') {
    if (after.professionalUid) {
      await notify(after.professionalUid, `${event.params.bookingId}-cancelled`, [
        { text: after.clientName, bold: true },
        { text: ' cancelou o agendamento' },
      ]);
    }
    const professionalEmail = await emailOf(after.professionalUid);
    if (professionalEmail) {
      await sendEmail({
        to: professionalEmail,
        subject: 'Um agendamento foi cancelado',
        heading: 'Agendamento cancelado',
        paragraphs: [`${after.clientName} cancelou o agendamento. O horário está livre de novo.`],
        details: bookingDetails(after),
        button: { label: 'Abrir a agenda', url: `${appUrl.value()}/pro` },
      });
    }
    return;
  }

  const verb = VERB[after.status];
  if (!verb) return;

  await notify(after.clientUid, `${event.params.bookingId}-${after.status}`, [
    { text: after.professionalName, bold: true },
    { text: ` ${verb} o seu agendamento` },
  ]);

  const clientEmail = await emailOf(after.clientUid);
  if (clientEmail) {
    await sendEmail({
      to: clientEmail,
      subject: `${after.professionalName} ${verb} o seu agendamento`,
      heading: `Agendamento ${STATUS_TITLE[after.status] ?? ''}`.trim(),
      paragraphs: [`${after.professionalName} ${verb} o seu agendamento.`],
      details: bookingDetails(after),
      button: { label: 'Ver minha agenda', url: `${appUrl.value()}/agenda` },
    });
  }
});

const STATUS_TITLE: Record<string, string> = {
  confirmed: 'confirmado',
  declined: 'recusado',
  cancelledByProfessional: 'cancelado',
  completed: 'concluído',
};

// Welcome e-mails: a client when the account is created, a professional when the sign up starts
export const onClientCreated = onDocumentCreated({ document: 'users/{uid}', secrets: [resendKey] }, async (event) => {
  const to = await emailOf(event.params.uid);
  if (!to) return;
  const name = (event.data?.data()?.['firstName'] as string | undefined) ?? '';
  await sendEmail({
    to,
    subject: 'Bem-vinda(o) ao Find Your Beauty',
    heading: name ? `Olá, ${name}!` : 'Bem-vinda(o)!',
    paragraphs: ['Sua conta foi criada. Agora você pode encontrar profissionais de maquiagem e cabelo perto de você e agendar um horário.'],
    button: { label: 'Encontrar profissionais', url: `${appUrl.value()}/explore` },
  });
});

export const onProfessionalCreated = onDocumentCreated({ document: 'professionals/{uid}', secrets: [resendKey] }, async (event) => {
  const to = await emailOf(event.params.uid);
  if (!to) return;
  await sendEmail({
    to,
    subject: 'Bem-vinda(o) ao Find Your Beauty',
    heading: 'Seu cadastro começou',
    paragraphs: [
      'Complete o seu perfil com foto, serviços, horários e onde você atende, e envie o cadastro. Nossa equipe analisa e avisa por e-mail quando ele for aprovado.',
    ],
    button: { label: 'Completar o cadastro', url: `${appUrl.value()}/pro/cadastro` },
  });
});

// An admin approved or denied a professional: tells her
export const onProfessionalReviewed = onDocumentUpdated({ document: 'professionals/{uid}', secrets: [resendKey] }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const approved = before['approved'] !== true && after['approved'] === true;
  const denied = before['rejected'] !== true && after['rejected'] === true;
  if (!approved && !denied) return;

  const to = await emailOf(event.params.uid);
  if (!to) return;

  if (approved) {
    await sendEmail({
      to,
      subject: 'Seu cadastro foi aprovado',
      heading: 'Cadastro aprovado',
      paragraphs: ['Seu perfil já está público: os clientes encontram você e podem agendar.'],
      button: { label: 'Entrar na área profissional', url: `${appUrl.value()}/pro/entrar` },
    });
  } else {
    await sendEmail({
      to,
      subject: 'Seu cadastro precisa de ajustes',
      heading: 'Cadastro não aprovado',
      paragraphs: ['Não conseguimos aprovar o seu cadastro desta vez. Entre na área profissional, revise os dados e envie de novo: tudo o que você preencheu continua lá.'],
      button: { label: 'Revisar o cadastro', url: `${appUrl.value()}/pro/entrar` },
    });
  }
});

// Password reset, sent by Resend instead of by Firebase. It always answers ok, so nobody can find out
// which e-mails have an account.
export const sendPasswordReset = onCall({ secrets: [resendKey] }, async (request) => {
  const email = String(request.data?.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpsError('invalid-argument', 'Digite um e-mail válido.');

  try {
    const link = await getAuth().generatePasswordResetLink(email);
    const code = new URL(link).searchParams.get('oobCode');
    if (code) {
      await sendEmail({
        to: email,
        subject: 'Redefinir a sua senha',
        heading: 'Redefinir a senha',
        paragraphs: ['Recebemos um pedido para redefinir a senha da sua conta. Se foi você, use o botão abaixo. Se não foi, é só ignorar este e-mail.'],
        button: { label: 'Escolher uma nova senha', url: `${appUrl.value()}/redefinir-senha?mode=resetPassword&oobCode=${code}` },
      });
    }
  } catch (error) {
    // No account with this e-mail, or any other failure: nothing is said to the caller
    console.error('Password reset not sent', (error as { code?: string }).code ?? error);
  }
  return { ok: true };
});

// Keeps the average rating and the count shown on cards in sync with the reviews
export const onReviewWritten = onDocumentWritten('professionals/{professionalId}/reviews/{clientUid}', async (event) => {
  const ref = db.doc(`professionals/${event.params.professionalId}`);
  const reviews = await ref.collection('reviews').get();
  const total = reviews.docs.reduce((sum, review) => sum + (review.data()['stars'] as number), 0);
  const rating = reviews.size ? Math.round((total / reviews.size) * 10) / 10 : 0;
  await ref.update({ rating, reviewsCount: String(reviews.size) });
});

// Instagram integration (see instagram.ts)
export {
  connectInstagram,
  disconnectInstagram,
  instagramDataDeletion,
  refreshInstagram,
  syncInstagramDaily,
} from './instagram';

// ----- E-mail verification with a 4 digit code (clients that sign up with e-mail and password)
// The code is kept hashed in emailCodes/{uid}, which no rule opens: only these functions use it.
const CODE_MINUTES = 10;
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const hashCode = (uid: string, code: string) => createHash('sha256').update(`${uid}:${code}`).digest('hex');
const cleanEmail = (value: unknown) => {
  const email = String(value ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpsError('invalid-argument', 'Digite um e-mail válido.');
  return email;
};
const userByEmail = async (email: string) => {
  try {
    return await getAuth().getUserByEmail(email);
  } catch {
    return null;
  }
};

// Sends a new code. It says ok for an unknown or already verified e-mail, so nobody can find out which have an account.
export const sendVerificationCode = onCall({ secrets: [resendKey] }, async (request) => {
  const email = cleanEmail(request.data?.email);
  const user = await userByEmail(email);
  if (!user || user.emailVerified) return { ok: true };

  const ref = db.doc(`emailCodes/${user.uid}`);
  const saved = (await ref.get()).data();
  if (saved && Date.now() - (saved['sentAt'] as number) < RESEND_SECONDS * 1000) {
    throw new HttpsError('resource-exhausted', 'Aguarde um instante para pedir outro código.');
  }

  const code = String(randomInt(0, 10000)).padStart(4, '0');
  await ref.set({
    hash: hashCode(user.uid, code),
    sentAt: Date.now(),
    expiresAt: Date.now() + CODE_MINUTES * 60_000,
    attempts: 0,
  });
  await sendEmail({
    to: email,
    subject: `${code} é o seu código de verificação`,
    heading: 'Confirme o seu e-mail',
    paragraphs: [`Digite este código no app para confirmar o seu e-mail. Ele vale por ${CODE_MINUTES} minutos.`],
    details: [{ label: 'Seu código', value: code.split('').join(' ') }],
  });
  return { ok: true };
});

// Checks the code and marks the e-mail as verified
export const verifyEmailCode = onCall(async (request) => {
  const email = cleanEmail(request.data?.email);
  const code = String(request.data?.code ?? '').trim();
  if (!/^\d{4}$/.test(code)) throw new HttpsError('invalid-argument', 'Digite os 4 números do código.');

  const user = await userByEmail(email);
  if (!user) throw new HttpsError('failed-precondition', 'Código inválido ou expirado.');
  if (user.emailVerified) return { ok: true };

  const ref = db.doc(`emailCodes/${user.uid}`);
  const saved = (await ref.get()).data();
  if (!saved || Date.now() > (saved['expiresAt'] as number) || (saved['attempts'] as number) >= MAX_ATTEMPTS) {
    throw new HttpsError('failed-precondition', 'Código expirado. Peça um novo código.');
  }
  if (saved['hash'] !== hashCode(user.uid, code)) {
    await ref.update({ attempts: FieldValue.increment(1) });
    throw new HttpsError('invalid-argument', 'Código incorreto.');
  }

  await getAuth().updateUser(user.uid, { emailVerified: true });
  await ref.delete();
  return { ok: true };
});
