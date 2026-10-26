import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';
import { Bookings } from './bookings';

// Firestore is replaced by a recorder: the tests look at what would be written
const fake = vi.hoisted(() => ({
  batches: [] as {
    sets: { path: string; data: Record<string, unknown> }[];
    updates: { path: string; data: Record<string, unknown> }[];
    deletes: string[];
    commit: ReturnType<typeof vi.fn>;
  }[],
  failNextCommit: null as Error | null,
  listeners: [] as {
    field: string;
    value: string;
    next: (snapshot: unknown) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }[],
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, ...parts: string[]) => ({ kind: 'collection', path: parts.join('/') }),
  doc: (first: { kind?: string; path?: string }, ...parts: string[]) =>
    first?.kind === 'collection'
      ? { path: `${first.path}/auto1`, id: 'auto1' }
      : { path: parts.join('/'), id: parts[parts.length - 1] },
  query: (source: unknown, condition: unknown) => ({ source, condition }),
  where: (field: string, _op: string, value: string) => ({ field, value }),
  serverTimestamp: () => 'SERVER_TIME',
  Timestamp: class {},
  onSnapshot: (q: { condition: { field: string; value: string } }, next: never) => {
    const unsubscribe = vi.fn();
    fake.listeners.push({ ...q.condition, next, unsubscribe });
    return unsubscribe;
  },
  writeBatch: () => {
    const batch = {
      sets: [] as { path: string; data: Record<string, unknown> }[],
      updates: [] as { path: string; data: Record<string, unknown> }[],
      deletes: [] as string[],
      commit: vi.fn(async () => {
        const failure = fake.failNextCommit;
        fake.failNextCommit = null;
        if (failure) throw failure;
      }),
      set: (ref: { path: string }, data: Record<string, unknown>) =>
        batch.sets.push({ path: ref.path, data }),
      update: (ref: { path: string }, data: Record<string, unknown>) =>
        batch.updates.push({ path: ref.path, data }),
      delete: (ref: { path: string }) => batch.deletes.push(ref.path),
    };
    fake.batches.push(batch);
    return batch;
  },
}));

type Role = 'client' | 'professional' | null;

const setup = (uid: string | null, role: Role, displayName: string | null = 'Maria') => {
  const auth = {
    user: signal(uid ? { uid, displayName, email: 'maria@example.com' } : null),
    role: signal<Role>(role),
  };
  TestBed.configureTestingModule({ providers: [{ provide: Auth, useValue: auth }] });
  const bookings = TestBed.inject(Bookings);
  TestBed.tick();
  return { auth, bookings };
};

const newBooking = {
  professionalId: 'pro1',
  professionalUid: 'proUid',
  professionalName: 'Ana',
  services: [{ id: 's1', name: 'Corte', price: 80, durationMinutes: 120 }],
  startsAt: new Date(2099, 4, 4, 9, 0),
  durationMinutes: 120,
  total: 80,
  notes: '',
  busyIds: ['2099-05-04_09:00', '2099-05-04_10:00'],
  place: 'studio' as const,
  paymentStatus: 'pending' as const,
};

beforeEach(() => {
  fake.batches.length = 0;
  fake.listeners.length = 0;
  fake.failNextCommit = null;
});

describe('Bookings.create', () => {
  it('needs a signed in user', async () => {
    const { bookings } = setup(null, null);
    await expect(bookings.create(newBooking)).rejects.toThrow('not-authenticated');
    expect(fake.batches).toHaveLength(0);
  });

  it('writes the booking and one busy slot per busyId in a single batch', async () => {
    const { bookings } = setup('client1', 'client');
    const id = await bookings.create(newBooking);

    expect(id).toBe('auto1');
    expect(fake.batches).toHaveLength(1);
    const [batch] = fake.batches;
    expect(batch.commit).toHaveBeenCalledOnce();
    expect(batch.sets.map((s) => s.path)).toEqual([
      'professionals/pro1/busy/2099-05-04_09:00',
      'professionals/pro1/busy/2099-05-04_10:00',
      'bookings/auto1',
    ]);
  });

  // The Firestore rules check each slot against this booking (getAfter): see rules-tests
  it('ties every slot to the booking, with the fields the rules accept', async () => {
    const { bookings } = setup('client1', 'client');
    await bookings.create(newBooking);

    const slots = fake.batches[0].sets.filter((s) => s.path.includes('/busy/'));
    for (const slot of slots) {
      expect(slot.data).toEqual({
        date: '2099-05-04',
        clientUid: 'client1',
        bookingId: 'auto1',
      });
    }
  });

  it('creates the booking as pending, in the name of the user', async () => {
    const { bookings } = setup('client1', 'client', 'Maria Silva');
    await bookings.create(newBooking);

    const booking = fake.batches[0].sets.find((s) => s.path === 'bookings/auto1')!.data;
    expect(booking).toMatchObject({
      clientUid: 'client1',
      clientName: 'Maria Silva',
      status: 'pending',
      professionalId: 'pro1',
      total: 80,
      createdAt: 'SERVER_TIME',
    });
    expect(['pt', 'en', 'es']).toContain(booking['lang']);
  });

  it('names the client by e-mail when there is no display name', async () => {
    const { bookings } = setup('client1', 'client', null);
    await bookings.create(newBooking);
    expect(fake.batches[0].sets.find((s) => s.path === 'bookings/auto1')!.data['clientName']).toBe(
      'maria@example.com',
    );
  });

  it('rejects with the original error when the batch fails (a taken slot), so the page can say so', async () => {
    const { bookings } = setup('client1', 'client');
    const denied = Object.assign(new Error('denied'), { code: 'permission-denied' });
    fake.failNextCommit = denied;

    await expect(bookings.create(newBooking)).rejects.toBe(denied);
  });
});

