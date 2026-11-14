import { isPro } from './professional';

describe('isPro', () => {
  it('is only for an active subscription', () => {
    expect(isPro({ pro: true })).toBe(true);
    expect(isPro({ pro: false })).toBe(false);
  });

  it('is not for a profile that has no value: they came before the Pro subscription', () => {
    expect(isPro({})).toBe(false);
  });
});
