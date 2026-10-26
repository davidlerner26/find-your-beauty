import { maskMoney, moneyToText, parseMoney, roundMoney } from './money';

// The test build is in Portuguese: "1.234,50"
describe('maskMoney', () => {
  it('fills digits from the right, starting at 0,00', () => {
    expect(maskMoney('')).toBe('0,00');
    expect(maskMoney('1')).toBe('0,01');
    expect(maskMoney('10')).toBe('0,10');
    expect(maskMoney('100')).toBe('1,00');
    expect(maskMoney('123450')).toBe('1.234,50');
  });

  it('keeps at most 8 digits', () => {
    expect(maskMoney('1234567890')).toBe('123.456,78');
  });
});

describe('parseMoney / moneyToText', () => {
  it('parses what the mask shows', () => {
    expect(parseMoney('1.234,50')).toBe(1234.5);
    expect(parseMoney('0,05')).toBe(0.05);
    expect(parseMoney('')).toBe(0);
  });

  it('formats a number as the field text', () => {
    expect(moneyToText(15.5)).toBe('15,50');
    expect(moneyToText(1234.5)).toBe('1.234,50');
  });

  it('round trips', () => {
    expect(parseMoney(moneyToText(89.9))).toBe(89.9);
  });
});

describe('roundMoney', () => {
  it('removes float noise', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
