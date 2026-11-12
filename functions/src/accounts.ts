import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

// Accounts, for the admins: a search over the accounts of Firebase Authentication (the clients' data is closed by the
// Firestore rules, so the admin page cannot read it) and the deletion of an account with everything it has: Firestore,
// Storage and Authentication.

// Said here, not left to setGlobalOptions of index.ts: that call runs after this file is loaded
const PUBLIC = { region: 'southamerica-east1', invoker: 'public' } as const;

type Data = Record<string, unknown>;

// --- Pure helpers (tested in functions/tests/accounts.test.ts) ---

const clean = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

// Does the account match what the admin typed? (e-mail, name or id)
export const matchesQuery = (
  account: { uid: string; email?: string; displayName?: string },
  query: string,
) => {
  const text = clean(query);
  if (!text) return true;
  return [account.email, account.displayName, account.uid].some((field) =>
    clean(field).includes(text),
  );
};

// The admin confirms by typing the e-mail of the account (its id, for an account without an e-mail)
export const confirmationMatches = (account: { uid: string; email?: string }, typed: unknown) => {
  const expected = clean(account.email) || account.uid.toLowerCase();
  return clean(typed) === expected;
};

// A booking with a payment that is still open: it has to be cancelled first, or the card stays held
export const hasOpenPayment = (booking: Data, now = Date.now()) => {
  const intent = booking['paymentIntentId'];
  if (typeof intent !== 'string' || !intent || intent === 'none') return false;
  if (booking['status'] !== 'pending' && booking['status'] !== 'confirmed') return false;
  const startsAt = booking['startsAt'] as { toMillis?: () => number } | number | undefined;
  const millis = typeof startsAt === 'number' ? startsAt : (startsAt?.toMillis?.() ?? 0);
  return millis > now;
};

// --- Callables ---

const db = () => getFirestore();

const requireAdmin = async (uid: string | undefined) => {
  if (!uid || (await db().doc(`users/${uid}`).get()).data()?.['admin'] !== true) {
    throw new HttpsError('permission-denied', 'Only admins');
  }
  return uid;
};

const uidOf = (value: unknown) => {
  if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/')) {
    throw new HttpsError('invalid-argument', 'uid is required');
  }
  return value;
};

export type AccountRow = {
  uid: string;
  email: string;
  name: string;
  role: 'professional' | 'client' | 'none';
  admin: boolean;
  createdAt: string;
};

// The accounts that match the search (up to 20), with what they are in the app
export const searchAccounts = onCall(PUBLIC, async (request) => {
  await requireAdmin(request.auth?.uid);
  const query = String(request.data?.query ?? '');

  const found: { uid: string; email?: string; displayName?: string; created: string }[] = [];
  let pageToken: string | undefined;
  // 1000 accounts per page; the search stops at 20 results or at 20 pages
  for (let page = 0; page < 20 && found.length < 20; page++) {
    const result = await getAuth().listUsers(1000, pageToken);
    for (const user of result.users) {
      if (found.length >= 20) break;
      if (matchesQuery(user, query)) {
        found.push({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          created: user.metadata.creationTime,
        });
      }
    }
    pageToken = result.pageToken;
    if (!pageToken) break;
  }
  if (!found.length) return { accounts: [] as AccountRow[] };

  const refs = found.flatMap((user) => [
    db().doc(`users/${user.uid}`),
    db().doc(`professionals/${user.uid}`),
  ]);
  const docs = await db().getAll(...refs);

  const accounts: AccountRow[] = found.map((user, index) => {
    const client = docs[index * 2].data();
    const professional = docs[index * 2 + 1].data();
    const clientName = [client?.['firstName'], client?.['lastName']].filter(Boolean).join(' ');
    return {
      uid: user.uid,
      email: user.email ?? '',
      name: String(professional?.['name'] ?? '') || clientName || user.displayName || '',
      role: professional ? 'professional' : client ? 'client' : 'none',
      admin: client?.['admin'] === true,
      createdAt: user.created,
    };
  });
  return { accounts };
});

