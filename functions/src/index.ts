import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash, randomInt } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { asLang, emailOf, L, Lang, link, money, resendKey, sendEmail, when } from './email';
import { serviceName } from './catalog';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';

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
    (service.priceRules ?? []).find(
      (rule) => rule.days.includes(weekday) && time >= rule.start && time < rule.end,
    )?.price ?? service.price
  );
};

// A new booking: the server is the source of truth for prices, then both sides are notified
export const onBookingCreated = onDocumentCreated(
  { document: 'bookings/{bookingId}', secrets: [resendKey] },
  async (event) => {
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
      const total =
        Math.round(services.reduce((sum, s) => sum + priceAt(s, startsAt), 0) * 100) / 100;
      const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
      if (total !== booking.total || durationMinutes !== booking.durationMinutes) {
        await event.data!.ref.update({ total, durationMinutes, correctedByServer: true });
      }
    }

    // The client's language is the one of the page where the booking was made; the professional's, the one of her profile
    const clientLang = asLang(booking.lang);
    const professionalLang = asLang(professional.data()?.['lang']);

    await notify(booking.clientUid, `${bookingId}-requested`, [
      {
        text: L(clientLang, {
          pt: 'Você solicitou um horário com ',
          en: 'You requested a time with ',
          es: 'Solicitaste un horario con ',
        }),
      },
      { text: booking.professionalName, bold: true },
    ]);

    if (booking.professionalUid) {
      await notify(booking.professionalUid, `${bookingId}-new`, [
        {
          text: L(professionalLang, {
            pt: 'Nova solicitação de ',
            en: 'New request from ',
            es: 'Nueva solicitud de ',
          }),
        },
        { text: booking.clientName, bold: true },
      ]);
    }

    // The same news by e-mail
    const fresh = (await event.data!.ref.get()).data() ?? booking;
    const clientEmail = await emailOf(booking.clientUid);
    if (clientEmail) {
      await sendEmail({
        to: clientEmail,
        lang: clientLang,
        subject: L(clientLang, {
          pt: 'Recebemos o seu pedido de agendamento',
          en: 'We received your booking request',
          es: 'Recibimos tu solicitud de reserva',
        }),
        heading: L(clientLang, {
          pt: 'Pedido enviado',
          en: 'Request sent',
          es: 'Solicitud enviada',
        }),
        paragraphs: [
          L(clientLang, {
            pt: `Você solicitou um horário com ${booking.professionalName}. Assim que o profissional responder, você recebe um aviso.`,
            en: `You requested a time with ${booking.professionalName}. As soon as they reply, you will get a notice.`,
            es: `Solicitaste un horario con ${booking.professionalName}. En cuanto responda, recibirás un aviso.`,
          }),
        ],
        details: bookingDetails(fresh, clientLang),
        button: {
          label: L(clientLang, {
            pt: 'Ver minha agenda',
            en: 'See my bookings',
            es: 'Ver mis reservas',
          }),
          url: link(clientLang, '/agenda'),
        },
      });
    }
    const professionalEmail = await emailOf(booking.professionalUid);
    if (professionalEmail) {
      await sendEmail({
        to: professionalEmail,
        lang: professionalLang,
        subject: L(professionalLang, {
          pt: 'Nova solicitação de agendamento',
          en: 'New booking request',
          es: 'Nueva solicitud de reserva',
        }),
        heading: L(professionalLang, {
          pt: 'Nova solicitação',
          en: 'New request',
          es: 'Nueva solicitud',
        }),
        paragraphs: [
          L(professionalLang, {
            pt: `${booking.clientName} pediu um horário com você.`,
            en: `${booking.clientName} asked for a time with you.`,
            es: `${booking.clientName} pidió un horario contigo.`,
          }),
        ],
        details: bookingDetails(fresh, professionalLang),
        button: {
          label: L(professionalLang, {
            pt: 'Responder na agenda',
            en: 'Answer in the schedule',
            es: 'Responder en la agenda',
          }),
          url: link(professionalLang, '/pro'),
        },
      });
    }
  },
);

// A confirmed booking is completed by itself once its time is over (the professional doesn't have to do it).
// The update goes through onBookingUpdated, which tells the client the booking is completed.
export const completeFinishedBookings = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'America/Sao_Paulo' },
  async () => {
    const now = Date.now();
    // Only the status is filtered by the query (no composite index); the end of the appointment is checked here
    const confirmed = await db.collection('bookings').where('status', '==', 'confirmed').get();
    const finished = confirmed.docs.filter((booking) => {
      const { startsAt, durationMinutes } = booking.data();
      return startsAt.toMillis() + (durationMinutes ?? 0) * 60_000 <= now;
    });

    await Promise.all(
      finished.map((booking) =>
        booking.ref.update({ status: 'completed', updatedAt: FieldValue.serverTimestamp() }),
      ),
    );
    console.log(`Completed ${finished.length} booking(s)`);
  },
);

