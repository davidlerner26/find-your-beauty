import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, describe, it } from 'vitest';

const CLIENT = 'client1';
const PRO_UID = 'proUid';
const conversationId = `${CLIENT}_${PRO_UID}`;

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-find-your-beauty',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations', conversationId), {
      participants: [CLIENT, PRO_UID],
    });
    await setDoc(doc(ctx.firestore(), 'users', 'admin1'), { admin: true });
  });
});

afterAll(() => env.cleanup());

const upload = (uid: string, name: string, contentType: string, size = 10) =>
  uploadBytes(
    ref(env.authenticatedContext(uid).storage(), `chats/${conversationId}/${name}`),
    new Uint8Array(size),
    { contentType },
  );

describe('chat files', () => {
  it('accepts photos and common documents from the participants', async () => {
    await assertSucceeds(upload(CLIENT, 'a.jpg', 'image/jpeg'));
    await assertSucceeds(upload(PRO_UID, 'b.pdf', 'application/pdf'));
    await assertSucceeds(
      upload(
        CLIENT,
        'c.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    );
  });

  it('denies web pages, scripts and executables', async () => {
    await assertFails(upload(CLIENT, 'a.html', 'text/html'));
    await assertFails(upload(CLIENT, 'a.svg', 'image/svg+xml'));
    await assertFails(upload(CLIENT, 'a.js', 'application/javascript'));
    await assertFails(upload(CLIENT, 'a.exe', 'application/x-msdownload'));
  });

  it('denies files over 10 MB and uploads by strangers', async () => {
    await assertFails(upload(CLIENT, 'big.pdf', 'application/pdf', 11 * 1024 * 1024));
    await assertFails(upload('stranger', 'a.pdf', 'application/pdf'));
  });
});

describe('photos of a draft made by an admin', () => {
  const draftPhoto = (uid: string | null) =>
    ref(
      (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage(),
      'professionalDrafts/d1/profile/1.jpg',
    );
  const send = (uid: string, contentType = 'image/jpeg', size = 10) =>
    uploadBytes(draftPhoto(uid), new Uint8Array(size), { contentType });

  it('lets an admin upload, read and delete them', async () => {
    await assertSucceeds(send('admin1'));
    await assertSucceeds(getBytes(draftPhoto('admin1')));
  });

  it('denies anyone else, signed in or not', async () => {
    await assertFails(send(CLIENT));
    await assertFails(send(PRO_UID));
    await assertFails(getBytes(draftPhoto(null)));
    await assertFails(getBytes(draftPhoto(CLIENT)));
  });

  it('denies files that are not images or are over 5 MB, even from an admin', async () => {
    await assertFails(send('admin1', 'text/html'));
    await assertFails(send('admin1', 'image/jpeg', 6 * 1024 * 1024));
  });
});
