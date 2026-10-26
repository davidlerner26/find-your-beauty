// The one stand-in for `firebase/firestore` that the unit tests share. The tests of this project run in the same
// module registry, so two files that each mocked the package their own way took turns winning, depending on the
// order of the files. With one fake that is the same for everyone, there is nothing to win.
//
// A spec uses it like this:
//   vi.mock('firebase/firestore', async () => (await import('../../testing/firestore-fake')).firestoreModule());
//   import { firestoreFake } from '../../testing/firestore-fake';
// and calls `firestoreFake.reset()` in beforeEach.

type Data = Record<string, unknown>;
type Converter = { fromFirestore: (snapshot: unknown) => unknown };
type Ref = {
  path: string;
  id: string;
  converter?: Converter;
  withConverter: (converter: Converter) => Ref;
};
type Batch = {
  sets: { path: string; data: Data }[];
  updates: { path: string; data: Data }[];
  deletes: string[];
  commit: () => Promise<void>;
  set: (ref: { path: string }, data: Data) => number;
  update: (ref: { path: string }, data: Data) => number;
  delete: (ref: { path: string }) => number;
};

export const firestoreFake = {
  // Documents that can be read, by path
  store: new Map<string, Data>(),
  // setDoc and updateDoc, in order
  writes: [] as { kind: 'set' | 'update'; path: string; data: Data; options?: unknown }[],
  batches: [] as (Batch & { commit: ReturnType<typeof vi.fn> })[],
  // The listeners of onSnapshot
  listeners: [] as {
    field: string;
    value: string;
    next: (snapshot: unknown) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }[],
  // The next batch to be committed fails with this
  failNextCommit: null as Error | null,

  reset() {
    this.store.clear();
    this.writes.length = 0;
    this.batches.length = 0;
    this.listeners.length = 0;
    this.failNextCommit = null;
  },
};

const ref = (path: string, converter?: Converter): Ref => ({
  path,
  id: path.split('/').pop() ?? '',
  converter,
  withConverter: (next) => ref(path, next),
});

// The functions of `firebase/firestore` that the services use
export const firestoreModule = () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, ...parts: string[]) => ({
    kind: 'collection',
    path: parts.join('/'),
    withConverter: () => ({ kind: 'collection', path: parts.join('/') }),
  }),
  // doc(db, ...path), or doc(collection) for a document with a made up id
  doc: (first: { kind?: string; path?: string }, ...parts: string[]) =>
    first?.kind === 'collection' ? ref(`${first.path}/auto1`) : ref(parts.join('/')),
  query: (source: unknown, condition: unknown) => ({ source, condition }),
  where: (field: string, _op: string, value: string) => ({ field, value }),
  orderBy: () => ({}),
  serverTimestamp: () => 'SERVER_TIME',
  deleteField: () => 'DELETE_FIELD',
  Timestamp: class {},
  getDoc: async (r: Ref) => {
    const raw = firestoreFake.store.get(r.path);
    const snapshot = { id: r.id, data: () => raw };
    return {
      exists: () => !!raw,
      data: () => (raw && r.converter ? r.converter.fromFirestore(snapshot) : raw),
    };
  },
  setDoc: async (r: { path: string }, data: Data, options?: unknown) => {
    firestoreFake.writes.push({ kind: 'set', path: r.path, data, options });
  },
  updateDoc: async (r: { path: string }, data: Data) => {
    firestoreFake.writes.push({ kind: 'update', path: r.path, data });
  },
  onSnapshot: (q: { condition: { field: string; value: string } }, next: never) => {
    const unsubscribe = vi.fn();
    firestoreFake.listeners.push({ ...q.condition, next, unsubscribe });
    return unsubscribe;
  },
  writeBatch: () => {
    const batch: Batch & { commit: ReturnType<typeof vi.fn> } = {
      sets: [],
      updates: [],
      deletes: [],
      commit: vi.fn(async () => {
        const failure = firestoreFake.failNextCommit;
        firestoreFake.failNextCommit = null;
        if (failure) throw failure;
      }),
      set: (r, data) => batch.sets.push({ path: r.path, data }),
      update: (r, data) => batch.updates.push({ path: r.path, data }),
      delete: (r) => batch.deletes.push(r.path),
    };
    firestoreFake.batches.push(batch);
    return batch;
  },
});