// What the e-mails say about a booking
const bookingDetails = (booking: FirebaseFirestore.DocumentData, lang: Lang) => [
  {
    label: L(lang, { pt: 'Quando', en: 'When', es: 'Cuándo' }),
    value: when(booking.startsAt.toDate(), lang),
  },
  {
    label: L(lang, { pt: 'Serviços', en: 'Services', es: 'Servicios' }),
    value: (booking.services as { name: string }[])
      .map((service) => serviceName(service.name, lang))
      .join(', '),
  },
  ...(booking.place
    ? [
        {
          label: L(lang, { pt: 'Onde', en: 'Where', es: 'Dónde' }),
          value:
            booking.place === 'home'
              ? L(lang, { pt: 'A domicílio', en: 'At home', es: 'A domicilio' }) +
                (booking.clientAddress ? `: ${booking.clientAddress}` : '')
              : L(lang, {
                  pt: 'No endereço do profissional',
                  en: "At the professional's address",
                  es: 'En la dirección del profesional',
                }),
        },
      ]
    : []),
  { label: 'Total', value: money(booking.total, lang) },
];

// What the professional did with the request: [verb for the notification and the subject, title of the e-mail]
const ANSWER: Record<string, Record<Lang, [string, string]>> = {
  confirmed: {
    pt: ['confirmou', 'confirmado'],
    en: ['confirmed', 'confirmed'],
    es: ['confirmó', 'confirmada'],
  },
  declined: {
    pt: ['recusou', 'recusado'],
    en: ['declined', 'declined'],
    es: ['rechazó', 'rechazada'],
  },
  cancelledByProfessional: {
    pt: ['cancelou', 'cancelado'],
    en: ['cancelled', 'cancelled'],
    es: ['canceló', 'cancelada'],
  },
  completed: {
    pt: ['concluiu', 'concluído'],
    en: ['completed', 'completed'],
    es: ['completó', 'completada'],
  },
};

// The professional answered the request: tells the client
export const onBookingUpdated = onDocumentUpdated(
  { document: 'bookings/{bookingId}', secrets: [resendKey] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) return;

    // The client cancelled: tells the professional
    if (after.status === 'cancelled') {
      const lang = asLang(
        (await db.doc(`professionals/${after.professionalId}`).get()).data()?.['lang'],
      );
      if (after.professionalUid) {
        await notify(after.professionalUid, `${event.params.bookingId}-cancelled`, [
          { text: after.clientName, bold: true },
          {
            text: L(lang, {
              pt: ' cancelou o agendamento',
              en: ' cancelled the booking',
              es: ' canceló la reserva',
            }),
          },
        ]);
      }
      const professionalEmail = await emailOf(after.professionalUid);
      if (professionalEmail) {
        await sendEmail({
          to: professionalEmail,
          lang,
          subject: L(lang, {
            pt: 'Um agendamento foi cancelado',
            en: 'A booking was cancelled',
            es: 'Una reserva fue cancelada',
          }),
          heading: L(lang, {
            pt: 'Agendamento cancelado',
            en: 'Booking cancelled',
            es: 'Reserva cancelada',
          }),
          paragraphs: [
            L(lang, {
              pt: `${after.clientName} cancelou o agendamento. O horário está livre de novo.`,
              en: `${after.clientName} cancelled the booking. The time is free again.`,
              es: `${after.clientName} canceló la reserva. El horario vuelve a estar libre.`,
            }),
          ],
          details: bookingDetails(after, lang),
          button: {
            label: L(lang, {
              pt: 'Abrir a agenda',
              en: 'Open the schedule',
              es: 'Abrir la agenda',
            }),
            url: link(lang, '/pro'),
          },
        });
      }
      return;
    }

    const answer = ANSWER[after.status];
    if (!answer) return;

    const lang = asLang(after.lang);
    const [verb, title] = answer[lang];
    const professionalName = after.professionalName as string;

    await notify(after.clientUid, `${event.params.bookingId}-${after.status}`, [
      { text: professionalName, bold: true },
      {
        text: L(lang, {
          pt: ` ${verb} o seu agendamento`,
          en: ` ${verb} your booking`,
          es: ` ${verb} tu reserva`,
        }),
      },
    ]);

    const clientEmail = await emailOf(after.clientUid);
    if (clientEmail) {
      await sendEmail({
        to: clientEmail,
        lang,
        subject: L(lang, {
          pt: `${professionalName} ${verb} o seu agendamento`,
          en: `${professionalName} ${verb} your booking`,
          es: `${professionalName} ${verb} tu reserva`,
        }),
        heading: L(lang, {
          pt: `Agendamento ${title}`,
          en: `Booking ${title}`,
          es: `Reserva ${title}`,
        }),
        paragraphs: [
          L(lang, {
            pt: `${professionalName} ${verb} o seu agendamento.`,
            en: `${professionalName} ${verb} your booking.`,
            es: `${professionalName} ${verb} tu reserva.`,
          }),
        ],
        details: bookingDetails(after, lang),
        button: {
          label: L(lang, { pt: 'Ver minha agenda', en: 'See my bookings', es: 'Ver mis reservas' }),
          url: link(lang, '/agenda'),
        },
      });
    }
  },
);

