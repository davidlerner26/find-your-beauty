"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBookingUpdated = exports.onBookingCreated = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const firestore_2 = require("firebase-functions/v2/firestore");
// Same region as the Firestore database
(0, v2_1.setGlobalOptions)({ region: 'southamerica-east1', maxInstances: 5 });
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Notifications are written here (never by clients). The id is fixed so a retry can't duplicate it.
const notify = (uid, id, text) => db.doc(`users/${uid}/notifications/${id}`).set({
    icon: 'calendar',
    text,
    unread: true,
    createdAt: firestore_1.FieldValue.serverTimestamp(),
});
// A new booking: the server is the source of truth for prices, then both sides are notified
exports.onBookingCreated = (0, firestore_2.onDocumentCreated)('bookings/{bookingId}', async (event) => {
    const booking = event.data?.data();
    if (!booking)
        return;
    const { bookingId } = event.params;
    const professional = await db.doc(`professionals/${booking.professionalId}`).get();
    // Recomputes the total and duration from the professional's real services
    const catalog = professional.data()?.['services'] ?? [];
    const chosen = booking.services.map((s) => catalog.find((c) => c.id === s.id));
    if (professional.exists && chosen.every(Boolean)) {
        const services = chosen;
        const total = services.reduce((sum, s) => sum + s.price, 0);
        const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
        if (total !== booking.total || durationMinutes !== booking.durationMinutes) {
            await event.data.ref.update({ total, durationMinutes, correctedByServer: true });
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
const VERB = {
    confirmed: 'confirmou',
    declined: 'recusou',
    completed: 'concluiu',
};
// The professional answered the request: tells the client
exports.onBookingUpdated = (0, firestore_2.onDocumentUpdated)('bookings/{bookingId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status)
        return;
    const verb = VERB[after.status];
    if (!verb)
        return;
    await notify(after.clientUid, `${event.params.bookingId}-${after.status}`, [
        { text: after.professionalName, bold: true },
        { text: ` ${verb} o seu agendamento` },
    ]);
});
