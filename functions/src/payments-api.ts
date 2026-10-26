import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { CallableOptions, CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import Stripe from 'stripe';
import { PaymentError, Payments, StripeLike } from './payments';
import { Service, totalFor } from './pricing';
import { hit } from './rate-limit';

// Payments exist only where this is "on": the test environment (.env.dev). Production leaves it off and keeps
// booking without paying, until it is decided to bring payments there.
const mode = defineString('PAYMENTS', { default: 'off' });
export const stripeKey = defineSecret('STRIPE_SECRET_KEY');

export const paymentsOn = () => mode.value() === 'on';

// Looked up when used: the app is started by index.ts after this file is loaded
const db = () => getFirestore();

// The browser calls these signed in (checked inside) or not (then refused): Cloud Run lets anyone invoke them
// The region is said here, not left to setGlobalOptions of index.ts: that call runs after this file is loaded, so
// these functions were created in the default region (us-central1), where the app does not look for them.
const options: CallableOptions = {
  region: 'southamerica-east1',
  invoker: 'public',
  secrets: [stripeKey],
};

let cached: Payments | null = null;
export const payments = () =>
  (cached ??= new Payments(new Stripe(stripeKey.value()) as unknown as StripeLike, db()));

const requireClient = (request: CallableRequest) => {
  if (!paymentsOn()) throw new HttpsError('failed-precondition', 'Payments are not on here.');
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to pay.');
  return uid;
};

const profileOf = async (uid: string) => {
  const user = await getAuth().getUser(uid);
  return { email: user.email, name: user.displayName };
};

// What the Payments class refuses becomes an answer that the app can tell apart
const answer = async <T>(work: () => Promise<T>) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PaymentError) {
      throw new HttpsError(
        error.code === 'card-not-found' ? 'not-found' : 'permission-denied',
        error.code,
      );
    }
    throw error;
  }
};

const text = (value: unknown, max = 200) => {
  if (typeof value !== 'string' || !value || value.length > max) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
  return value;
};

// The secret for the card form of Stripe: a few times an hour is plenty
export const createCardSetup = onCall(options, async (request) => {
  const uid = requireClient(request);
  if (!(await hit(db(), { scope: 'card-setup', key: uid, max: 10, windowSeconds: 3600 }))) {
    throw new HttpsError('resource-exhausted', 'Too many attempts.');
  }
  return answer(async () => payments().createCardSetup(uid, await profileOf(uid)));
});

export const listCards = onCall(options, async (request) => {
  const uid = requireClient(request);
  return { cards: await answer(() => payments().listCards(uid)) };
});

export const removeCard = onCall(options, async (request) => {
  const uid = requireClient(request);
  await answer(() => payments().removeCard(uid, text(request.data?.paymentMethodId)));
  return { ok: true };
});

// Holds the amount of a booking on a saved card. The browser says which services at what time: the amount is
// calculated here, from what the professional really charges, never taken from the browser.
export const authorizePayment = onCall(options, async (request) => {
  const uid = requireClient(request);
  const professionalId = text(request.data?.professionalId);
  const paymentMethodId = text(request.data?.paymentMethodId);
  const attemptId = text(request.data?.attemptId, 100);
  const serviceIds = request.data?.serviceIds;
  const startsAt = new Date(Number(request.data?.startsAtMillis));
  if (
    !Array.isArray(serviceIds) ||
    serviceIds.length > 20 ||
    !serviceIds.every((id) => typeof id === 'string')
  ) {
    throw new HttpsError('invalid-argument', 'Invalid services.');
  }
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    throw new HttpsError('invalid-argument', 'Invalid time.');
  }

  const professional = (await db().doc(`professionals/${professionalId}`).get()).data();
  if (!professional || professional['approved'] === false) {
    throw new HttpsError('not-found', 'Unknown professional.');
  }
  const total = totalFor((professional['services'] ?? []) as Service[], serviceIds, startsAt);
  if (total === null) throw new HttpsError('invalid-argument', 'Unknown services.');
  if (total < 0.5) throw new HttpsError('invalid-argument', 'The amount is too small to charge.');

  const authorization = await answer(() =>
    payments().authorize(uid, {
      paymentMethodId,
      total,
      attemptId,
      description: `Find Your Beauty: ${professional['name'] ?? professionalId}`,
    }),
  );
  return { ...authorization, total };
});

// The bank asked the client to confirm the card: the browser did it, and asks what became of the hold
export const confirmAuthorization = onCall(options, async (request) => {
  const uid = requireClient(request);
  return answer(() => payments().confirmAuthorization(uid, text(request.data?.paymentIntentId)));
});

// The client gave up before the booking was made: the hold is lifted
export const cancelAuthorization = onCall(options, async (request) => {
  const uid = requireClient(request);
  await answer(() => payments().cancelAuthorization(uid, text(request.data?.paymentIntentId)));
  return { ok: true };
});
