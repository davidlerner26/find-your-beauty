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
