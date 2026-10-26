import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { setLogSink } from '../utils/log';
import { Auth } from './auth';
import { Cards } from './cards';
import { PAYMENTS } from './payments';
import { PaymentsApi, SavedCard } from './payments.types';

const card = (id: string, last4: string): SavedCard => ({
  id,
  brand: 'visa',
  last4,
  expMonth: 12,
  expYear: 2099,
});

const setup = (options: { signedIn?: boolean; available?: boolean; saved?: SavedCard[] } = {}) => {
  const { signedIn = true, available = true, saved = [] } = options;
  const payments = {
    available,
    cards: vi.fn(async () => saved),
    removeCard: vi.fn(async () => undefined),
  } as unknown as PaymentsApi;
  const user = signal(signedIn ? { uid: 'u1' } : null);

  TestBed.configureTestingModule({
    providers: [
      { provide: PAYMENTS, useValue: payments },
      { provide: Auth, useValue: { user } },
    ],
  });
  return { cards: TestBed.inject(Cards), payments, user };
};

beforeEach(() => setLogSink(() => undefined));
afterEach(() => setLogSink(null));

describe('Cards', () => {
  it('loads the cards, and the first one (the latest saved) is the chosen one', async () => {
    const { cards } = setup({ saved: [card('a', '4242'), card('b', '1111')] });
    expect(cards.selected()).toBeNull();

    await cards.load();
    expect(cards.list()).toHaveLength(2);
    expect(cards.selected()?.id).toBe('a');
  });

  it('keeps the card the client chose', async () => {
    const { cards } = setup({ saved: [card('a', '4242'), card('b', '1111')] });
    await cards.load();
    cards.select('b');
    expect(cards.selected()?.last4).toBe('1111');
  });

  it('falls back to the first card when the chosen one is gone', async () => {
    const { cards } = setup({ saved: [card('a', '4242'), card('b', '1111')] });
    await cards.load();
    cards.select('b');
    await cards.remove('b');

    expect(cards.list().map((c) => c.id)).toEqual(['a']);
    expect(cards.selected()?.id).toBe('a');
  });

  it('asks nothing where there are no payments or nobody is signed in', async () => {
    const off = setup({ available: false });
    await off.cards.load();
    expect(off.payments.cards).not.toHaveBeenCalled();
  });

  it('does not ask when signed out', async () => {
    const out = setup({ signedIn: false });
    await out.cards.load();
    expect(out.payments.cards).not.toHaveBeenCalled();
  });

  it('says so when the cards cannot be loaded', async () => {
    const { cards, payments } = setup();
    (payments.cards as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'));
    await cards.load();

    expect(cards.failed()).toBe(true);
    expect(cards.loading()).toBe(false);
  });

  it('forgets the cards when the client signs out, so the next person does not see them', async () => {
    const { cards, user } = setup({ saved: [card('a', '4242')] });
    await cards.load();
    TestBed.tick();
    expect(cards.list()).toHaveLength(1);

    user.set(null);
    TestBed.tick();
    expect(cards.list()).toEqual([]);
    expect(cards.selected()).toBeNull();
  });
});
