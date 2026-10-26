import { INTL_LOCALE } from './locale';
type Point = { lat: number; lng: number };

// Distance in km between two coordinates (haversine)
export const distanceKm = (a: Point, b: Point) => {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

export const formatDistance = (km: number) =>
  km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toLocaleString(INTL_LOCALE, { maximumFractionDigits: 1 })} km`;
