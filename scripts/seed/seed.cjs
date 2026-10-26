// Creates 20 fictional makeup artists (accounts, profiles, reviews and photos) in the TEST environment.
// usage: GOOGLE_APPLICATION_CREDENTIALS=<key of find-your-beauty-dev.json> SEED_IMAGES=<folder> node scripts/seed/seed.cjs [--delete]
// SEED_IMAGES is a folder with `pool/` (photos for galleries and services) and `profile/` (0.jpg ... 19.jpg).
// It refuses to run against the production project.
const path = require('node:path');
const FN = path.join(__dirname, '..', '..', 'functions') + '/';
const req = require('node:module').createRequire(FN + 'package.json');
const { initializeApp, cert } = req('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = req('firebase-admin/firestore');
const { getAuth } = req('firebase-admin/auth');
const { getStorage } = req('firebase-admin/storage');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { P, H, REVIEWS, CLIENTS, CATALOG } = require('./data.cjs');

const key = JSON.parse(
  require('node:fs').readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', 'utf8'),
);
if (key.project_id === 'find-your-beauty-5c993') {
  console.error(
    'This script only runs in the test environment (find-your-beauty-dev), never in production.',
  );
  process.exit(1);
}
const IMAGES = process.env.SEED_IMAGES || path.join(__dirname, 'images');
const BUCKET = `${key.project_id}.firebasestorage.app`;
const PASSWORD = 'Seed@2026!';
const DOMAIN = 'seed.findyourbeauty.test';
initializeApp({ credential: cert(key), storageBucket: BUCKET });
const db = getFirestore();
const bucket = getStorage().bucket();
const uidOf = (i) => `seed-pro-${String(i + 1).padStart(2, '0')}`;
const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');

// Deterministic pseudo random, so a second run produces the same data
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const cpfFor = (i) => {
  const r = rng(i * 7919 + 11);
  const d = Array.from({ length: 9 }, () => Math.floor(r() * 10));
  if (d.every((x) => x === d[0])) d[8] = (d[8] + 1) % 10;
  const dv = (list) => {
    const n = list.length + 1;
    const s = list.reduce((a, x, k) => a + x * (n - k), 0);
    const m = (s * 10) % 11;
    return m === 10 ? 0 : m;
  };
  d.push(dv(d));
  d.push(dv(d));
  return d.join('').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

async function upload(path, file) {
  const token = randomUUID();
  await bucket.file(path).save(fs.readFileSync(file), {
    contentType: 'image/jpeg',
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function remove() {
  for (let i = 0; i < P.length; i++) {
    const uid = uidOf(i);
    for (const sub of ['reviews', 'private']) {
      const docs = await db.collection(`professionals/${uid}/${sub}`).listDocuments();
      await Promise.all(docs.map((d) => d.delete()));
    }
    await db.doc(`professionals/${uid}`).delete();
    await bucket.deleteFiles({ prefix: `professionals/${uid}/` }).catch(() => {});
    await getAuth()
      .deleteUser(uid)
      .catch(() => {});
  }
  console.log('removed', P.length);
}

async function main() {
  if (process.argv.includes('--delete')) return remove();
  const pool = fs
    .readdirSync(path.join(IMAGES, 'pool'))
    .filter((f) => f.endsWith('.jpg'))
    .sort();
  const docs = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i],
      uid = uidOf(i),
      r = rng(i + 1);
    const image = await upload(
      `professionals/${uid}/profile/work.jpg`,
      path.join(IMAGES, 'profile', `${i}.jpg`),
    );
    const galleryFiles = Array.from(
      { length: 3 + (i % 4) },
      (_, k) => pool[(i * 3 + k * 5) % pool.length],
    );
    const gallery = [];
    for (const [k, f] of galleryFiles.entries())
      gallery.push(
        await upload(`professionals/${uid}/gallery/${k}.jpg`, path.join(IMAGES, 'pool', f)),
      );

    const services = [];
    for (const [k, name] of p.services.entries()) {
      const [price, minutes, description] = CATALOG[name];
      const category = [
        'Escova',
        'Penteado para festa',
        'Penteado de noiva',
        'Cronograma capilar',
      ].includes(name)
        ? 'Cabelo'
        : 'Maquiagem';
      const value = Math.round((price * p.f) / 5) * 5;
      const photos = [];
      // Most of the services get 1 to 3 photos
      for (let n = 0; n < k % 4; n++)
        photos.push(
          await upload(
            `professionals/${uid}/services/${k}-${n}.jpg`,
            path.join(IMAGES, 'pool', pool[(i * 2 + k * 3 + n * 7) % pool.length]),
          ),
        );
      services.push({
        id: `${uid.slice(-2)}${String(k).padStart(2, '0')}`.padEnd(8, 'x'),
        name,
        category,
        price: value,
        durationMinutes: minutes,
        description,
        ...(photos.length ? { photos } : {}),
        ...(p.rules &&
        ['Maquiagem social', 'Maquiagem de noiva', 'Maquiagem para festa'].includes(name)
          ? {
              priceRules: [
                { days: [6], start: '08:00', end: '14:00', price: value + 40 },
                { days: [0], start: '07:00', end: '14:00', price: value + 60 },
              ],
            }
          : {}),
      });
    }
    const weekly = Object.fromEntries(
      Object.entries(H[p.hours]).map(([d, [on, s, e]]) => [d, { enabled: !!on, start: s, end: e }]),
    );
    const home = p.mode === 'home';
    const about = [
      `Sou maquiadora há ${p.years} anos e trabalho com ${p.spec}. Faço curso de atualização todo ano e uso produtos profissionais de linhas conhecidas, sempre com material higienizado a cada atendimento.`,
      home
        ? `Atendo no local que você escolher, no ${p.bairro} e em bairros próximos. Combine o horário e a taxa de deslocamento pelo chat.`
        : `Atendo em ${p.mode === 'both' ? 'estúdio próprio no ' + p.bairro + ' e também a domicílio' : 'estúdio próprio no ' + p.bairro}. Chame no chat para tirar dúvidas ou montar o look do seu evento.`,
    ];
    const nReviews = [0, 3, 5, 2, 7, 4, 6, 1, 0, 8][i % 10];
    const reviews = Array.from({ length: nReviews }, (_, k) => {
      const [stars, text] = REVIEWS[(i + k * 5) % REVIEWS.length];
      return {
        id: `seed-client-${i}-${k}`,
        stars,
        text,
        author: CLIENTS[(i + k * 3) % CLIENTS.length],
        daysAgo: 4 + Math.floor(r() * 85),
      };
    });
    const rating = reviews.length
      ? Math.round((reviews.reduce((a, x) => a + x.stars, 0) / reviews.length) * 10) / 10
      : 0;
    const email = `${slug(p.name)}@${DOMAIN}`;
    const address = home ? '' : `${p.addr} - ${p.bairro}, Rio de Janeiro - RJ, ${p.cep}`;
    const doc = {
      ownerUid: uid,
      name: p.name,
      email,
      phone: `(21) 90000-${String(i + 1).padStart(4, '0')}`,
      image,
      imagePosition: { x: 50, y: 40 },
      address,
      serviceMode: p.mode,
      tags: [...new Set(services.map((s) => s.category))],
      rating,
      reviewsCount: String(reviews.length),
      views: String(40 + Math.floor(r() * 900)),
      about,
      services,
      gallery,
      position: home ? { lat: 0, lng: 0 } : { lat: p.lat, lng: p.lng },
      visible: true,
      published: true,
      approved: true,
      submitted: true,
      admin: false,
      lang: 'pt',
      availability: { slotMinutes: 60, weekly, blockedRanges: [] },
      createdAt: FieldValue.serverTimestamp(),
    };
    docs.push({ uid, email, doc, reviews, cpf: cpfFor(i) });
  }

  // The profile documents come first. The welcome e-mail function looks for the e-mail of the account when the
  // document is created, and the accounts only exist after that: nothing is sent to these made up addresses.
  for (const { uid, doc, reviews, cpf } of docs) {
    await db.doc(`professionals/${uid}`).set(doc);
    await db.doc(`professionals/${uid}/private/identity`).set({ cpf });
    for (const rv of reviews) {
      await db.doc(`professionals/${uid}/reviews/${rv.id}`).set({
        clientUid: rv.id,
        author: rv.author,
        bookingId: 'seed',
        stars: rv.stars,
        text: rv.text,
        createdAt: Timestamp.fromMillis(Date.now() - rv.daysAgo * 86400000),
      });
    }
    console.log('profile', uid, doc.name);
  }
  console.log('waiting for the triggers of the new documents...');
  await new Promise((resolve) => setTimeout(resolve, 90000));
  for (const { uid, email, doc } of docs) {
    try {
      await getAuth().createUser({
        uid,
        email,
        password: PASSWORD,
        displayName: doc.name,
        emailVerified: true,
      });
    } catch (e) {
      if (e.code === 'auth/uid-already-exists')
        await getAuth().updateUser(uid, {
          email,
          password: PASSWORD,
          displayName: doc.name,
          emailVerified: true,
        });
      else throw e;
    }
    console.log('account', email);
  }
  console.log('done. password:', PASSWORD);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