// Welcome e-mails: a client when the e-mail is confirmed, a professional when the sign up starts.
// A client gets it once the e-mail is confirmed: right away for Google accounts (Google already confirmed it), and
// after the code for sign ups with e-mail and password (see verifyEmailCode)
const welcomeClient = async (uid: string, language?: unknown) => {
  const to = await emailOf(uid);
  if (!to) return;
  const user = (await db.doc(`users/${uid}`).get()).data();
  const lang = asLang(language ?? user?.['lang']);
  const name = (user?.['firstName'] as string | undefined) ?? '';
  await sendEmail({
    to,
    lang,
    subject: L(lang, {
      pt: 'Bem-vindo ao Find Your Beauty',
      en: 'Welcome to Find Your Beauty',
      es: 'Te damos la bienvenida a Find Your Beauty',
    }),
    heading: name
      ? L(lang, { pt: `Olá, ${name}!`, en: `Hello, ${name}!`, es: `¡Hola, ${name}!` })
      : L(lang, { pt: 'Bem-vindo!', en: 'Welcome!', es: '¡Bienvenido!' }),
    paragraphs: [
      L(lang, {
        pt: 'Sua conta foi criada. Agora você pode encontrar profissionais de maquiagem e cabelo perto de você e agendar um horário.',
        en: 'Your account was created. Now you can find makeup and hair professionals near you and book a time.',
        es: 'Tu cuenta fue creada. Ahora puedes encontrar profesionales de maquillaje y cabello cerca de ti y reservar un horario.',
      }),
    ],
    button: {
      label: L(lang, {
        pt: 'Encontrar profissionais',
        en: 'Find professionals',
        es: 'Encontrar profesionales',
      }),
      url: link(lang, '/explore'),
    },
  });
};

export const onClientCreated = onDocumentCreated(
  { document: 'users/{uid}', secrets: [resendKey] },
  async (event) => {
    try {
      if (!(await getAuth().getUser(event.params.uid)).emailVerified) return;
    } catch {
      return;
    }
    await welcomeClient(event.params.uid);
  },
);

export const onProfessionalCreated = onDocumentCreated(
  { document: 'professionals/{uid}', secrets: [resendKey] },
  async (event) => {
    const to = await emailOf(event.params.uid);
    if (!to) return;
    const lang = asLang(event.data?.data()?.['lang']);
    await sendEmail({
      to,
      lang,
      subject: L(lang, {
        pt: 'Bem-vindo ao Find Your Beauty',
        en: 'Welcome to Find Your Beauty',
        es: 'Te damos la bienvenida a Find Your Beauty',
      }),
      heading: L(lang, {
        pt: 'Seu cadastro começou',
        en: 'Your registration has started',
        es: 'Tu registro comenzó',
      }),
      paragraphs: [
        L(lang, {
          pt: 'Complete o seu perfil com foto, serviços, horários e onde você atende, e envie o cadastro. Nossa equipe analisa e avisa por e-mail quando ele for aprovado.',
          en: 'Complete your profile with a photo, services, hours and where you work, and send the registration. Our team reviews it and lets you know by email when it is approved.',
          es: 'Completa tu perfil con foto, servicios, horarios y dónde atiendes, y envía el registro. Nuestro equipo lo revisa y te avisa por correo cuando sea aprobado.',
        }),
      ],
      button: {
        label: L(lang, {
          pt: 'Completar o cadastro',
          en: 'Complete the registration',
          es: 'Completar el registro',
        }),
        url: link(lang, '/pro/cadastro'),
      },
    });
  },
);

