import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Instagram API with Instagram Login. The professional connects her own account (Business or Creator).
// The app id is public (functions/.env: INSTAGRAM_APP_ID=...). The app secret is a secret:
//   firebase functions:secrets:set INSTAGRAM_APP_SECRET
const appId = defineString('INSTAGRAM_APP_ID', { default: '' });
const appSecret = defineSecret('INSTAGRAM_APP_SECRET');

const GRAPH = 'https://graph.instagram.com';
const MAX_PHOTOS = 30;
// Refreshes tokens that expire within this many days (they last 60 days)
const REFRESH_WITHIN_DAYS = 15;

type Photo = { id: string; url: string; permalink: string; caption: string; video: boolean };
type Token = { token: string; expiresAt: number };

const db = () => getFirestore();
const tokenRef = (uid: string) => db().doc(`professionals/${uid}/private/instagram`);

const getJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const json = (await response.json()) as Record<string, any>;
  if (!response.ok || json['error'] || json['error_message']) {
    const message = json['error']?.['message'] ?? json['error_message'] ?? `HTTP ${response.status}`;
    throw new HttpsError('failed-precondition', `Instagram: ${message}`);
  }
  return json;
};

// Photos are copied to our Storage: the Instagram links expire after a while
const publicUrl = (bucket: string, path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;

async function syncPhotos(uid: string, token: string) {
  const media = await getJson(
    `${GRAPH}/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption&limit=${MAX_PHOTOS}&access_token=${token}`,
  );

  const bucket = getStorage().bucket();
  const photos: Photo[] = [];
  for (const item of (media['data'] ?? []) as Record<string, string>[]) {
    const video = item['media_type'] === 'VIDEO';
    const source = video ? item['thumbnail_url'] : item['media_url'];
    if (!source) continue;

    const path = `professionals/${uid}/instagram/${item['id']}.jpg`;
    const file = bucket.file(path);
    if (!(await file.exists())[0]) {
      const image = await fetch(source);
      if (!image.ok) continue;
      await file.save(Buffer.from(await image.arrayBuffer()), {
        contentType: image.headers.get('content-type') ?? 'image/jpeg',
      });
    }
    photos.push({
      id: item['id'],
      url: publicUrl(bucket.name, path),
      permalink: item['permalink'],
      caption: (item['caption'] ?? '').slice(0, 200),
      video,
    });
  }

  // Photos that are gone from the profile are removed from Storage too
  const keep = new Set(photos.map((photo) => `professionals/${uid}/instagram/${photo.id}.jpg`));
  const [files] = await bucket.getFiles({ prefix: `professionals/${uid}/instagram/` });
  await Promise.all(files.filter((file) => !keep.has(file.name)).map((file) => file.delete()));

  await db().doc(`professionals/${uid}`).update({ instagramPhotos: photos, instagramSyncedAt: FieldValue.serverTimestamp() });
  return photos.length;
}

const requireProfessional = async (uid: string | undefined) => {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta.');
  if (!(await db().doc(`professionals/${uid}`).get()).exists) {
    throw new HttpsError('permission-denied', 'Apenas profissionais podem conectar o Instagram.');
  }
  return uid;
};

// Step 2 of the OAuth flow: the page got a `code` back from Instagram and sends it here
export const connectInstagram = onCall({ secrets: [appSecret] }, async (request) => {
  const uid = await requireProfessional(request.auth?.uid);
  const { code, redirectUri } = request.data as { code?: string; redirectUri?: string };
  if (!code || !redirectUri) throw new HttpsError('invalid-argument', 'Código ausente.');
  if (!appId.value()) throw new HttpsError('failed-precondition', 'INSTAGRAM_APP_ID não configurado.');

  const short = await getJson('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: appId.value(),
      client_secret: appSecret.value(),
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const long = await getJson(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${appSecret.value()}&access_token=${short['access_token']}`,
  );
  const token = long['access_token'] as string;
  const me = await getJson(`${GRAPH}/me?fields=user_id,username&access_token=${token}`);

  // The token is only readable by Cloud Functions: no rule opens the `private` documents
  await tokenRef(uid).set({
    token,
    expiresAt: Date.now() + (long['expires_in'] as number) * 1000,
    igUserId: me['user_id'],
  } satisfies Token & { igUserId: string });
  await db().doc(`professionals/${uid}`).update({ instagram: me['username'], instagramConnected: true });

  const photos = await syncPhotos(uid, token);
  return { username: me['username'] as string, photos };
});

// The professional asks for the latest photos
export const refreshInstagram = onCall(async (request) => {
  const uid = await requireProfessional(request.auth?.uid);
  const saved = (await tokenRef(uid).get()).data() as Token | undefined;
  if (!saved) throw new HttpsError('failed-precondition', 'Instagram não conectado.');
  return { photos: await syncPhotos(uid, saved.token) };
});

export const disconnectInstagram = onCall(async (request) => {
  const uid = await requireProfessional(request.auth?.uid);
  await tokenRef(uid).delete();
  const [files] = await getStorage().bucket().getFiles({ prefix: `professionals/${uid}/instagram/` });
  await Promise.all(files.map((file) => file.delete()));
  await db().doc(`professionals/${uid}`).update({
    instagramConnected: false,
    instagramPhotos: [],
    instagramSyncedAt: FieldValue.delete(),
  });
});

// Every night: keeps the tokens alive (60 days) and the photos up to date
export const syncInstagramDaily = onSchedule({ schedule: 'every day 04:00', timeZone: 'America/Sao_Paulo' }, async () => {
  const connected = await db().collection('professionals').where('instagramConnected', '==', true).get();

  for (const professional of connected.docs) {
    const uid = professional.id;
    try {
      const saved = (await tokenRef(uid).get()).data() as Token | undefined;
      if (!saved) continue;

      let { token } = saved;
      if (saved.expiresAt - Date.now() < REFRESH_WITHIN_DAYS * 86_400_000) {
        const refreshed = await getJson(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
        token = refreshed['access_token'];
        await tokenRef(uid).update({ token, expiresAt: Date.now() + (refreshed['expires_in'] as number) * 1000 });
      }
      await syncPhotos(uid, token);
    } catch (error) {
      console.error(`Instagram sync failed for ${uid}`, error);
    }
  }
});
