import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const CLIENT = 'client1';
const OTHER = 'client2';
const PRO_UID = 'proUid';
const PRO_ID = 'proUid';
const DAY = '2099-05-10';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-find-your-beauty',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'professionals', PRO_ID), {
      ownerUid: PRO_UID,
      approved: true,
    });
    // Demo professional: no account
    await setDoc(doc(ctx.firestore(), 'professionals', 'demo1'), { approved: true });
    await setDoc(doc(ctx.firestore(), 'professionals', 'pending1'), {
      ownerUid: 'pendingUid',
      approved: false,
    });
  });
});

const bookingData = (overrides: Record<string, unknown> = {}) => ({
  clientUid: CLIENT,
  clientName: 'Maria',
  professionalId: PRO_ID,
  professionalUid: PRO_UID,
  professionalName: 'Ana',
  services: [{ id: 's1', name: 'Corte', price: 80, durationMinutes: 60 }],
  startsAt: Timestamp.fromDate(new Date('2099-05-10T10:00:00')),
  durationMinutes: 60,
  total: 80,
  notes: '',
  busyIds: [`${DAY}_10:00`],
  status: 'pending',
  place: 'studio',
  lang: 'pt',
  paymentStatus: 'pending',
  createdAt: serverTimestamp(),
  ...overrides,
});

// What Bookings.create does: the booking and its slots in one batch
const book = (uid: string, booking = bookingData({ clientUid: uid }), busyOverrides = {}) => {
  const db = env.authenticatedContext(uid).firestore();
  const bookingRef = doc(db, 'bookings', 'b1');
  const batch = writeBatch(db);
  for (const slot of booking['busyIds'] as string[]) {
    batch.set(doc(db, 'professionals', booking['professionalId'] as string, 'busy', slot), {
      date: slot.split('_')[0],
      clientUid: uid,
      bookingId: 'b1',
      ...busyOverrides,
    });
  }
  batch.set(bookingRef, booking);
  return batch.commit();
};

describe('bookings and busy slots', () => {
  it('lets a client book an approved professional', async () => {
    await assertSucceeds(book(CLIENT));
  });

  it('lets a client book a demo professional without an account', async () => {
    await assertSucceeds(
      book(CLIENT, bookingData({ professionalId: 'demo1', professionalUid: null })),
    );
  });

  it('denies the same slot twice (double booking)', async () => {
    await assertSucceeds(book(CLIENT));
    await assertFails(book(OTHER));
  });

  it('denies a slot created without a booking (blocking a calendar)', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(
      setDoc(doc(db, 'professionals', PRO_ID, 'busy', `${DAY}_10:00`), {
        date: DAY,
        clientUid: OTHER,
        bookingId: 'nope',
      }),
    );
  });

  it('denies a slot that is not listed in the booking busyIds', async () => {
    const db = env.authenticatedContext(CLIENT).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'professionals', PRO_ID, 'busy', `${DAY}_10:00`), {
      date: DAY,
      clientUid: CLIENT,
      bookingId: 'b1',
    });
    batch.set(doc(db, 'professionals', PRO_ID, 'busy', `${DAY}_15:00`), {
      date: DAY,
      clientUid: CLIENT,
      bookingId: 'b1',
    });
    batch.set(doc(db, 'bookings', 'b1'), bookingData());
    await assertFails(batch.commit());
  });

  it('denies a booking of an unknown professional', async () => {
    await assertFails(
      book(CLIENT, bookingData({ professionalId: 'ghost', professionalUid: null })),
    );
  });

  it('denies a booking of a professional that is not approved', async () => {
    await assertFails(
      book(CLIENT, bookingData({ professionalId: 'pending1', professionalUid: 'pendingUid' })),
    );
  });

  it('denies a booking that points to the wrong professional account', async () => {
    await assertFails(book(CLIENT, bookingData({ professionalUid: OTHER })));
  });

  it('denies a booking in the past, with absurd total, or extra fields', async () => {
    await assertFails(
      book(CLIENT, bookingData({ startsAt: Timestamp.fromDate(new Date('2001-01-01')) })),
    );
    await assertFails(book(CLIENT, bookingData({ total: 99999999 })));
    await assertFails(book(CLIENT, bookingData({ isAdmin: true })));
  });

  it('accepts the id of the hold on the card, as a short text only', async () => {
    await assertSucceeds(
      book(CLIENT, bookingData({ clientUid: CLIENT, paymentIntentId: 'pi_123' })),
    );
  });

  it('denies a hold id that is not a short text', async () => {
    await assertFails(book(CLIENT, bookingData({ paymentIntentId: 123 })));
    await assertFails(book(CLIENT, bookingData({ paymentIntentId: 'x'.repeat(101) })));
  });

  it('denies a client that says its booking is already paid', async () => {
    await assertFails(book(CLIENT, bookingData({ paymentStatus: 'paid' })));
    await assertFails(book(CLIENT, bookingData({ paymentStatus: 'authorized' })));
  });

  it('denies a booking made in the name of another client', async () => {
    const db = env.authenticatedContext(OTHER).firestore();
    await assertFails(setDoc(doc(db, 'bookings', 'b1'), bookingData({ clientUid: CLIENT })));
  });

  it('keeps bookings private to the two sides', async () => {
    await assertSucceeds(book(CLIENT));
    const { getDoc } = await import('firebase/firestore');
    await assertSucceeds(
      getDoc(doc(env.authenticatedContext(PRO_UID).firestore(), 'bookings', 'b1')),
    );
    await assertFails(getDoc(doc(env.authenticatedContext(OTHER).firestore(), 'bookings', 'b1')));
  });
});