// An admin approved or denied a professional: tells her
export const onProfessionalReviewed = onDocumentUpdated(
  { document: 'professionals/{uid}', secrets: [resendKey] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const approved = before['approved'] !== true && after['approved'] === true;
    const denied = before['rejected'] !== true && after['rejected'] === true;
    if (!approved && !denied) return;

    const to = await emailOf(event.params.uid);
    if (!to) return;
    const lang = asLang(after['lang']);

    if (approved) {
      await sendEmail({
        to,
        lang,
        subject: L(lang, {
          pt: 'Seu cadastro foi aprovado',
          en: 'Your registration was approved',
          es: 'Tu registro fue aprobado',
        }),
        heading: L(lang, {
          pt: 'Cadastro aprovado',
          en: 'Registration approved',
          es: 'Registro aprobado',
        }),
        paragraphs: [
          L(lang, {
            pt: 'Seu perfil já está público: os clientes encontram você e podem agendar.',
            en: 'Your profile is now public: clients can find you and book.',
            es: 'Tu perfil ya es público: los clientes te encuentran y pueden reservar.',
          }),
        ],
        button: {
          label: L(lang, {
            pt: 'Entrar na área profissional',
            en: 'Sign in to the professional area',
            es: 'Entrar al área profesional',
          }),
          url: link(lang, '/pro/entrar'),
        },
      });
    } else {
      await sendEmail({
        to,
        lang,
        subject: L(lang, {
          pt: 'Seu cadastro precisa de ajustes',
          en: 'Your registration needs changes',
          es: 'Tu registro necesita ajustes',
        }),
        heading: L(lang, {
          pt: 'Cadastro não aprovado',
          en: 'Registration not approved',
          es: 'Registro no aprobado',
        }),
        paragraphs: [
          L(lang, {
            pt: 'Não conseguimos aprovar o seu cadastro desta vez. Entre na área profissional, revise os dados e envie de novo: tudo o que você preencheu continua lá.',
            en: 'We could not approve your registration this time. Sign in to the professional area, review the data and send it again: everything you filled in is still there.',
            es: 'No pudimos aprobar tu registro esta vez. Entra al área profesional, revisa los datos y envíalo de nuevo: todo lo que completaste sigue ahí.',
          }),
        ],
        button: {
          label: L(lang, {
            pt: 'Revisar o cadastro',
            en: 'Review the registration',
            es: 'Revisar el registro',
          }),
          url: link(lang, '/pro/entrar'),
        },
      });
    }
  },
);

// Password reset, sent by Resend instead of by Firebase. It always answers ok, so nobody can find out
// which e-mails have an account.
export const sendPasswordReset = onCall({ secrets: [resendKey] }, async (request) => {
  const lang = asLang(request.data?.lang);
  const email = String(request.data?.email ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpsError(
      'invalid-argument',
      L(lang, {
        pt: 'Digite um e-mail válido.',
        en: 'Enter a valid email.',
        es: 'Escribe un correo electrónico válido.',
      }),
    );
  }

  try {
    const resetLink = await getAuth().generatePasswordResetLink(email);
    const code = new URL(resetLink).searchParams.get('oobCode');
    if (code) {
      await sendEmail({
        to: email,
        lang,
        subject: L(lang, {
          pt: 'Redefinir a sua senha',
          en: 'Reset your password',
          es: 'Restablecer tu contraseña',
        }),
        heading: L(lang, {
          pt: 'Redefinir a senha',
          en: 'Reset the password',
          es: 'Restablecer la contraseña',
        }),
        paragraphs: [
          L(lang, {
            pt: 'Recebemos um pedido para redefinir a senha da sua conta. Se foi você, use o botão abaixo. Se não foi, é só ignorar este e-mail.',
            en: 'We received a request to reset the password of your account. If it was you, use the button below. If it was not, just ignore this email.',
            es: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, usa el botón de abajo. Si no, simplemente ignora este correo.',
          }),
        ],
        button: {
          label: L(lang, {
            pt: 'Escolher uma nova senha',
            en: 'Choose a new password',
            es: 'Elegir una nueva contraseña',
          }),
          url: link(lang, `/redefinir-senha?mode=resetPassword&oobCode=${code}`),
        },
      });
    }
  } catch (error) {
    // No account with this e-mail, or any other failure: nothing is said to the caller
    console.error('Password reset not sent', (error as { code?: string }).code ?? error);
  }
  return { ok: true };
});

