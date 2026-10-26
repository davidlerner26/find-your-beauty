// COPY of shared/domain.ts: do not edit here. Run `npm run sync:shared` after changing the original.
// What the app (src/) and the Cloud Functions (functions/) both have to agree on. This is the one copy that is
// edited: `npm run sync:shared` copies it to functions/src/shared/domain.ts, and a test fails when the copy is old.

export type Lang = 'pt' | 'en' | 'es';

export const LANGUAGES: readonly Lang[] = ['pt', 'en', 'es'];

export const asLang = (value: unknown): Lang => (value === 'en' || value === 'es' ? value : 'pt');

// The life of a booking:
//   pending -> confirmed -> completed (by itself, when its time is over)
//   pending -> declined (by the professional)
//   pending or confirmed -> cancelled (by the client) or cancelledByProfessional
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'declined',
  'completed',
  'cancelled',
  'cancelledByProfessional',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Still going to happen: waiting for an answer or confirmed. These keep their time slots.
export const OPEN_BOOKING_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed'];

// Over: nothing else happens to the booking
export const CLOSED_BOOKING_STATUSES: readonly BookingStatus[] = [
  'completed',
  'declined',
  'cancelled',
  'cancelledByProfessional',
];

// What the professional can set a booking to
export type ProfessionalAnswer = Extract<
  BookingStatus,
  'confirmed' | 'declined' | 'completed' | 'cancelledByProfessional'
>;

// A booking in one of these frees its time slots
export const FREES_SLOTS: readonly BookingStatus[] = [
  'declined',
  'cancelled',
  'cancelledByProfessional',
];

export const isOpen = (status: BookingStatus) => OPEN_BOOKING_STATUSES.includes(status);
export const isClosed = (status: BookingStatus) => CLOSED_BOOKING_STATUSES.includes(status);
export const freesSlots = (status: BookingStatus) => FREES_SLOTS.includes(status);

// The payment of a booking (the money is held on the client's card when the booking is made, and taken when the
// professional accepts it):
//   pending -> authorized (held) -> paid (taken) -> refunded (the booking was cancelled after that)
//   authorized -> released (declined or cancelled before the professional accepted: nothing was taken)
//   failed: the card refused when the professional accepted
// Bookings of the production environment, where there is no payment yet, stay `pending`.
export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'paid',
  'released',
  'refunded',
  'failed',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// The currency of every payment, and its smallest unit: 100 centavos in a real
export const CURRENCY = 'brl';

// The amount of a booking in centavos, the way Stripe counts it
export const toCents = (reais: number) => Math.round(reais * 100);

// The names of the Firestore collections (and the subcollections), as the rules know them
export const COLLECTIONS = {
  professionals: 'professionals',
  users: 'users',
  bookings: 'bookings',
  conversations: 'conversations',
  messages: 'messages',
  notifications: 'notifications',
  favorites: 'favorites',
  reviews: 'reviews',
  busy: 'busy',
  private: 'private',
} as const;
