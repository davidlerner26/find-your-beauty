import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
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
export const onBookingCreated = onDocumentCreated('bookings/{bookingId}', async (event) => {
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
});

const VERB: Record<string, string> = {
  confirmed: 'confirmou',
  declined: 'recusou',
  cancelledByProfessional: 'cancelou',
  completed: 'concluiu',
};

// The professional answered the request: tells the client
export const onBookingUpdated = onDocumentUpdated('bookings/{bookingId}', async (event) => {
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
    return;
  }

  const verb = VERB[after.status];
  if (!verb) return;

  await notify(after.clientUid, `${event.params.bookingId}-${after.status}`, [
    { text: after.professionalName, bold: true },
    { text: ` ${verb} o seu agendamento` },
  ]);
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
export { connectInstagram, disconnectInstagram, refreshInstagram, syncInstagramDaily } from './instagram';
