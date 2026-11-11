import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { asLang, L, Lang, link, resendKey, sendEmail } from './email';
import { clientIp, hit } from './rate-limit';

// A profile made by an admin for a professional who has no account yet lives in professionalDrafts/{draftId}, which
// only admins read (see firestore.rules): it is never in the catalog. The admin sends an invite by e-mail; the
// professional opens the link, signs in with the invited address and claims it. Claiming copies the draft to
// professionals/{uid} (the document id is the account uid, which the rest of the app depends on) and deletes it.
// Nothing can reference a draft (no bookings, messages or reviews), so changing the id costs nothing.

// Said here, not left to setGlobalOptions of index.ts: that call runs after this file is loaded
const REGION = 'southamerica-east1';
const PUBLIC = { region: REGION, invoker: 'public' } as const;

export const DRAFTS = 'professionalDrafts';
export const INVITE_DAYS = 14;

type Data = Record<string, unknown>;

// --- Pure helpers (tested in functions/tests/claim.test.ts) ---

export const newToken = () => randomBytes(24).toString('base64url');

// Only the hash of the token is saved: reading the draft is not enough to claim it
export const hashToken = (draftId: string, token: string) =>
  createHash('sha256').update(`${draftId}:${token}`).digest('hex');

export const tokenMatches = (saved: unknown, draftId: string, token: string) => {
  if (typeof saved !== 'string' || !token) return false;
  const a = Buffer.from(saved);
  const b = Buffer.from(hashToken(draftId, token));
  return a.length === b.length && timingSafeEqual(a, b);
};

export const cleanEmail = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

export type InviteState = 'ok' | 'missing' | 'wrong' | 'expired';

