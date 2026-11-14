import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import {
  CallableOptions,
  CallableRequest,
  HttpsError,
  onCall,
  onRequest,
} from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import Stripe from 'stripe';
import { appUrl, asLang, emailOf, L, link, resendKey, sendEmail } from './email';
import { stripeKey } from './payments-api';
import { hit } from './rate-limit';
import { BillingStripeLike, Change, SubscriptionError, Subscriptions } from './subscription';

// The Pro subscription of the professionals (docs/assinatura-pro.md) exists only where this is "on": the test
// environment (.env.dev). Production leaves it off until the owner says to bring it there: the callables answer that it
// is not available, the webhook answers 404 and the nightly job does nothing.
const mode = defineString('SUBSCRIPTIONS', { default: 'off' });
// The recurring Price of Stripe (price_...) that the subscription charges: the price is not in the code
const proPriceId = defineString('PRO_PRICE_ID', { default: '' });
// The secret that Stripe signs the webhook with (whsec_...)
export const webhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

export const subscriptionsOn = () => mode.value() === 'on';

// Looked up when used: the app is started by index.ts after this file is loaded
const db = () => getFirestore();

// The region is said here, not left to setGlobalOptions of index.ts (see payments-api.ts)
const REGION = 'southamerica-east1';
const options: CallableOptions = { region: REGION, invoker: 'public', secrets: [stripeKey] };

let cached: Subscriptions | null = null;
export const subscriptions = () =>
  (cached ??= new Subscriptions(
    new Stripe(stripeKey.value()) as unknown as BillingStripeLike,
    db(),
    { priceId: proPriceId.value(), appUrl: appUrl.value() },
  ));

const requireProfessional = async (request: CallableRequest) => {
  if (!subscriptionsOn()) {
    throw new HttpsError('failed-precondition', 'The subscription is not available here.');
  }
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to subscribe.');
  const professional = (await db().doc(`professionals/${uid}`).get()).data();
  if (!professional) {
    throw new HttpsError('permission-denied', 'Only professionals can subscribe.');
  }
  if (professional['approved'] === false || professional['rejected'] === true) {
    throw new HttpsError('permission-denied', 'The account is not approved yet.');
  }
  return uid;
};

const profileOf = async (uid: string) => {
  const user = await getAuth().getUser(uid);
  return { email: user.email, name: user.displayName };
};

// What the Subscriptions class refuses becomes an answer that the app can tell apart
const answer = async <T>(work: () => Promise<T>) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof SubscriptionError) {
      throw new HttpsError(
        error.code === 'already-subscribed' ? 'already-exists' : 'failed-precondition',
        error.code,
      );
    }
    throw error;
  }
};

// The page of Stripe to subscribe
export const createProCheckout = onCall(options, async (request) => {
  const uid = await requireProfessional(request);
  if (!(await hit(db(), { scope: 'pro-checkout', key: uid, max: 10, windowSeconds: 3600 }))) {
    throw new HttpsError('resource-exhausted', 'Too many attempts.');
  }
  return answer(async () => subscriptions().checkout(uid, await profileOf(uid)));
});

// The page of Stripe to change the card, see the invoices and cancel
export const createProPortal = onCall(options, async (request) => {
  const uid = await requireProfessional(request);
  return answer(() => subscriptions().portal(uid));
});

// The state of the subscription for the page (the data of Stripe is private: only the functions read it)
export const getProStatus = onCall(options, async (request) => {
  const uid = await requireProfessional(request);
  return subscriptions().statusOf(uid);
});

