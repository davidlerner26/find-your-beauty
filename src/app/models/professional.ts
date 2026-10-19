// professionals/{professionalId}/reviews/{clientUid}: one review per client
export type Review = {
  id: string;
  author: string;
  stars: number;
  text: string;
  createdAt: Date | null;
};

export type ServiceCategory = 'Maquiagem' | 'Cabelo';

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  description: string;
  image: string;
};

// Focal point of the profile photo, in percent: where the photo is anchored when it gets cropped
export type ImagePosition = { x: number; y: number };

// A period of days ("yyyy-mm-dd"), both ends included
export type DateRange = { start: string; end: string };

// When a professional works. `weekly` is keyed by Date#getDay (0 = Sunday).
export type Availability = {
  slotMinutes: number;
  weekly: Record<string, { enabled: boolean; start: string; end: string }>;
  blockedRanges: DateRange[];
  // Single days saved before periods existed. Read as one-day periods and dropped on the next save.
  blockedDates?: string[];
};

// Used by demo professionals and new accounts: Monday to Saturday, 08:00 - 18:00
export const DEFAULT_AVAILABILITY: Availability = {
  slotMinutes: 60,
  weekly: {
    '0': { enabled: false, start: '09:00', end: '14:00' },
    '1': { enabled: true, start: '08:00', end: '18:00' },
    '2': { enabled: true, start: '08:00', end: '18:00' },
    '3': { enabled: true, start: '08:00', end: '18:00' },
    '4': { enabled: true, start: '08:00', end: '18:00' },
    '5': { enabled: true, start: '08:00', end: '18:00' },
    '6': { enabled: true, start: '09:00', end: '14:00' },
  },
  blockedRanges: [],
};

export type Professional = {
  id: string;
  name: string;
  // The one photo of the professional: cards, top of the page and round avatars in messages
  image: string;
  imagePosition?: ImagePosition;
  address: string;
  tags: string[];
  rating: number;
  reviewsCount: string;
  views: string;
  about: string[];
  services: Service[];
  gallery: string[];
  position: { lat: number; lng: number };
  // Set for professionals that signed up in the app (the document id is the account uid)
  ownerUid?: string;
  email?: string;
  phone?: string;
  // Instagram username, without the @
  instagram?: string;
  // New accounts start with false and can only sign in after an admin approves them.
  // Accounts created before this existed have no value and count as approved.
  approved?: boolean;
  // An admin denied the account (approved stays false)
  rejected?: boolean;
  admin?: boolean;
  // The professional's choice to show the profile (default: yes)
  visible?: boolean;
  // What clients see: visible and complete. Computed when the profile is saved.
  published?: boolean;
  availability?: Availability;
};

export const formatDuration = (minutes: number) => `${(minutes / 60).toLocaleString('pt-BR')} h`;
