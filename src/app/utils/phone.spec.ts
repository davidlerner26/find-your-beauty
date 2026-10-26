import { formatPhone, nationalDigits } from './phone';

describe('nationalDigits', () => {
  it('drops the country code that autofill and paste bring', () => {
    expect(nationalDigits('+55 21 99747-2878')).toBe('21997472878');
    expect(nationalDigits('5521997472878')).toBe('21997472878');
  });

  it('keeps a number that only looks like it starts with 55', () => {
    // DDD 55 (Rio Grande do Sul) with 11 digits is a real number
    expect(nationalDigits('55 99747-2878')).toBe('55997472878');
  });

  it('keeps at most 11 digits', () => {
    expect(nationalDigits('219974728789999')).toBe('21997472878');
  });
});

describe('formatPhone', () => {
  it('masks mobile numbers while typing', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone('2')).toBe('(2');
    expect(formatPhone('21')).toBe('(21');
    expect(formatPhone('219')).toBe('(21) 9');
    expect(formatPhone('21997472878')).toBe('(21) 99747-2878');
  });

  it('shows the landline format until the 11th digit, then regroups as mobile', () => {
    expect(formatPhone('2199747')).toBe('(21) 9974-7');
    expect(formatPhone('2199747287')).toBe('(21) 9974-7287');
    expect(formatPhone('21997472878')).toBe('(21) 99747-2878');
  });

  it('masks landlines with 8 digits', () => {
    expect(formatPhone('2139742878')).toBe('(21) 3974-2878');
  });

  it('formats a pasted number with country code', () => {
    expect(formatPhone('+55 (21) 99747-2878')).toBe('(21) 99747-2878');
  });
});
