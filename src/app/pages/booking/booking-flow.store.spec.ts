import { TestBed } from '@angular/core/testing';
import { Availability } from '../../models/professional';
import { Professionals } from '../../services/professionals';
import { setLogSink } from '../../utils/log';
import { BookingFlowStore } from './booking-flow.store';

// Monday to Friday 08:00-12:00 in 60 minute slots; the weekend is off
const availability: Availability = {
  slotMinutes: 60,
  weekly: Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((day) => [
      day,
      { enabled: day >= 1 && day <= 5, start: '08:00', end: '12:00' },
    ]),
  ),
  blockedRanges: [],
};

const context = (durationMinutes = 60) => ({
  professionalId: 'pro1',
  availability,
  durationMinutes,
});

// A promise that is settled by the test
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

const busyTimes = vi.fn();
const busyFrom = vi.fn();

// "Today" is Monday 2099-05-04, 10:00
const setup = () => {
  TestBed.configureTestingModule({
    providers: [BookingFlowStore, { provide: Professionals, useValue: { busyTimes, busyFrom } }],
  });
  const store = TestBed.inject(BookingFlowStore);
  store.setContext(context());
  TestBed.tick();
  return store;
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  TestBed.tick();
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2099, 4, 4, 10, 0));
  busyTimes.mockReset().mockResolvedValue(new Set());
  busyFrom.mockReset().mockResolvedValue(new Map());
  setLogSink(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  setLogSink(null);
});

describe('BookingFlowStore days', () => {
  it('shows the current month, with the past and the days off disabled', () => {
    const store = setup();
    expect(store.isCurrentMonth()).toBe(true);
    expect(store.days()).toHaveLength(31);

    const disabled = store
      .days()
      .filter((day) => day.disabled)
      .map((day) => day.number);
    // Past days (1-3) and the weekends (2-3, 9-10, 16-17, 23-24, 30-31)
    expect(disabled).toEqual([1, 2, 3, 9, 10, 16, 17, 23, 24, 30, 31]);
  });

  it('today is not disabled', () => {
    expect(
      setup()
        .days()
        .find((day) => day.number === 4)!.disabled,
    ).toBe(false);
  });

  it('moves between months and clears the day', () => {
    const store = setup();
    store.pickDay(new Date(2099, 4, 5));
    store.changeMonth(1);

    expect(store.isCurrentMonth()).toBe(false);
    expect(store.selectedDay()).toBeNull();
    expect(store.days()).toHaveLength(30);
    store.changeMonth(-1);
    expect(store.isCurrentMonth()).toBe(true);
  });
});

describe('BookingFlowStore times', () => {
  it('offers nothing until a day is picked', () => {
    const store = setup();
    expect(store.times()).toEqual([]);
    expect(store.loadingTimes()).toBe(false);
  });

  it('loads the taken slots of the day and offers the free ones', async () => {
    busyTimes.mockResolvedValue(new Set(['09:00']));
    const store = setup();
    store.pickDay(new Date(2099, 4, 5));
    TestBed.tick();

    expect(store.loadingTimes()).toBe(true);
    expect(store.times()).toEqual([]);

    await flush();
    expect(busyTimes).toHaveBeenCalledWith('pro1', '2099-05-05');
    expect(store.loadingTimes()).toBe(false);
    expect(store.times()).toEqual(['08:00', '10:00', '11:00']);
  });

  it('needs room for the whole service', async () => {
    const store = setup();
    store.setContext(context(120));
    store.pickDay(new Date(2099, 4, 5));
    TestBed.tick();
    await flush();
    expect(store.times()).toEqual(['08:00', '09:00', '10:00']);
  });

  it('does not offer the hours of today that already passed', async () => {
    const store = setup();
    store.pickDay(new Date(2099, 4, 4));
    TestBed.tick();
    await flush();
    expect(store.times()).toEqual(['11:00']);
  });

  it('forgets the time when the day changes', async () => {
    const store = setup();
    store.pickDay(new Date(2099, 4, 5));
    TestBed.tick();
    await flush();
    store.pickTime('10:00');
    expect(store.selectedTime()).toBe('10:00');

    store.pickDay(new Date(2099, 4, 6));
    TestBed.tick();
    expect(store.selectedTime()).toBeNull();
  });

  it('ignores a late answer for a day that is no longer the picked one', async () => {
    const first = deferred<Set<string>>();
    busyTimes.mockReturnValueOnce(first.promise).mockResolvedValueOnce(new Set(['08:00']));
    const store = setup();

    store.pickDay(new Date(2099, 4, 5));
    TestBed.tick();
    store.pickDay(new Date(2099, 4, 6));
    TestBed.tick();
    await flush();
    expect(store.times()).toEqual(['09:00', '10:00', '11:00']);

    // The answer of the first day arrives last and must not replace the second
    first.resolve(new Set(['09:00', '10:00', '11:00']));
    await flush();
    expect(store.times()).toEqual(['09:00', '10:00', '11:00']);
  });

  it('offers every time when the taken slots cannot be loaded', async () => {
    busyTimes.mockRejectedValue(new Error('offline'));
    const store = setup();
    store.pickDay(new Date(2099, 4, 5));
    TestBed.tick();
    await flush();
    expect(store.times()).toHaveLength(4);
  });
});

