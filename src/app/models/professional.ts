import { localizeAddress } from '../utils/address';
// professionals/{professionalId}/reviews/{clientUid}: one review per client
export type Review = {
  id: string;
  author: string;
  stars: number;
  text: string;
  createdAt: Date | null;
};

export type ServiceCategory = 'Maquiagem' | 'Cabelo';

// Services a professional can pick, by category
export const SERVICE_NAMES: Record<ServiceCategory, string[]> = {
  Maquiagem: [
    'Maquiagem social',
    'Maquiagem para festa',
    'Maquiagem de noiva',
    'Maquiagem para madrinhas',
    'Maquiagem para formatura',
    'Maquiagem artística',
    'Maquiagem para fotos e ensaios',
    'Automaquiagem (aula)',
    'Design de sobrancelhas',
    'Aplicação de cílios',
  ],
  Cabelo: [
    'Corte feminino',
    'Corte masculino',
    'Escova',
    'Penteado para festa',
    'Penteado de noiva',
    'Coloração',
    'Mechas e luzes',
    'Hidratação',
    'Cauterização',
    'Progressiva',
    'Cronograma capilar',
  ],
};

// A different price for a service on some days of the week, in a time range ("HH:mm", the end is not included)
export type PriceRule = { days: number[]; start: string; end: string; price: number };

// An icon (Material Symbols) for each service name, shown on the home
export const SERVICE_ICONS: Record<string, string> = {
  'Maquiagem social': 'face_retouching_natural',
  'Maquiagem para festa': 'celebration',
  'Maquiagem de noiva': 'diamond',
  'Maquiagem para madrinhas': 'local_florist',
  'Maquiagem para formatura': 'school',
  'Maquiagem artística': 'palette',
  'Maquiagem para fotos e ensaios': 'photo_camera',
  'Automaquiagem (aula)': 'menu_book',
  'Design de sobrancelhas': 'visibility',
  'Aplicação de cílios': 'auto_awesome',
  'Corte feminino': 'content_cut',
  'Corte masculino': 'man',
  'Escova': 'air',
  'Penteado para festa': 'nightlife',
  'Penteado de noiva': 'favorite',
  'Coloração': 'colorize',
  'Mechas e luzes': 'light_mode',
  'Hidratação': 'water_drop',
  'Cauterização': 'local_fire_department',
  'Progressiva': 'straighten',
  'Cronograma capilar': 'calendar_month',
};

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  // Replaces the price when the appointment starts on one of these days and times (the first match wins)
  priceRules?: PriceRule[];
  durationMinutes: number;
  description: string;
  // Photos of the service, shown in its card. There is no default photo: without them the card has no picture.
  photos?: string[];
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

// A photo copied from the professional's connected Instagram
export type InstagramPhoto = { id: string; url: string; permalink: string; caption: string; video: boolean };

// Where the professional works: at an address, at the client's home, or both
export type ServiceMode = 'studio' | 'home' | 'both';

// The two places a professional can pick (both together are saved as 'both')
export const SERVICE_PLACES: { key: 'studio' | 'home'; label: string }[] = [
  { key: 'studio', label: $localize`No meu endereço` },
  { key: 'home', label: $localize`A domicílio` },
];

export type Professional = {
  id: string;
  name: string;
  // The one photo of the professional: cards, top of the page and round avatars in messages
  image: string;
  imagePosition?: ImagePosition;
  address: string;
  // Profiles from before this existed work at their address
  serviceMode?: ServiceMode;
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
  instagramConnected?: boolean;
  instagramPhotos?: InstagramPhoto[];
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

// Home-only professionals have no address on the map
export const hasLocation = (professional: Pick<Professional, 'serviceMode' | 'position'>) =>
  professional.serviceMode !== 'home' && (professional.position.lat !== 0 || professional.position.lng !== 0);

// "Av. Afrânio de Melo Franco, 141 - Leblon, Rio de Janeiro - RJ, 22430-060" -> "Av. Afrânio de Melo Franco, 141 - Leblon, RJ":
// street and number (when there is one), neighborhood and state, without the city and the postal code
export const shortAddress = (address: string) => {
  const text = address
    .replace(/,?\s*Brasil$/i, '')
    .replace(/,?\s*\d{5}-?\d{3}$/, '')
    .trim();
  // The end is "City - UF"
  const match = text.match(/^(.*?),\s*[^,]+\s-\s([A-Z]{2})$/);
  return match ? `${match[1]}, ${match[2]}` : text;
};

// What the cards of the map and of the home show where the address goes: the short address
export const shortLocationLabel = (professional: Pick<Professional, 'serviceMode' | 'address'>) =>
  professional.serviceMode === 'home' ? $localize`Atendimento a domicílio` : localizeAddress(shortAddress(professional.address));

// What cards show where the address goes
export const locationLabel = (professional: Pick<Professional, 'serviceMode' | 'address'>) =>
  professional.serviceMode === 'home' ? $localize`Atendimento a domicílio` : localizeAddress(professional.address);

// 30 -> "30 minutos", 60 -> "1 hora", 90 -> "1 hora e 30 minutos", 120 -> "2 horas"
export const formatDuration = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes || !hours) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  return parts.join(' e ');
};