// Is this token a valid invite for the draft?
export const inviteState = (
  draft: Data | undefined,
  draftId: string,
  token: unknown,
  now = Date.now(),
) => {
  if (!draft || typeof draft['inviteHash'] !== 'string') return 'missing' as InviteState;
  if (typeof token !== 'string' || !tokenMatches(draft['inviteHash'], draftId, token)) {
    return 'wrong' as InviteState;
  }
  const expires = draft['inviteExpiresAt'];
  const expiresMs =
    typeof expires === 'number'
      ? expires
      : ((expires as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0);
  return (now > expiresMs ? 'expired' : 'ok') as InviteState;
};

// What the professional starts with. Whitelisted: the draft also has the invite fields, which never go public.
const PROFILE_FIELDS = [
  'name',
  'image',
  'imagePosition',
  'address',
  'serviceMode',
  'tags',
  'about',
  'services',
  'gallery',
  'position',
  'phone',
  'instagram',
  'availability',
  'lang',
] as const;

// Where a photo of the draft goes when the profile is claimed
export const claimedPhotoPath = (draftId: string, path: string, uid: string) => {
  const prefix = `${DRAFTS}/${draftId}/`;
  return path.startsWith(prefix) ? `professionals/${uid}/${path.slice(prefix.length)}` : null;
};

// "https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED%2FPATH?alt=media&token=..." -> "ENCODED/PATH"
export const storagePathOf = (url: unknown) => {
  if (typeof url !== 'string') return null;
  const match = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

// Every photo URL of a draft: the profile photo, the gallery and the photos of the services
export const photoUrls = (draft: Data) => {
  const urls: string[] = [];
  if (typeof draft['image'] === 'string') urls.push(draft['image']);
  if (Array.isArray(draft['gallery'])) {
    urls.push(...draft['gallery'].filter((u): u is string => typeof u === 'string'));
  }
  if (Array.isArray(draft['services'])) {
    for (const service of draft['services'] as Data[]) {
      if (Array.isArray(service?.['photos'])) {
        urls.push(...service['photos'].filter((u): u is string => typeof u === 'string'));
      }
    }
  }
  return [...new Set(urls)];
};

// The professional document of the account: the draft with the photos swapped for the copies (`photos`: old URL ->
// new URL). Same shape as an approved sign up that was sent, so the rest of the app treats it like any other professional.
export const profileFromDraft = (
  draft: Data,
  uid: string,
  draftId: string,
  photos: Map<string, string>,
) => {
  const swap = (url: unknown) => (typeof url === 'string' ? (photos.get(url) ?? url) : url);
  const profile: Data = {};
  for (const field of PROFILE_FIELDS) {
    if (draft[field] !== undefined) profile[field] = draft[field];
  }
  if ('image' in profile) profile['image'] = swap(profile['image']);
  if (Array.isArray(profile['gallery'])) profile['gallery'] = profile['gallery'].map(swap);
  if (Array.isArray(profile['services'])) {
    profile['services'] = (profile['services'] as Data[]).map((service) =>
      Array.isArray(service?.['photos'])
        ? { ...service, photos: (service['photos'] as unknown[]).map(swap) }
        : service,
    );
  }
  return {
    ...profile,
    ownerUid: uid,
    email: cleanEmail(draft['claimEmail']),
    approved: true,
    rejected: false,
    submitted: true,
    admin: false,
    visible: true,
    // Not public yet: the draft has no CPF or hours and may lack services. The professional completes the profile and
    // saving it publishes it, like any other (`published` is computed from `visible` and a complete profile).
    published: false,
    rating: 0,
    reviewsCount: '0',
    views: '0',
    claimedFromDraft: draftId,
  };
};

// --- Callables ---

const db = () => getFirestore();

const isAdmin = async (uid: string) =>
  (await db().doc(`users/${uid}`).get()).data()?.['admin'] === true;

const tooMany = (lang: Lang) =>
  L(lang, {
    pt: 'Muitas tentativas. Tente novamente mais tarde.',
    en: 'Too many attempts. Try again later.',
    es: 'Demasiados intentos. Inténtalo de nuevo más tarde.',
  });

const invalidInvite = (lang: Lang) =>
  new HttpsError(
    'failed-precondition',
    L(lang, {
      pt: 'Este convite não vale mais. Peça um novo convite.',
      en: 'This invite is no longer valid. Ask for a new one.',
      es: 'Esta invitación ya no es válida. Pide una nueva.',
    }),
  );

const draftIdOf = (value: unknown) => {
  if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/')) {
    throw new HttpsError('invalid-argument', 'draftId is required');
  }
  return value;
};

// An admin sends (or resends) the invite: a new token replaces the old one, so older links stop working
export const createProfessionalInvite = onCall(
  { ...PUBLIC, secrets: [resendKey] },
  async (request) => {
    if (!request.auth || !(await isAdmin(request.auth.uid))) {
      throw new HttpsError('permission-denied', 'Only admins send invites');
    }
    const draftId = draftIdOf(request.data?.draftId);
    const ref = db().doc(`${DRAFTS}/${draftId}`);
    const draft = (await ref.get()).data();
    if (!draft) throw new HttpsError('not-found', 'Draft not found');

    const email = cleanEmail(draft['claimEmail']);
    const name = String(draft['name'] ?? '').trim();
    if (!isEmail(email) || !name) {
      throw new HttpsError('failed-precondition', 'The draft needs a name and an e-mail');
    }
    if (!(await hit(db(), { scope: 'invite', key: draftId, max: 5, windowSeconds: 3600 }))) {
      throw new HttpsError('resource-exhausted', tooMany('pt'));
    }

    const token = newToken();
    const expiresAt = Date.now() + INVITE_DAYS * 24 * 3600_000;
    await ref.update({
      inviteHash: hashToken(draftId, token),
      inviteExpiresAt: expiresAt,
      invitedAt: FieldValue.serverTimestamp(),
    });

    const lang = asLang(draft['lang']);
    await sendEmail({
      to: email,
      lang,
      subject: L(lang, {
        pt: 'Seu perfil no Find Your Beauty está pronto',
        en: 'Your Find Your Beauty profile is ready',
        es: 'Tu perfil en Find Your Beauty está listo',
      }),
      heading: L(lang, {
        pt: 'Criamos o seu perfil',
        en: 'We created your profile',
        es: 'Creamos tu perfil',
      }),
      paragraphs: [
        L(lang, {
          pt: `Olá, ${name}! A nossa equipe montou o seu perfil no Find Your Beauty. Para assumir o perfil, entre com este e-mail pelo botão abaixo. Depois é só conferir os dados e ajustar o que quiser.`,
          en: `Hi, ${name}! Our team set up your profile on Find Your Beauty. To take it over, sign in with this email using the button below. Then check the details and change whatever you like.`,
          es: `¡Hola, ${name}! Nuestro equipo armó tu perfil en Find Your Beauty. Para asumirlo, entra con este correo usando el botón de abajo. Luego revisa los datos y cambia lo que quieras.`,
        }),
        L(lang, {
          pt: `O link vale por ${INVITE_DAYS} dias. Se você não esperava este e-mail, pode ignorá-lo.`,
          en: `The link is valid for ${INVITE_DAYS} days. If you were not expecting this email, you can ignore it.`,
          es: `El enlace vale por ${INVITE_DAYS} días. Si no esperabas este correo, puedes ignorarlo.`,
        }),
      ],
      button: {
        label: L(lang, {
          pt: 'Assumir o meu perfil',
          en: 'Take over my profile',
          es: 'Asumir mi perfil',
        }),
        url: link(lang, `/convite/${draftId}/${token}`),
      },
    });
    return { ok: true, expiresAt: expiresAt };
  },
);

// What the invite page shows before the professional signs in. It answers only for a valid token (which was sent
// to that e-mail), and a wrong guess looks the same as a draft that does not exist.
export const professionalInviteInfo = onCall(PUBLIC, async (request) => {
  const lang = asLang(request.data?.lang);
  const draftId = draftIdOf(request.data?.draftId);
  if (
    !(await hit(db(), {
      scope: 'invite-info',
      key: clientIp(request),
      max: 60,
      windowSeconds: 3600,
    }))
  ) {
    throw new HttpsError('resource-exhausted', tooMany(lang));
  }
  const draft = (await db().doc(`${DRAFTS}/${draftId}`).get()).data();
  if (inviteState(draft, draftId, request.data?.token) !== 'ok' || !draft)
    throw invalidInvite(lang);
  return {
    name: String(draft['name'] ?? ''),
    image: typeof draft['image'] === 'string' ? draft['image'] : '',
    email: cleanEmail(draft['claimEmail']),
  };
});

// Copies the photos of the draft to the folder of the account and returns old URL -> new URL
const copyPhotos = async (draft: Data, draftId: string, uid: string) => {
  const bucket = getStorage().bucket();
  const photos = new Map<string, string>();
  for (const url of photoUrls(draft)) {
    const from = storagePathOf(url);
    const to = from ? claimedPhotoPath(draftId, from, uid) : null;
    if (!from || !to) continue;
    try {
      const token = randomUUID();
      const target = bucket.file(to);
      await bucket.file(from).copy(target);
      await target.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
      photos.set(
        url,
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(to)}?alt=media&token=${token}`,
      );
    } catch (error) {
      // The profile still works with the old link (the draft files are not deleted)
      logger.error('Could not copy a photo of the draft', { draftId, from, error });
    }
  }
  return photos;
};

// The professional claims the draft with the invite token, signed in with the invited e-mail
export const claimProfessionalDraft = onCall(
  { ...PUBLIC, secrets: [resendKey] },
  async (request) => {
    const lang = asLang(request.data?.lang);
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        L(lang, { pt: 'Entre na sua conta.', en: 'Sign in.', es: 'Inicia sesión.' }),
      );
    }
    const uid = request.auth.uid;
    const draftId = draftIdOf(request.data?.draftId);
    if (!(await hit(db(), { scope: 'claim', key: uid, max: 10, windowSeconds: 3600 }))) {
      throw new HttpsError('resource-exhausted', tooMany(lang));
    }

    const ref = db().doc(`${DRAFTS}/${draftId}`);
    const draft = (await ref.get()).data();
    if (inviteState(draft, draftId, request.data?.token) !== 'ok' || !draft)
      throw invalidInvite(lang);

    // The token was sent to this address, so the account has to be the one of that address
    const invited = cleanEmail(draft['claimEmail']);
    const email = cleanEmail((await getAuth().getUser(uid)).email);
    if (email !== invited) {
      throw new HttpsError(
        'permission-denied',
        L(lang, {
          pt: `Entre com o e-mail do convite (${invited}).`,
          en: `Sign in with the email of the invite (${invited}).`,
          es: `Entra con el correo de la invitación (${invited}).`,
        }),
      );
    }

    const target = db().doc(`professionals/${uid}`);
    if ((await target.get()).exists) {
      throw new HttpsError(
        'already-exists',
        L(lang, {
          pt: 'Esta conta já tem um perfil profissional.',
          en: 'This account already has a professional profile.',
          es: 'Esta cuenta ya tiene un perfil profesional.',
        }),
      );
    }

    const photos = await copyPhotos(draft, draftId, uid);
    await db().runTransaction(async (transaction) => {
      // Read again: two claims at once (or a new invite in between) must not both go through
      const current = (await transaction.get(ref)).data();
      if (inviteState(current, draftId, request.data?.token) !== 'ok' || !current) {
        throw invalidInvite(lang);
      }
      if ((await transaction.get(target)).exists) {
        throw new HttpsError('already-exists', 'This account already has a professional profile.');
      }
      transaction.create(target, {
        ...profileFromDraft(current, uid, draftId, photos),
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.delete(ref);
    });

    await sendEmail({
      to: email,
      lang,
      subject: L(lang, {
        pt: 'Seu perfil está no ar',
        en: 'Your profile is live',
        es: 'Tu perfil está en línea',
      }),
      heading: L(lang, {
        pt: 'O perfil agora é seu',
        en: 'The profile is now yours',
        es: 'El perfil ahora es tuyo',
      }),
      paragraphs: [
        L(lang, {
          pt: 'Você assumiu o seu perfil e ele já aparece para os clientes. Confira os serviços, os horários e as fotos quando quiser.',
          en: 'You took over your profile and it is already visible to clients. Check the services, hours and photos whenever you like.',
          es: 'Asumiste tu perfil y ya aparece para los clientes. Revisa los servicios, los horarios y las fotos cuando quieras.',
        }),
      ],
      button: {
        label: L(lang, { pt: 'Abrir o meu perfil', en: 'Open my profile', es: 'Abrir mi perfil' }),
        url: link(lang, '/pro'),
      },
    });
    return { ok: true };
  },
);
