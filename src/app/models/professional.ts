export type Review = {
  author: string;
  daysAgo: number;
  stars: number;
  text: string;
};

export type ServiceCategory = 'Maquiagem' | 'Cabelo' | 'Facial';

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  description: string;
  image: string;
};

// When a professional works. `weekly` is keyed by Date#getDay (0 = Sunday).
export type Availability = {
  slotMinutes: number;
  weekly: Record<string, { enabled: boolean; start: string; end: string }>;
  blockedDates: string[];
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
  blockedDates: [],
};

export type Professional = {
  id: string;
  name: string;
  image: string;
  address: string;
  tags: string[];
  rating: number;
  reviewsCount: string;
  views: string;
  about: string[];
  services: Service[];
  gallery: string[];
  position: { lat: number; lng: number };
  reviews: Review[];
  // Set for professionals that signed up in the app (the document id is the account uid)
  ownerUid?: string;
  email?: string;
  phone?: string;
  // Hidden from home and explore while false. Demo professionals have no flag (visible).
  published?: boolean;
  availability?: Availability;
};

export const formatDuration = (minutes: number) =>
  `${(minutes / 60).toLocaleString('pt-BR')} h`;
