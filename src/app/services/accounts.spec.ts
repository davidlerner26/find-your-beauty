import { TestBed } from '@angular/core/testing';
import { ProfessionalAccounts } from './professional-accounts';
import { Users } from './users';

// Firestore is replaced by an in-memory recorder
const fake = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  writes: [] as {
    kind: 'set' | 'update';
    path: string;
    data: Record<string, unknown>;
    options?: unknown;
  }[],
}));

vi.mock('firebase/firestore', () => {
  const ref = (path: string, converter?: { fromFirestore: (snapshot: unknown) => unknown }) => ({
    path,
    id: path.split('/').pop(),
    converter,
    withConverter: (next: never) => ref(path, next),
  });
  return {
    getFirestore: () => ({}),
    doc: (_db: unknown, ...parts: string[]) => ref(parts.join('/')),
    serverTimestamp: () => 'SERVER_TIME',
    deleteField: () => 'DELETE_FIELD',
    getDoc: async (r: ReturnType<typeof ref>) => {
      const raw = fake.store.get(r.path);
      const snapshot = { id: r.id, data: () => raw };
      return {
        exists: () => !!raw,
        data: () => (raw && r.converter ? r.converter.fromFirestore(snapshot) : raw),
      };
    },
    setDoc: async (r: { path: string }, data: Record<string, unknown>, options?: unknown) => {
      fake.writes.push({ kind: 'set', path: r.path, data, options });
    },
    updateDoc: async (r: { path: string }, data: Record<string, unknown>) => {
      fake.writes.push({ kind: 'update', path: r.path, data });
    },
  };
});

beforeEach(() => {
  fake.store.clear();
  fake.writes.length = 0;
});

describe('Users', () => {
  const users = () => TestBed.inject(Users);
  const maria = {
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@example.com',
    phone: '(21) 99747-2878',
  };

  it('reads the profile, or null when there is none', async () => {
    expect(await users().get('u1')).toBeNull();
    fake.store.set('users/u1', { ...maria, admin: true });
    expect(await users().get('u1')).toEqual({ ...maria, admin: true });
  });

  // The Firestore rules only accept a new user with `admin: false`
  it('creates a client that is never an admin, with the language and the creation time', async () => {
    await users().create('u1', { ...maria, cpf: '529.982.247-25' });

    expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0]).toMatchObject({
      kind: 'set',
      path: 'users/u1',
      data: { ...maria, cpf: '529.982.247-25', admin: false, createdAt: 'SERVER_TIME' },
    });
    expect(['pt', 'en', 'es']).toContain(fake.writes[0].data['lang']);
  });

  it('cannot be told to create an admin', async () => {
    await users().create('u1', { ...maria, admin: true } as never);
    expect(fake.writes[0].data['admin']).toBe(false);
  });

  it('createIfMissing leaves an existing user alone', async () => {
    fake.store.set('users/u1', maria);
    expect(await users().createIfMissing('u1', maria)).toBe(false);
    expect(fake.writes).toHaveLength(0);

    expect(await users().createIfMissing('u2', maria)).toBe(true);
    expect(fake.writes.map((w) => w.path)).toEqual(['users/u2']);
  });

  it('update merges, so it also creates the document when missing', async () => {
    await users().update('u1', {
      ...maria,
      cpf: '',
      address: '',
      addressPosition: { lat: 0, lng: 0 },
    });
    expect(fake.writes[0]).toMatchObject({
      kind: 'set',
      path: 'users/u1',
      options: { merge: true },
    });
  });
});

describe('ProfessionalAccounts', () => {
  const accounts = () => TestBed.inject(ProfessionalAccounts);

  it('status is null without a professional document', async () => {
    expect(await accounts().status('p1')).toBeNull();
  });

  it('status gives the sign up state and nothing else', async () => {
    fake.store.set('professionals/p1', {
      name: 'Ana',
      cpf: 'secret',
      approved: false,
      submitted: true,
    });
    expect(await accounts().status('p1')).toEqual({
      approved: false,
      submitted: true,
      rejected: undefined,
    });
  });

  // The Firestore rules only accept a new professional with `approved: false` and no admin
  it('creates a professional waiting for approval, not published and not admin', async () => {
    await accounts().create({
      uid: 'p1',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '(21) 90000-0001',
    });

    expect(fake.writes).toHaveLength(1);
    const { kind, path, data } = fake.writes[0];
    expect([kind, path]).toEqual(['set', 'professionals/p1']);
    expect(data).toMatchObject({
      ownerUid: 'p1',
      name: 'Ana',
      email: 'ana@example.com',
      approved: false,
      submitted: false,
      admin: false,
      published: false,
      visible: true,
      rating: 0,
      services: [],
      createdAt: 'SERVER_TIME',
    });
    expect(data['availability']).toBeTruthy();
  });

  it('update saves the fields and drops the covers from before the single photo', async () => {
    await accounts().update('p1', { name: 'Ana Souza', serviceMode: null });

    expect(fake.writes[0]).toEqual({
      kind: 'update',
      path: 'professionals/p1',
      data: {
        name: 'Ana Souza',
        serviceMode: null,
        coverImage: 'DELETE_FIELD',
        coverPosition: 'DELETE_FIELD',
      },
    });
  });

  it('keeps the CPF in the private document, merging', async () => {
    expect(await accounts().getCpf('p1')).toBe('');
    fake.store.set('professionals/p1/private/identity', { cpf: '529.982.247-25' });
    expect(await accounts().getCpf('p1')).toBe('529.982.247-25');

    await accounts().saveCpf('p1', '111.444.777-35');
    expect(fake.writes[0]).toMatchObject({
      path: 'professionals/p1/private/identity',
      data: { cpf: '111.444.777-35' },
      options: { merge: true },
    });
  });
});