// E-mails for what changed. Neutral in gender, in the language of the page where the account was made.
const notifyChange = async (change: Change) => {
  if (!change.applied) return;
  const welcome = change.pro && !change.wasPro && ['active', 'trialing'].includes(change.status);
  const failed = change.status === 'past_due' && change.previousStatus !== 'past_due';
  const ended = !change.pro && change.wasPro;
  if (!welcome && !failed && !ended) return;

  const to = await emailOf(change.uid);
  if (!to) return;
  const professional = (await db().doc(`professionals/${change.uid}`).get()).data();
  const lang = asLang(professional?.['lang']);
  const button = {
    label: L(lang, {
      pt: 'Ver a assinatura',
      en: 'See the subscription',
      es: 'Ver la suscripción',
    }),
    url: link(lang, '/pro/assinatura'),
  };

  if (welcome) {
    await sendEmail({
      to,
      lang,
      subject: L(lang, {
        pt: 'Sua assinatura Pro está ativa',
        en: 'Your Pro subscription is active',
        es: 'Tu suscripción Pro está activa',
      }),
      heading: L(lang, {
        pt: 'Bem-vindo ao Pro!',
        en: 'Welcome to Pro!',
        es: '¡Bienvenido a Pro!',
      }),
      paragraphs: [
        L(lang, {
          pt: 'Seu perfil agora tem o selo Pro, aparece primeiro na busca e no mapa e pode ser mostrado em Profissionais em destaque na página inicial.',
          en: 'Your profile now has the Pro badge, shows first in the search and on the map and can be featured on the home page.',
          es: 'Tu perfil ahora tiene el sello Pro, aparece primero en la búsqueda y en el mapa y puede destacarse en la página de inicio.',
        }),
      ],
      button,
    });
  } else if (failed) {
    await sendEmail({
      to,
      lang,
      subject: L(lang, {
        pt: 'Não conseguimos cobrar a sua assinatura Pro',
        en: 'We could not charge your Pro subscription',
        es: 'No pudimos cobrar tu suscripción Pro',
      }),
      heading: L(lang, {
        pt: 'A cobrança falhou',
        en: 'The payment failed',
        es: 'El cobro falló',
      }),
      paragraphs: [
        L(lang, {
          pt: 'A cobrança da renovação não foi aprovada. Atualize o cartão para manter os benefícios do Pro: tentaremos cobrar de novo nos próximos dias.',
          en: 'The renewal payment was not approved. Update your card to keep the Pro benefits: we will try again in the next days.',
          es: 'El cobro de la renovación no fue aprobado. Actualiza la tarjeta para mantener los beneficios de Pro: lo intentaremos de nuevo en los próximos días.',
        }),
      ],
      button: {
        label: L(lang, {
          pt: 'Atualizar o cartão',
          en: 'Update the card',
          es: 'Actualizar la tarjeta',
        }),
        url: link(lang, '/pro/assinatura'),
      },
    });
  } else {
    await sendEmail({
      to,
      lang,
      subject: L(lang, {
        pt: 'Sua assinatura Pro terminou',
        en: 'Your Pro subscription ended',
        es: 'Tu suscripción Pro terminó',
      }),
      heading: L(lang, {
        pt: 'A assinatura terminou',
        en: 'The subscription ended',
        es: 'La suscripción terminó',
      }),
      paragraphs: [
        L(lang, {
          pt: 'O selo e a prioridade do Pro foram desligados. Seu perfil e a sua agenda continuam funcionando normalmente. Você pode assinar de novo quando quiser.',
          en: 'The Pro badge and priority were turned off. Your profile and your agenda keep working as usual. You can subscribe again whenever you want.',
          es: 'El sello y la prioridad de Pro se desactivaron. Tu perfil y tu agenda siguen funcionando con normalidad. Puedes suscribirte de nuevo cuando quieras.',
        }),
      ],
      button,
    });
  }
};

// Stripe calls this when a subscription changes. It is signed with the secret of the webhook: anything else is refused.
export const stripeWebhook = onRequest(
  { region: REGION, secrets: [stripeKey, webhookSecret, resendKey], cors: false },
  async (request, response) => {
    if (!subscriptionsOn()) {
      response.status(404).send('Not found');
      return;
    }
    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed');
      return;
    }

    let change: Change | null;
    try {
      const signature = request.header('stripe-signature') ?? '';
      const event = subscriptions().readEvent(request.rawBody, signature, webhookSecret.value());
      change = await subscriptions().handleEvent(event);
    } catch (error) {
      const forged = (error as { type?: string }).type === 'StripeSignatureVerificationError';
      logger.error(forged ? 'Stripe webhook with a bad signature' : 'Stripe webhook failed', {
        error,
      });
      // A bad signature is not retried; anything else is, so that Stripe calls again
      response.status(forged ? 400 : 500).send(forged ? 'Bad signature' : 'Failed');
      return;
    }

    if (change) await notifyChange(change);
    response.json({ received: true });
  },
);

// Every night: a subscription whose period ended and that nobody renewed or cancelled stops giving the benefits
export const reconcileProDaily = onSchedule(
  { region: REGION, schedule: 'every day 03:00', timeZone: 'America/Sao_Paulo' },
  async () => {
    if (!subscriptionsOn()) return;
    // The class does not call Stripe to reconcile: it only reads our own data
    const off = await new Subscriptions({} as BillingStripeLike, db(), {
      priceId: '',
      appUrl: appUrl.value(),
    }).reconcile();
    if (off.length) logger.info('Pro turned off by the nightly job', { count: off.length });
  },
);