describe('BookingFlowStore pickNextAvailableDay', () => {
  it('picks today when it still has a free time', async () => {
    const store = setup();
    expect(await store.pickNextAvailableDay()).toEqual(new Date(2099, 4, 4));
    expect(store.selectedDay()).toEqual(new Date(2099, 4, 4));
  });

  it('skips days that are full and days off, and shows the month of the day', async () => {
    // Today has only 11:00 left and it is taken; Tuesday to Friday are full; the weekend is off
    busyFrom.mockResolvedValue(
      new Map(
        ['2099-05-04', '2099-05-05', '2099-05-06', '2099-05-07', '2099-05-08'].map((date) => [
          date,
          new Set(['08:00', '09:00', '10:00', '11:00']),
        ]),
      ),
    );
    const store = setup();
    const day = await store.pickNextAvailableDay();

    expect(day).toEqual(new Date(2099, 4, 11));
    expect(busyFrom).toHaveBeenCalledWith('pro1', '2099-05-04');
  });

  it('shows the next month when the rest of this one is full', async () => {
    busyFrom.mockResolvedValue(
      new Map(
        Array.from({ length: 28 }, (_, i) => [
          `2099-05-${String(i + 4).padStart(2, '0')}`,
          new Set(['08:00', '09:00', '10:00', '11:00']),
        ]),
      ),
    );
    const store = setup();
    await store.pickNextAvailableDay();

    expect(store.selectedDay()).toEqual(new Date(2099, 5, 1));
    expect(store.isCurrentMonth()).toBe(false);
  });

  it('still finds a day when the busy days cannot be loaded', async () => {
    busyFrom.mockRejectedValue(new Error('offline'));
    const store = setup();
    expect(await store.pickNextAvailableDay()).toEqual(new Date(2099, 4, 4));
  });

  it('does nothing before the professional is known', async () => {
    TestBed.configureTestingModule({
      providers: [BookingFlowStore, { provide: Professionals, useValue: { busyTimes, busyFrom } }],
    });
    const store = TestBed.inject(BookingFlowStore);
    expect(await store.pickNextAvailableDay()).toBeNull();
    expect(busyFrom).not.toHaveBeenCalled();
  });

  // The page looks the day up while the user may already be using the calendar
  it('does not take over a day the user picked while it was loading', async () => {
    const loading = deferred<Map<string, Set<string>>>();
    busyFrom.mockReturnValue(loading.promise);
    const store = setup();

    const picking = store.pickNextAvailableDay();
    store.pickDay(new Date(2099, 4, 20));
    loading.resolve(new Map());

    expect(await picking).toBeNull();
    expect(store.selectedDay()).toEqual(new Date(2099, 4, 20));
  });

  it('does not bring the user back to this month after they went to another', async () => {
    const loading = deferred<Map<string, Set<string>>>();
    busyFrom.mockReturnValue(loading.promise);
    const store = setup();

    const picking = store.pickNextAvailableDay();
    store.changeMonth(1);
    loading.resolve(new Map());

    expect(await picking).toBeNull();
    expect(store.isCurrentMonth()).toBe(false);
    expect(store.selectedDay()).toBeNull();
  });
});
