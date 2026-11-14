import { planState, ProStatus } from './pro-plan';

const subscribed = (fields: Partial<Extract<ProStatus, { subscribed: true }>>): ProStatus => ({
  subscribed: true,
  status: 'active',
  pro: true,
  periodEndMillis: 1_800_000_000_000,
  cancelAtPeriodEnd: false,
  ...fields,
});

describe('planState', () => {
  it('is none for who never subscribed, and while the status is not known yet', () => {
    expect(planState({ subscribed: false })).toBe('none');
    expect(planState(null)).toBe('none');
  });

  it('is active for a subscription that renews', () => {
    expect(planState(subscribed({}))).toBe('active');
    expect(planState(subscribed({ status: 'trialing' }))).toBe('active');
  });

  it('is cancelling for a subscription that is Pro until the end of the period', () => {
    expect(planState(subscribed({ cancelAtPeriodEnd: true }))).toBe('cancelling');
  });

  it('is past_due when the last charge failed: still Pro, but the card has to be updated', () => {
    expect(planState(subscribed({ status: 'past_due' }))).toBe('past_due');
  });

  it('is ended when it is not Pro any more', () => {
    expect(planState(subscribed({ status: 'canceled', pro: false }))).toBe('ended');
    expect(planState(subscribed({ status: 'incomplete', pro: false }))).toBe('ended');
  });
});
