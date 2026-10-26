import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
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
