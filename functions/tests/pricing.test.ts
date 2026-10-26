import { describe, expect, it } from 'vitest';
import { priceAt, Service, totalFor } from '../src/pricing';

const service = (overrides: Partial<Service> = {}): Service => ({
  id: 's1',
  price: 100,
  durationMinutes: 60,
  ...overrides,
});

// Brazil is UTC-3: 13:00Z is 10:00 there. 2099-05-08 is a Friday.
const FRIDAY_10_AT_BRAZIL = new Date('2099-05-08T13:00:00Z');
const FRIDAY_19_AT_BRAZIL = new Date('2099-05-08T22:00:00Z');

describe('priceAt', () => {
  const weekend = service({
    priceRules: [{ days: [5, 6], start: '18:00', end: '22:00', price: 150 }],
  });

  it('counts the hours in Brazil, not in UTC', () => {
    expect(priceAt(weekend, FRIDAY_10_AT_BRAZIL)).toBe(100);
    expect(priceAt(weekend, FRIDAY_19_AT_BRAZIL)).toBe(150);
  });

  it('a rule has its start included and its end excluded', () => {
    expect(priceAt(weekend, new Date('2099-05-08T21:00:00Z'))).toBe(150); // 18:00
    expect(priceAt(weekend, new Date('2099-05-09T01:00:00Z'))).toBe(100); // 22:00
  });
});

describe('totalFor', () => {
  const catalog = [service(), service({ id: 's2', price: 0.1 }), service({ id: 's3', price: 0.2 })];

  it('adds the prices of the chosen services, without float noise', () => {
    expect(totalFor(catalog, ['s1'], FRIDAY_10_AT_BRAZIL)).toBe(100);
    expect(totalFor(catalog, ['s2', 's3'], FRIDAY_10_AT_BRAZIL)).toBe(0.3);
  });

  it('refuses a service that the professional does not have, and an empty list', () => {
    expect(totalFor(catalog, ['s1', 'nope'], FRIDAY_10_AT_BRAZIL)).toBeNull();
    expect(totalFor(catalog, [], FRIDAY_10_AT_BRAZIL)).toBeNull();
  });
});
