// What the page of the subscription tells the professional, from what Stripe said (see functions/src/subscription.ts)
export type ProStatus =
  | { subscribed: false }
  | {
      subscribed: true;
      status: string;
      pro: boolean;
      periodEndMillis: number | null;
      cancelAtPeriodEnd: boolean;
    };

// 'none': never subscribed · 'active': Pro, renews on its own · 'cancelling': Pro until the end of the period, then
// it stops · 'past_due': Pro for now, but the last charge failed (the card has to be updated) · 'ended': it was Pro
// and is not any more
export type PlanState = 'none' | 'active' | 'cancelling' | 'past_due' | 'ended';

export const planState = (status: ProStatus | null): PlanState => {
  if (!status?.subscribed) return 'none';
  if (!status.pro) return 'ended';
  if (status.status === 'past_due') return 'past_due';
  return status.cancelAtPeriodEnd ? 'cancelling' : 'active';
};
