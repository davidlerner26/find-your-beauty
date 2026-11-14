import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { proSubscriptionEnabled } from '../utils/features';
import { ProStatus } from '../utils/pro-plan';
import { functions } from './firebase';

const call = <Request, Response>(name: string) => httpsCallable<Request, Response>(functions, name);

// The Pro subscription of the professional (docs/assinatura-pro.md). The card is typed on pages of Stripe: here we only
// ask the Cloud Functions for their address and for the state of the plan.
@Injectable({ providedIn: 'root' })
export class ProSubscription {
  // Where the subscription exists (the test environment for now)
  readonly available = proSubscriptionEnabled();

  async status() {
    return (await call<void, ProStatus>('getProStatus')()).data;
  }

  // The page of Stripe where the professional subscribes
  async checkoutUrl() {
    return (await call<void, { url: string }>('createProCheckout')()).data.url;
  }

  // The page of Stripe where she changes the card, sees the invoices and cancels
  async portalUrl() {
    return (await call<void, { url: string }>('createProPortal')()).data.url;
  }
}
