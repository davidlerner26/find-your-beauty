import { RJ_NEIGHBORHOODS } from '../../models/neighborhoods';
import {
  DEFAULT_AVAILABILITY,
  hasLocation,
  isPro,
  locationLabel,
  Professional,
} from '../../models/professional';
import { catalogLabel } from '../../utils/catalog.pipe';
import { distanceKm, formatDistance } from '../../utils/geo';
import { lowestPrice } from '../../utils/pricing';
import { isWorkingDay } from '../../utils/slots';

export type SortKey = 'price-asc' | 'rating' | 'distance' | 'price-desc';

export type Filters = {
  date: Date | null;
  tags: string[];
  minRating: number;
  maxKm: number;
  sort: SortKey | null;
  // A neighborhood of the city of Rio de Janeiro
  neighborhood: string | null;
  // Only who goes to the client / who has a studio (both on: who does both)
  home: boolean;
  studio: boolean;
};

export type Point = { lat: number; lng: number };

export const MAX_KM = 50;

export const noFilters = (): Filters => ({
  date: null,
  tags: [],
  minRating: 0,
  maxKm: MAX_KM,
  sort: null,
  neighborhood: null,
  home: false,
  studio: false,
});

// Compares text ignoring case and accents
export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Is the address in this neighborhood of Rio? The addresses come from Google: "Rua X, 12 - Leblon, Rio de Janeiro - RJ"
export const inNeighborhood = (address: string, neighborhood: string) => {
  const text = normalize(address);
  // "Freguesia (Jacarepaguá)": the name that is written in the address is the one before the parentheses
  const name = normalize(neighborhood.split(' (')[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.includes('rio de janeiro') && new RegExp(`(^|[\\s,-])${name}\\s*,`).test(text);
};

// Does the text (already normalized) appear in the name, address, tags or services of the professional?
export const matchesText = (professional: Professional, term: string) => {
  const haystack = [
    professional.name,
    professional.address,
    ...professional.tags,
    ...professional.services.flatMap((service) => [service.name, catalogLabel(service.name)]),
  ]
    .map(normalize)
    .join(' ');
  return haystack.includes(term);
};

// The neighborhoods (by the name written in the address) where at least one of the addresses is
export const neighborhoodsWith = (addresses: string[]) => {
  // "Freguesia (Jacarepaguá)" and "Freguesia (Ilha do Governador)" are searched as "Freguesia"
  const names = RJ_NEIGHBORHOODS.map((name) => name.split(' (')[0]);
  return [...new Set(names)].filter((name) =>
    addresses.some((address) => inNeighborhood(address, name)),
  );
};

export const countFilters = ({
  date,
  tags,
  minRating,
  maxKm,
  sort,
  neighborhood,
  home,
  studio,
}: Filters) =>
  (neighborhood ? 1 : 0) +
  (home ? 1 : 0) +
  (studio ? 1 : 0) +
  (date ? 1 : 0) +
  (tags.length ? 1 : 0) +
  (minRating ? 1 : 0) +
  (maxKm < MAX_KM ? 1 : 0) +
  (sort ? 1 : 0);

// What a card of the list shows (the same for the results and for the suggestions)
export const toCard = (professional: Professional, user: Point | null) => {
  const located = user && hasLocation(professional);
  const km = located ? distanceKm(user, professional.position) : null;
  return {
    ...professional,
    cardImage: professional.image,
    cardPosition: professional.imagePosition,
    // The photos of the work (the profile photo when there is no gallery), like the cards of the home
    photos: professional.gallery.length ? professional.gallery : [professional.image],
    address: locationLabel(professional),
    distance: km === null ? null : formatDistance(km),
    km,
    // An active Pro subscription (the badge and the priority; the badge shows only where the subscription exists)
    pro: isPro(professional),
    // The cheapest service: "a partir de"
    minPrice: professional.services.length
      ? Math.min(...professional.services.map(lowestPrice))
      : null,
  };
};

export type Card = ReturnType<typeof toCard>;

// A professional without a chosen mode has a studio, like everywhere else (see hasLocation)
export const goesToClient = (p: Pick<Professional, 'serviceMode'>) =>
  p.serviceMode === 'home' || p.serviceMode === 'both';
export const hasStudio = (p: Pick<Professional, 'serviceMode'>) => p.serviceMode !== 'home';

// The professionals that pass the text and the filters, as cards, in the chosen order
export const search = (
  professionals: Professional[],
  term: string,
  filters: Filters,
  user: Point | null,
  // Where the Pro subscription exists, a professional with it comes first when no order was chosen
  proFirst = false,
): Card[] => {
  const text = normalize(term.trim());
  const { date, tags, minRating, maxKm, sort, neighborhood, home, studio } = filters;

  const found = professionals
    .filter((professional) => {
      if (text && !matchesText(professional, text)) return false;
      if (neighborhood && !inNeighborhood(professional.address, neighborhood)) return false;
      if (home && !goesToClient(professional)) return false;
      if (studio && !hasStudio(professional)) return false;
      if (tags.length && !professional.tags.some((tag) => tags.includes(tag))) return false;
      if (professional.rating < minRating) return false;
      if (date && !isWorkingDay(date, professional.availability ?? DEFAULT_AVAILABILITY))
        return false;
      if (
        user &&
        maxKm < MAX_KM &&
        (!hasLocation(professional) || distanceKm(user, professional.position) > maxKm)
      )
        return false;
      return true;
    })
    .map((professional) => toCard(professional, user));

  // No chosen order keeps the order of the catalog (Pro first, where the subscription exists: the sort is stable).
  // Without a price or a distance, a professional goes last.
  if (!sort) return proFirst ? found.sort((a, b) => Number(b.pro) - Number(a.pro)) : found;
  const last = (value: number | null, fallback: number) => value ?? fallback;
  return found.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return last(a.minPrice, Infinity) - last(b.minPrice, Infinity) || 0;
      case 'price-desc':
        return last(b.minPrice, -Infinity) - last(a.minPrice, -Infinity) || 0;
      case 'rating':
        return b.rating - a.rating;
      case 'distance':
        return last(a.km, Infinity) - last(b.km, Infinity) || 0;
    }
  });
};

// What is shown before searching: the best rated
export const suggestions = (professionals: Professional[], user: Point | null, count = 5) =>
  [...professionals]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
    .map((professional) => toCard(professional, user));
