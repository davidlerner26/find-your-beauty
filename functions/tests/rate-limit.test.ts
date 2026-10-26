import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { checkEmailCode, MAX_ATTEMPTS } from '../src/email-code';
import { clientIp, hit } from '../src/rate-limit';

// Runs against the Firestore emulator (npm run test:functions)
initializeApp({ projectId: 'demo-find-your-beauty' });
const db = getFirestore();

const clearAll = async () => {
  const response = await fetch(
    `http://${process.env['FIRESTORE_EMULATOR_HOST']}/emulator/v1/projects/demo-find-your-beauty/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  expect(response.ok).toBe(true);
};

beforeAll(clearAll);
beforeEach(clearAll);

describe('hit (rate limit)', () => {
  const limit = { scope: 'test', key: 'a@b.com', max: 3, windowSeconds: 60 };

  it('allows up to max hits in the window, then refuses', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hit(db, limit, 1_000));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('starts a new window after it expires', async () => {
    for (let i = 0; i < 3; i++) await hit(db, limit, 1_000);
    expect(await hit(db, limit, 1_000 + 59_000)).toBe(false);
    expect(await hit(db, limit, 1_000 + 60_000)).toBe(true);
  });

  it('counts each scope and key on its own', async () => {
    for (let i = 0; i < 3; i++) await hit(db, limit, 1_000);
    expect(await hit(db, { ...limit, key: 'other@b.com' }, 1_000)).toBe(true);
    expect(await hit(db, { ...limit, scope: 'other' }, 1_000)).toBe(true);
  });

  it('does not let parallel calls pass the limit', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => hit(db, limit, 1_000)));
    expect(results.filter(Boolean)).toHaveLength(3);
  });

  it('stores only a hash of the key', async () => {
    await hit(db, limit, 1_000);
    const docs = await db.collection('rateLimits').get();
    expect(docs.size).toBe(1);
    expect(JSON.stringify(docs.docs[0].data())).not.toContain('a@b.com');
    expect(docs.docs[0].id).not.toContain('a@b.com');
  });
});

describe('checkEmailCode', () => {
  const seed = (overrides = {}) =>
    db.doc('emailCodes/u1').set({ hash: 'right', expiresAt: 10_000, attempts: 0, ...overrides });

  it('accepts the right code once and deletes it', async () => {
    await seed();
    expect(await checkEmailCode(db, 'u1', 'right', 5_000)).toBe('ok');
    expect(await checkEmailCode(db, 'u1', 'right', 5_000)).toBe('expired');
  });

  it('counts wrong guesses and locks after MAX_ATTEMPTS, even for the right code', async () => {
    await seed();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(await checkEmailCode(db, 'u1', 'nope', 5_000)).toBe('wrong');
    }
    expect(await checkEmailCode(db, 'u1', 'right', 5_000)).toBe('expired');
  });

  it('does not let parallel guesses get past MAX_ATTEMPTS', async () => {
    await seed();
    const results = await Promise.all(
      Array.from({ length: 30 }, () => checkEmailCode(db, 'u1', 'nope', 5_000)),
    );
    expect(results.filter((r) => r === 'wrong')).toHaveLength(MAX_ATTEMPTS);
  });

  it('treats an expired or missing code as expired', async () => {
    await seed();
    expect(await checkEmailCode(db, 'u1', 'right', 10_001)).toBe('expired');
    expect(await checkEmailCode(db, 'nobody', 'right', 5_000)).toBe('expired');
  });
});

describe('clientIp', () => {
  it('prefers the IP of the request, then the first forwarded address', () => {
    expect(clientIp({ rawRequest: { ip: '1.1.1.1' } })).toBe('1.1.1.1');
    expect(clientIp({ rawRequest: { headers: { 'x-forwarded-for': '2.2.2.2, 3.3.3.3' } } })).toBe(
      '2.2.2.2',
    );
    expect(clientIp({})).toBe('');
  });
});
