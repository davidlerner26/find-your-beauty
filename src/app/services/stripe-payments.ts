import { httpsCallable } from 'firebase/functions';
import { APP_LANGUAGE } from '../utils/locale';
import { functions } from './firebase';
import { CardFormHandle, Hold, HoldRequest, PaymentsApi, SavedCard } from './payments.types';
import { stripeFor } from './stripe-js';

const call = <Request, Response>(name: string) => {
  const callable = httpsCallable<Request, Response>(functions, name);
  return async (data?: Request) => (await callable(data)).data;
};

// What the Cloud Functions answer
type Authorization =
  | { status: 'authorized'; paymentIntentId: string; total: number }
  | { status: 'requires_action'; paymentIntentId: string; clientSecret: string; total: number }
  | { status: 'failed'; code: string };
type Confirmation = { status: string; paymentIntentId?: string; code?: string };

// Stripe's own names for the language of the form
const STRIPE_LOCALE = { pt: 'pt-BR', en: 'en', es: 'es' }[APP_LANGUAGE] as 'pt-BR' | 'en' | 'es';

// The payments of the test environment, through the Cloud Functions (the secret key of Stripe lives only there)
export class StripePayments implements PaymentsApi {
  constructor(private readonly publishableKey: string) {}

  get available() {
    return !!this.publishableKey;
  }

  private readonly listCards = call<void, { cards: SavedCard[] }>('listCards');
  private readonly removeCardOf = call<{ paymentMethodId: string }, { ok: boolean }>('removeCard');
  private readonly setup = call<void, { clientSecret: string }>('createCardSetup');
  private readonly authorize = call<object, Authorization>('authorizePayment');
  private readonly confirm = call<{ paymentIntentId: string }, Confirmation>(
    'confirmAuthorization',
  );
  private readonly cancel = call<{ paymentIntentId: string }, { ok: boolean }>(
    'cancelAuthorization',
  );

  async cards() {
    return (await this.listCards()).cards;
  }

  async removeCard(id: string) {
    await this.removeCardOf({ paymentMethodId: id });
  }

  async cardForm(): Promise<CardFormHandle> {
    const [{ clientSecret }, stripe] = await Promise.all([
      this.setup(),
      stripeFor(this.publishableKey),
    ]);
    if (!stripe) throw new Error('Stripe.js did not load');

    const elements = stripe.elements({
      clientSecret,
      locale: STRIPE_LOCALE,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#2f6b7a',
          fontFamily: 'Mulish, sans-serif',
          borderRadius: '14px',
        },
      },
    });

    return {
      mount: (element) => elements.create('payment').mount(element),
      save: async () => {
        const { error } = await stripe.confirmSetup({ elements, redirect: 'if_required' });
        return error ? (error.message ?? $localize`Não foi possível salvar o cartão.`) : null;
      },
    };
  }

  async hold(request: HoldRequest): Promise<Hold> {
    const first = await this.authorize({
      professionalId: request.professionalId,
      serviceIds: request.serviceIds,
      startsAtMillis: request.startsAt.getTime(),
      paymentMethodId: request.cardId,
      // One per click: the same click sent twice holds the amount once
      attemptId: crypto.randomUUID(),
    });
    if (first.status === 'failed') return first;
    if (first.status === 'authorized') return first;

    // The bank asked the client to confirm the card (3D Secure): Stripe opens that step, then the server is asked
    // what became of the hold
    const stripe = await stripeFor(this.publishableKey);
    const done = await stripe?.handleNextAction({ clientSecret: first.clientSecret });
    if (!done || done.error) {
      await this.release(first.paymentIntentId).catch(() => undefined);
      return { status: 'failed', code: done?.error?.code ?? 'authentication_failed' };
    }

    const confirmed = await this.confirm({ paymentIntentId: first.paymentIntentId });
    return confirmed.status === 'authorized'
      ? { status: 'authorized', paymentIntentId: first.paymentIntentId, total: first.total }
      : { status: 'failed', code: confirmed.code ?? 'card_declined' };
  }

  async release(paymentIntentId: string) {
    await this.cancel({ paymentIntentId });
  }
}