describe('conversations and messages', () => {
  const conversationId = `${CLIENT}_${PRO_ID}`;
  const conversation = (overrides: Record<string, unknown> = {}) => ({
    participants: [CLIENT, PRO_UID],
    clientUid: CLIENT,
    clientName: 'Maria',
    clientImage: '',
    professionalId: PRO_ID,
    lastMessage: 'oi',
    lastMessageAt: serverTimestamp(),
    ...overrides,
  });
  const message = (overrides: Record<string, unknown> = {}) => ({
    senderUid: CLIENT,
    text: 'oi',
    createdAt: serverTimestamp(),
    ...overrides,
  });

  // What Messages.sendAsClient does
  const send = (content: Record<string, unknown>, conv = conversation()) => {
    const db = env.authenticatedContext(CLIENT).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'conversations', conversationId, 'messages', 'm1'), content);
    batch.set(doc(db, 'conversations', conversationId), conv, { merge: true });
    return batch.commit();
  };

  it('lets a client start a conversation with a professional', async () => {
    await assertSucceeds(send(message()));
  });

  it('lets a client talk to a demo professional (only the client participates)', async () => {
    const db = env.authenticatedContext(CLIENT).firestore();
    const id = `${CLIENT}_demo1`;
    const batch = writeBatch(db);
    batch.set(doc(db, 'conversations', id, 'messages', 'm1'), message());
    batch.set(
      doc(db, 'conversations', id),
      conversation({ participants: [CLIENT], professionalId: 'demo1' }),
      { merge: true },
    );
    await assertSucceeds(batch.commit());
  });

  it('denies adding a stranger as participant', async () => {
    await assertFails(send(message(), conversation({ participants: [CLIENT, OTHER] })));
  });

  it('denies a conversation whose id does not match client and professional', async () => {
    const db = env.authenticatedContext(CLIENT).firestore();
    await assertFails(setDoc(doc(db, 'conversations', `${CLIENT}_somebody`), conversation()));
  });

  it('denies oversized messages and unknown fields', async () => {
    await assertFails(send(message({ text: 'x'.repeat(5001) })));
    await assertFails(send(message({ role: 'admin' })));
  });

  it('denies a message in the name of someone else', async () => {
    await assertFails(send(message({ senderUid: OTHER })));
  });

  it('denies strangers reading or writing in the conversation', async () => {
    await assertSucceeds(send(message()));
    const { getDoc } = await import('firebase/firestore');
    const stranger = env.authenticatedContext(OTHER).firestore();
    await assertFails(getDoc(doc(stranger, 'conversations', conversationId)));
    await assertFails(
      setDoc(
        doc(stranger, 'conversations', conversationId, 'messages', 'm2'),
        message({ senderUid: OTHER }),
      ),
    );
  });

  it('lets the professional answer and mark as read', async () => {
    await assertSucceeds(send(message()));
    const db = env.authenticatedContext(PRO_UID).firestore();
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'conversations', conversationId, 'messages', 'm2'),
      message({ senderUid: PRO_UID, text: 'olá' }),
    );
    batch.update(doc(db, 'conversations', conversationId), {
      lastMessage: 'olá',
      lastMessageAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('denies changing the participants or the client of an existing conversation', async () => {
    await assertSucceeds(send(message()));
    const { updateDoc } = await import('firebase/firestore');
    const db = env.authenticatedContext(CLIENT).firestore();
    await assertFails(updateDoc(doc(db, 'conversations', conversationId), { clientUid: OTHER }));
    await assertFails(
      updateDoc(doc(db, 'conversations', conversationId), { participants: [CLIENT, OTHER] }),
    );
  });
});
