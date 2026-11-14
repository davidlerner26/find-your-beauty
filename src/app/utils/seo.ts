import { Professional } from '../models/professional';
import { instagramUrl } from './instagram';

export const SITE_NAME = 'Find Your Beauty';

// What a page tells a search engine and the apps that show a preview of a link
export type SeoPage = {
  title: string;
  description?: string;
  // An address, or a path of the site; data URLs are ignored
  image?: string;
  // The path of the canonical address, without the query ("/explorar/abc"). Default: the current path.
  path?: string;
  noindex?: boolean;
  jsonLd?: object;
};

// Cuts at a word, with an ellipsis, so a description fits in what the search results show
export const truncate = (text: string, max = 155) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
};

export type ParsedAddress = {
  street: string;
  neighborhood?: string;
  city?: string;
  region?: string;
  postalCode?: string;
};

// "Rua das Flores, 100 - Botafogo, Rio de Janeiro - RJ, 22250-040" is how Google writes the addresses
export const parseAddress = (address: string): ParsedAddress => {
  const text = address.replace(/,?\s*Brasil$/i, '').trim();
  const match = text.match(/^(.*?)\s-\s([^,]+),\s*([^,]+?)\s-\s([A-Z]{2})(?:,\s*(\d{5}-?\d{3}))?$/);
  if (!match) return { street: text };
  return {
    street: match[1],
    neighborhood: match[2],
    city: match[3],
    region: match[4],
    postalCode: match[5],
  };
};

const sameAs = (professional: Professional) =>
  professional.instagram ? [instagramUrl(professional.instagram)] : undefined;

// The range of the prices of the services: "R$ 100 - R$ 250"
const priceRange = (professional: Professional) => {
  const prices = professional.services.map((service) => service.price).filter((price) => price > 0);
  if (!prices.length) return undefined;
  const format = (value: number) => `R$ ${value}`;
  const [min, max] = [Math.min(...prices), Math.max(...prices)];
  return min === max ? format(min) : `${format(min)} - ${format(max)}`;
};

// schema.org: what a search engine shows as a business (rating, address, prices). Without phone or CPF.
export const professionalJsonLd = (professional: Professional, url: string) => {
  const address =
    professional.serviceMode !== 'home' && professional.address
      ? parseAddress(professional.address)
      : null;
  const reviews = Number.parseInt(professional.reviewsCount, 10) || 0;
  const hasPosition = professional.position.lat !== 0 || professional.position.lng !== 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: professional.name,
    url,
    ...(professional.image && !professional.image.startsWith('data:')
      ? { image: professional.image }
      : {}),
    ...(professional.about?.[0] ? { description: truncate(professional.about[0], 300) } : {}),
    ...(address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: address.street,
            ...(address.city ? { addressLocality: address.city } : {}),
            ...(address.region ? { addressRegion: address.region } : {}),
            ...(address.postalCode ? { postalCode: address.postalCode } : {}),
            addressCountry: 'BR',
          },
        }
      : {}),
    ...(address && hasPosition
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: professional.position.lat,
            longitude: professional.position.lng,
          },
        }
      : {}),
    ...(reviews > 0 && professional.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: professional.rating,
            reviewCount: reviews,
            bestRating: 5,
          },
        }
      : {}),
    ...(priceRange(professional) ? { priceRange: priceRange(professional) } : {}),
    ...(sameAs(professional) ? { sameAs: sameAs(professional) } : {}),
  };
};

// The site itself: shown next to the name in the results
export const organizationJsonLd = (siteUrl: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: siteUrl,
  logo: `${siteUrl}/icons/icon-512.png`,
});

export const websiteJsonLd = (siteUrl: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: siteUrl,
});

// "Ana Teste · Maquiagem em Botafogo": the name, the first category and the neighborhood (or the city)
export const professionalTitle = (
  professional: Professional,
  inPlace: (place: string) => string,
) => {
  const address =
    professional.serviceMode !== 'home' && professional.address
      ? parseAddress(professional.address)
      : null;
  const place = address?.neighborhood ?? address?.city;
  return (
    [professional.name, professional.tags?.[0]].filter(Boolean).join(' · ') +
    (place ? inPlace(place) : '')
  );
};
