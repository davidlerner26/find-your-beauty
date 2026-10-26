import { distanceKm, formatDistance } from './geo';

describe('distanceKm', () => {
  it('is 0 for the same point and symmetric', () => {
    const a = { lat: -22.9068, lng: -43.1729 };
    const b = { lat: -23.5505, lng: -46.6333 };
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });

  it('matches a known distance (Rio to São Paulo is about 360 km)', () => {
    const km = distanceKm({ lat: -22.9068, lng: -43.1729 }, { lat: -23.5505, lng: -46.6333 });
    expect(km).toBeGreaterThan(350);
    expect(km).toBeLessThan(370);
  });
});

describe('formatDistance', () => {
  it('uses meters under 1 km and km above (Portuguese build)', () => {
    expect(formatDistance(0.45)).toBe('450 m');
    expect(formatDistance(1.26)).toBe('1,3 km');
    expect(formatDistance(12)).toBe('12 km');
  });
});
