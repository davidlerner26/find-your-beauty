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

type Service = { id: string; price: number; durationMinutes: number };

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
    const total = Math.round(services.reduce((sum, s) => sum + s.price, 0) * 100) / 100;
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
