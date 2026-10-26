import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ADMIN, CLIENT, CLIENT2, PASSWORD, PRO, PRO_HOME } from './data';

export const PROJECT_ID = 'demo-find-your-beauty';

const requireEmulators = () => {
  for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
    if (!process.env[name]) {
      throw new Error(
        `${name} is not set: run the tests with "npm run e2e" (it starts the emulators)`,
      );
    }
  }
};

// Empties both emulators, so every run starts from the same data
const clearEmulators = async () => {
  await fetch(
    `http://${process.env['FIRESTORE_EMULATOR_HOST']}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' },
  );
};

// Small pictures that need no network: a professional with a photo and a gallery behaves like a real one
const picture = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="${color}"/></svg>`,
  )}`;

const week = (enabled: boolean) =>
  Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((day) => [day, { enabled, start: '08:00', end: '20:00' }]),
  );

const professional = (uid: string, name: string, email: string, mode: 'studio' | 'home') => ({
  ownerUid: uid,
  name,
  email,
  phone: '(21) 90000-0001',
  image: picture('#c98b9e'),
  imagePosition: { x: 50, y: 40 },
  address: mode === 'home' ? '' : 'Rua das Flores, 100 - Botafogo, Rio de Janeiro - RJ, 22250-040',
  serviceMode: mode,
  tags: ['Maquiagem'],
  rating: 4.5,
  reviewsCount: '2',
  views: '10',
  about: [`${name} faz maquiagem há anos.`],
  services: [
    {
      id: `${uid.slice(-1)}-svc-1`,
      name: PRO.service,
      category: 'Maquiagem',
      price: PRO.price,
      durationMinutes: 60,
      description: 'Maquiagem para o dia a dia.',
    },
  ],
  gallery: [picture('#8bb7c9'), picture('#b7c98b')],
  position: mode === 'home' ? { lat: 0, lng: 0 } : { lat: -22.9519, lng: -43.1837 },
  visible: true,
  published: true,
  approved: true,
  submitted: true,
  admin: false,
  lang: 'pt',
  availability: { slotMinutes: 60, weekly: week(true), blockedRanges: [] },
  createdAt: FieldValue.serverTimestamp(),
});

export async function seed() {
  requireEmulators();
  await clearEmulators();

  if (!getApps().length) initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const auth = getAuth();

  const accounts = [
    { uid: PRO.uid, email: PRO.email, displayName: PRO.name },
    { uid: PRO_HOME.uid, email: PRO_HOME.email, displayName: PRO_HOME.name },
    { uid: CLIENT.uid, email: CLIENT.email, displayName: `${CLIENT.firstName} ${CLIENT.lastName}` },
    {
      uid: CLIENT2.uid,
      email: CLIENT2.email,
      displayName: `${CLIENT2.firstName} ${CLIENT2.lastName}`,
    },
    { uid: ADMIN.uid, email: ADMIN.email, displayName: 'Admin' },
  ];
  for (const account of accounts) {
    await auth.createUser({ ...account, password: PASSWORD, emailVerified: true });
  }

  await db
    .doc(`professionals/${PRO.uid}`)
    .set(professional(PRO.uid, PRO.name, PRO.email, 'studio'));
  await db
    .doc(`professionals/${PRO_HOME.uid}`)
    .set(professional(PRO_HOME.uid, PRO_HOME.name, PRO_HOME.email, 'home'));

  for (const client of [CLIENT, CLIENT2]) {
    await db.doc(`users/${client.uid}`).set({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: '(21) 99747-2878',
      cpf: '529.982.247-25',
      address: 'Rua Teste, 10 - Centro, Rio de Janeiro - RJ',
      addressPosition: { lat: -22.9068, lng: -43.1729 },
    });
  }
  await db.doc(`users/${ADMIN.uid}`).set({
    firstName: 'Admin',
    lastName: 'E2E',
    email: ADMIN.email,
    phone: '(21) 90000-0000',
    admin: true,
  });
}