// Keeps the average rating and the count shown on cards in sync with the reviews
export const onReviewWritten = onDocumentWritten(
  'professionals/{professionalId}/reviews/{clientUid}',
  async (event) => {
    const ref = db.doc(`professionals/${event.params.professionalId}`);
    const reviews = await ref.collection('reviews').get();
    const total = reviews.docs.reduce((sum, review) => sum + (review.data()['stars'] as number), 0);
    const rating = reviews.size ? Math.round((total / reviews.size) * 10) / 10 : 0;
    await ref.update({ rating, reviewsCount: String(reviews.size) });
  },
);

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

const hashCode = (uid: string, code: string) =>
  createHash('sha256').update(`${uid}:${code}`).digest('hex');
const cleanEmail = (value: unknown, lang: Lang) => {
  const email = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new HttpsError(
      'invalid-argument',
      L(lang, {
        pt: 'Digite um e-mail válido.',
        en: 'Enter a valid email.',
        es: 'Escribe un correo electrónico válido.',
      }),
    );
  }
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
  const lang = asLang(request.data?.lang);
  const email = cleanEmail(request.data?.email, lang);
  const user = await userByEmail(email);
  if (!user || user.emailVerified) return { ok: true };

  const ref = db.doc(`emailCodes/${user.uid}`);
  const saved = (await ref.get()).data();
  if (saved && Date.now() - (saved['sentAt'] as number) < RESEND_SECONDS * 1000) {
    throw new HttpsError(
      'resource-exhausted',
      L(lang, {
        pt: 'Aguarde um instante para pedir outro código.',
        en: 'Wait a moment to ask for another code.',
        es: 'Espera un momento para pedir otro código.',
      }),
    );
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
    lang,
    subject: L(lang, {
      pt: `${code} é o seu código de verificação`,
      en: `${code} is your verification code`,
      es: `${code} es tu código de verificación`,
    }),
    heading: L(lang, {
      pt: 'Confirme o seu e-mail',
      en: 'Confirm your email',
      es: 'Confirma tu correo',
    }),
    paragraphs: [
      L(lang, {
        pt: `Digite este código no app para confirmar o seu e-mail. Ele vale por ${CODE_MINUTES} minutos.`,
        en: `Enter this code in the app to confirm your email. It is valid for ${CODE_MINUTES} minutes.`,
        es: `Escribe este código en la app para confirmar tu correo. Vale por ${CODE_MINUTES} minutos.`,
      }),
    ],
    details: [
      {
        label: L(lang, { pt: 'Seu código', en: 'Your code', es: 'Tu código' }),
        value: code.split('').join(' '),
      },
    ],
  });
  return { ok: true };
});

// Checks the code and marks the e-mail as verified
export const verifyEmailCode = onCall({ secrets: [resendKey] }, async (request) => {
  const lang = asLang(request.data?.lang);
  const email = cleanEmail(request.data?.email, lang);
  const code = String(request.data?.code ?? '').trim();
  if (!/^\d{4}$/.test(code)) {
    throw new HttpsError(
      'invalid-argument',
      L(lang, {
        pt: 'Digite os 4 números do código.',
        en: 'Enter the 4 digits of the code.',
        es: 'Escribe los 4 números del código.',
      }),
    );
  }

  const user = await userByEmail(email);
  if (!user) {
    throw new HttpsError(
      'failed-precondition',
      L(lang, {
        pt: 'Código inválido ou expirado.',
        en: 'Invalid or expired code.',
        es: 'Código inválido o vencido.',
      }),
    );
  }
  if (user.emailVerified) return { ok: true };

  const ref = db.doc(`emailCodes/${user.uid}`);
  const saved = (await ref.get()).data();
  if (
    !saved ||
    Date.now() > (saved['expiresAt'] as number) ||
    (saved['attempts'] as number) >= MAX_ATTEMPTS
  ) {
    throw new HttpsError(
      'failed-precondition',
      L(lang, {
        pt: 'Código expirado. Peça um novo código.',
        en: 'Expired code. Ask for a new code.',
        es: 'Código vencido. Pide un nuevo código.',
      }),
    );
  }
  if (saved['hash'] !== hashCode(user.uid, code)) {
    await ref.update({ attempts: FieldValue.increment(1) });
    throw new HttpsError(
      'invalid-argument',
      L(lang, { pt: 'Código incorreto.', en: 'Wrong code.', es: 'Código incorrecto.' }),
    );
  }

  await getAuth().updateUser(user.uid, { emailVerified: true });
  await ref.delete();
  // The welcome e-mail goes out now that the address is confirmed
  await welcomeClient(user.uid, request.data?.lang);
  return { ok: true };
});