// Every document of a query, deduplicated by path
const docsOf = async (queries: FirebaseFirestore.Query[]) => {
  const byPath = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const query of queries) {
    for (const doc of (await query.get()).docs) byPath.set(doc.ref.path, doc.ref);
  }
  return [...byPath.values()];
};

// Deletes an account and everything that belongs to it. Firestore and Storage first, Authentication last: when
// something fails halfway, the account is still in the search and the deletion can be tried again.
export const deleteAccount = onCall(PUBLIC, async (request) => {
  const adminUid = await requireAdmin(request.auth?.uid);
  const uid = uidOf(request.data?.uid);

  if (uid === adminUid) throw new HttpsError('failed-precondition', 'You cannot delete yourself');
  if ((await db().doc(`users/${uid}`).get()).data()?.['admin'] === true) {
    throw new HttpsError(
      'failed-precondition',
      'An admin account is not deleted here: take the admin flag away first',
    );
  }

  let account: { uid: string; email?: string } | null = null;
  try {
    account = await getAuth().getUser(uid);
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
  }
  if (!confirmationMatches(account ?? { uid }, request.data?.confirm)) {
    throw new HttpsError('failed-precondition', 'The confirmation does not match the account');
  }

  const bookings = await docsOf([
    db().collection('bookings').where('clientUid', '==', uid),
    db().collection('bookings').where('professionalUid', '==', uid),
    db().collection('bookings').where('professionalId', '==', uid),
  ]);
  const bookingData = await Promise.all(
    bookings.map(async (ref) => (await ref.get()).data() ?? {}),
  );
  if (bookingData.some((booking) => hasOpenPayment(booking))) {
    throw new HttpsError(
      'failed-precondition',
      'The account has a booking with a payment still open: cancel it first',
    );
  }

  const conversations = await docsOf([
    db().collection('conversations').where('participants', 'array-contains', uid),
    db().collection('conversations').where('clientUid', '==', uid),
    db().collection('conversations').where('professionalId', '==', uid),
  ]);

  // The slots this account took on the agenda of other professionals (its own agenda goes with its document)
  const slots = bookingData.flatMap((booking) =>
    ((booking['busyIds'] as string[] | undefined) ?? []).map((id) =>
      db().doc(`professionals/${booking['professionalId']}/busy/${id}`),
    ),
  );

  // Reviews it wrote, and hearts it received, are in the documents of other accounts: they are found by their id
  const professionals = await db().collection('professionals').listDocuments();
  const users = await db().collection('users').listDocuments();
  const reviews = professionals.map((ref) => ref.collection('reviews').doc(uid));
  const hearts = users.map((ref) => ref.collection('favorites').doc(uid));
  const others = [...reviews, ...hearts];
  const existing = others.length ? (await db().getAll(...others)).filter((s) => s.exists) : [];

  const writer = db().bulkWriter();
  for (const ref of [...slots, ...existing.map((snapshot) => snapshot.ref)]) {
    void writer.delete(ref).catch(() => undefined);
  }
  await writer.close();

  // The account's own data, with every subcollection (reviews, hours, CPF, Instagram token, messages, favorites...)
  const own = [
    db().doc(`users/${uid}`),
    db().doc(`professionals/${uid}`),
    db().doc(`emailCodes/${uid}`),
    ...bookings,
    ...conversations,
  ];
  for (const ref of own) await db().recursiveDelete(ref);

  const bucket = getStorage().bucket();
  const prefixes = [`professionals/${uid}/`, ...conversations.map((ref) => `chats/${ref.id}/`)];
  for (const prefix of prefixes) await bucket.deleteFiles({ prefix, force: true });

  if (account) await getAuth().deleteUser(uid);

  logger.info('Account deleted', {
    by: adminUid,
    uid,
    bookings: bookings.length,
    conversations: conversations.length,
    reviews: existing.length,
  });
  return {
    ok: true,
    bookings: bookings.length,
    conversations: conversations.length,
  };
});
