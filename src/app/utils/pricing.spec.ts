import { Service } from '../models/professional';
import { lowestPrice, priceAt, ruleLabel } from './pricing';

const service = (priceRules: Service['priceRules'] = []) =>
  ({ id: 's1', name: 'Corte', price: 100, durationMinutes: 60, priceRules }) as Service;

// 2099-05-08 is a Friday (day 5), 2099-05-04 a Monday (day 1)
const FRIDAY = new Date(2099, 4, 8);
const MONDAY = new Date(2099, 4, 4);

describe('priceAt', () => {
  const weekend = service([{ days: [5, 6], start: '18:00', end: '22:00', price: 150 }]);

  it('uses the base price when no rule matches', () => {
    expect(priceAt(weekend, MONDAY, '19:00')).toBe(100);
    expect(priceAt(weekend, FRIDAY, '10:00')).toBe(100);
    expect(priceAt(service(), FRIDAY, '19:00')).toBe(100);
  });

  it('uses the rule on its days and hours, start included and end excluded', () => {
    expect(priceAt(weekend, FRIDAY, '18:00')).toBe(150);
    expect(priceAt(weekend, FRIDAY, '21:59')).toBe(150);
    expect(priceAt(weekend, FRIDAY, '22:00')).toBe(100);
  });

  it('the first matching rule wins', () => {
    const two = service([
      { days: [5], start: '00:00', end: '24:00', price: 120 },
      { days: [5], start: '18:00', end: '22:00', price: 150 },
    ]);
    expect(priceAt(two, FRIDAY, '19:00')).toBe(120);
  });
});

describe('lowestPrice', () => {
  it('is the cheapest between the base and the rules', () => {
    expect(lowestPrice(service())).toBe(100);
    expect(lowestPrice(service([{ days: [1], start: '00:00', end: '24:00', price: 80 }]))).toBe(80);
    expect(lowestPrice(service([{ days: [1], start: '00:00', end: '24:00', price: 130 }]))).toBe(
      100,
    );
  });
});

describe('ruleLabel', () => {
  it('describes the days and the hours (Portuguese build)', () => {
    expect(ruleLabel({ days: [6, 5], start: '18:00', end: '22:00', price: 1 })).toBe(
      'Sex e Sáb, 18:00 às 22:00',
    );
    expect(ruleLabel({ days: [1], start: '00:00', end: '24:00', price: 1 })).toBe(
      'Seg, o dia todo',
    );
    expect(ruleLabel({ days: [1], start: '00:00', end: '12:00', price: 1 })).toBe('Seg, até 12:00');
    expect(ruleLabel({ days: [1], start: '12:00', end: '24:00', price: 1 })).toBe(
      'Seg, a partir das 12:00',
    );
  });

  it('puts Monday first and Sunday last', () => {
    expect(ruleLabel({ days: [0, 1], start: '00:00', end: '24:00', price: 1 })).toBe(
      'Seg e Dom, o dia todo',
    );
  });
});