describe('Bookings.cancel and setStatus', () => {
  const booking = {
    ...newBooking,
    id: 'b1',
    clientUid: 'client1',
    clientName: 'Maria',
    status: 'pending' as const,
  };

  it('cancelling marks the booking and frees all its slots', async () => {
    const { bookings } = setup('client1', 'client');
    await bookings.cancel(booking);

    const [batch] = fake.batches;
    expect(batch.updates).toEqual([
      { path: 'bookings/b1', data: { status: 'cancelled', updatedAt: 'SERVER_TIME' } },
    ]);
    expect(batch.deletes).toEqual([
      'professionals/pro1/busy/2099-05-04_09:00',
      'professionals/pro1/busy/2099-05-04_10:00',
    ]);
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it.each(['declined', 'cancelledByProfessional'] as const)(
    'the professional setting %s frees the slots',
    async (status) => {
      const { bookings } = setup('proUid', 'professional');
      await bookings.setStatus(booking, status);

      expect(fake.batches[0].updates[0].data['status']).toBe(status);
      expect(fake.batches[0].deletes).toHaveLength(2);
    },
  );

  it.each(['confirmed', 'completed'] as const)(
    'the professional setting %s keeps the slots',
    async (status) => {
      const { bookings } = setup('proUid', 'professional');
      await bookings.setStatus(booking, status);

      expect(fake.batches[0].updates[0].data['status']).toBe(status);
      expect(fake.batches[0].deletes).toEqual([]);
    },
  );

  it('does nothing for a booking without id', async () => {
    const { bookings } = setup('client1', 'client');
    await bookings.cancel({ ...booking, id: undefined });
    await bookings.setStatus({ ...booking, id: undefined }, 'confirmed');
    expect(fake.batches).toHaveLength(0);
  });
});

describe('Bookings listeners', () => {
  const snapshotOf = (...days: number[]) => ({
    docs: days.map((day) => ({
      id: `b${day}`,
      data: () => ({ startsAt: { toDate: () => new Date(2099, 4, day) }, status: 'pending' }),
    })),
  });

  it('a client listens to its own bookings only, not to the received ones', () => {
    setup('client1', 'client');
    expect(fake.listeners.map((l) => [l.field, l.value])).toEqual([['clientUid', 'client1']]);
  });

  it('a professional listens to the requests it received', () => {
    setup('proUid', 'professional');
    expect(fake.listeners.map((l) => [l.field, l.value])).toEqual([['professionalUid', 'proUid']]);
  });

  it('does not listen to anything while signed out', () => {
    const { bookings } = setup(null, null);
    expect(fake.listeners).toHaveLength(0);
    expect(bookings.mine()).toEqual([]);
    expect(bookings.mineLoading()).toBe(false);
  });

  it('sorts bookings by date and stops loading', () => {
    const { bookings } = setup('client1', 'client');
    fake.listeners[0].next(snapshotOf(9, 2, 5));

    expect(bookings.mine().map((b) => b.id)).toEqual(['b2', 'b5', 'b9']);
    expect(bookings.mineLoading()).toBe(false);
  });

  it('stops listening and clears the list when the user signs out', () => {
    const { auth, bookings } = setup('client1', 'client');
    fake.listeners[0].next(snapshotOf(2));
    expect(bookings.mine()).toHaveLength(1);

    auth.user.set(null);
    TestBed.tick();

    expect(fake.listeners[0].unsubscribe).toHaveBeenCalled();
    expect(bookings.mine()).toEqual([]);
  });
});
