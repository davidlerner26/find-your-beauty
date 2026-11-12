import { describe, expect, it } from 'vitest';
import { confirmationMatches, hasOpenPayment, matchesQuery } from '../src/accounts';

describe('matchesQuery', () => {
  const account = { uid: 'abc123', email: 'Ana@Example.com', displayName: 'Ana Souza' };

  it('finds an account by e-mail, name or id, without caring about the case', () => {
    expect(matchesQuery(account, 'ana@exam')).toBe(true);
    expect(matchesQuery(account, 'SOUZA')).toBe(true);
    expect(matchesQuery(account, 'c12')).toBe(true);
    expect(matchesQuery(account, 'maria')).toBe(false);
  });

  it('lists everything for an empty search, and copes with a missing e-mail or name', () => {
    expect(matchesQuery(account, '  ')).toBe(true);
    expect(matchesQuery({ uid: 'x' }, 'ana')).toBe(false);
  });
});

describe('confirmationMatches', () => {
  it('asks for the e-mail of the account, or its id when it has none', () => {
    expect(confirmationMatches({ uid: 'u1', email: 'Ana@Example.com' }, ' ana@example.com ')).toBe(
      true,
    );
    expect(confirmationMatches({ uid: 'u1', email: 'ana@example.com' }, 'u1')).toBe(false);
    expect(confirmationMatches({ uid: 'U1' }, 'u1')).toBe(true);
    expect(confirmationMatches({ uid: 'u1' }, '')).toBe(false);
  });
});

describe('hasOpenPayment', () => {
  const future = Date.now() + 86_400_000;

  it('is true only for a pending or confirmed booking in the future with a payment', () => {
    expect(hasOpenPayment({ paymentIntentId: 'pi_1', status: 'pending', startsAt: future })).toBe(
      true,
    );
    expect(hasOpenPayment({ paymentIntentId: 'pi_1', status: 'confirmed', startsAt: future })).toBe(
      true,
    );
    expect(hasOpenPayment({ paymentIntentId: 'pi_1', status: 'completed', startsAt: future })).toBe(
      false,
    );
    expect(hasOpenPayment({ paymentIntentId: 'pi_1', status: 'pending', startsAt: 1 })).toBe(false);
  });

  it('is false without a payment', () => {
    expect(hasOpenPayment({ status: 'pending', startsAt: future })).toBe(false);
    expect(hasOpenPayment({ paymentIntentId: 'none', status: 'pending', startsAt: future })).toBe(
      false,
    );
  });

  it('reads a Firestore timestamp too', () => {
    const startsAt = { toMillis: () => future };
    expect(hasOpenPayment({ paymentIntentId: 'pi_1', status: 'pending', startsAt })).toBe(true);
  });
});
