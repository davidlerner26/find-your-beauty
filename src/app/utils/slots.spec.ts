import { Availability } from '../models/professional';
import {
  busyIdsFor,
  freeStartTimes,
  isBlocked,
  isWorkingDay,
  toDateKey,
  toMinutes,
  toTime,
} from './slots';

// Monday to Friday 08:00-12:00 in 60 minute slots; Saturday and Sunday off
const availability = (overrides: Partial<Availability> = {}): Availability => ({
  slotMinutes: 60,
  weekly: {
    '0': { enabled: false, start: '08:00', end: '12:00' },
    '1': { enabled: true, start: '08:00', end: '12:00' },
    '2': { enabled: true, start: '08:00', end: '12:00' },
    '3': { enabled: true, start: '08:00', end: '12:00' },
    '4': { enabled: true, start: '08:00', end: '12:00' },
    '5': { enabled: true, start: '08:00', end: '12:00' },
    '6': { enabled: false, start: '08:00', end: '12:00' },
  },
  blockedRanges: [],
  ...overrides,
});

const MONDAY = new Date(2099, 4, 4); // 2099-05-04 is a Monday
const SATURDAY = new Date(2099, 4, 9);
const longBefore = new Date(2000, 0, 1);

describe('time helpers', () => {
  it('converts between "HH:mm" and minutes', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(toTime(510)).toBe('08:30');
    expect(toTime(toMinutes('23:05'))).toBe('23:05');
  });

  it('builds the date key with zero padding', () => {
    expect(toDateKey(new Date(2099, 0, 5))).toBe('2099-01-05');
  });
});

describe('isBlocked / isWorkingDay', () => {
  it('blocks days inside a range, ends included', () => {
    const a = availability({ blockedRanges: [{ start: '2099-05-04', end: '2099-05-06' }] });
    expect(isBlocked('2099-05-03', a)).toBe(false);
    expect(isBlocked('2099-05-04', a)).toBe(true);
    expect(isBlocked('2099-05-06', a)).toBe(true);
    expect(isBlocked('2099-05-07', a)).toBe(false);
  });

  it('still reads the old single blocked dates', () => {
    expect(isBlocked('2099-05-04', availability({ blockedDates: ['2099-05-04'] }))).toBe(true);
  });

  it('is a working day only when enabled and not blocked', () => {
    expect(isWorkingDay(MONDAY, availability())).toBe(true);
    expect(isWorkingDay(SATURDAY, availability())).toBe(false);
    const blocked = availability({ blockedRanges: [{ start: '2099-05-04', end: '2099-05-04' }] });
    expect(isWorkingDay(MONDAY, blocked)).toBe(false);
  });
});

describe('freeStartTimes', () => {
  it('lists every start that fits before closing', () => {
    expect(freeStartTimes(MONDAY, availability(), 60, new Set(), longBefore)).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
    ]);
  });

  it('needs room for the whole service', () => {
    // 2h services can't start at 11:00
    expect(freeStartTimes(MONDAY, availability(), 120, new Set(), longBefore)).toEqual([
      '08:00',
      '09:00',
      '10:00',
    ]);
  });

  it('rounds the duration up to whole slots', () => {
    expect(freeStartTimes(MONDAY, availability(), 61, new Set(), longBefore)).toHaveLength(3);
  });

  it('skips starts that overlap a taken slot', () => {
    // 2h service with 10:00 taken: 09:00 would cover 10:00, 10:00 is taken; 08:00 is free
    expect(freeStartTimes(MONDAY, availability(), 120, new Set(['10:00']), longBefore)).toEqual([
      '08:00',
    ]);
  });

  it('is empty on days off and blocked days', () => {
    expect(freeStartTimes(SATURDAY, availability(), 60, new Set(), longBefore)).toEqual([]);
  });

  it('skips times that already started today', () => {
    const now = new Date(2099, 4, 4, 9, 30);
    expect(freeStartTimes(MONDAY, availability(), 60, new Set(), now)).toEqual(['10:00', '11:00']);
  });

  it('respects other slot sizes', () => {
    const half = availability({ slotMinutes: 30 });
    expect(freeStartTimes(MONDAY, half, 60, new Set(), longBefore)).toEqual([
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
    ]);
  });
});

describe('busyIdsFor', () => {
  it('has one id per slot the service takes', () => {
    expect(busyIdsFor('2099-05-04', '09:00', 120, 60)).toEqual([
      '2099-05-04_09:00',
      '2099-05-04_10:00',
    ]);
    expect(busyIdsFor('2099-05-04', '09:00', 45, 30)).toEqual([
      '2099-05-04_09:00',
      '2099-05-04_09:30',
    ]);
  });

  it('takes at least one slot', () => {
    expect(busyIdsFor('2099-05-04', '09:00', 0, 60)).toEqual(['2099-05-04_09:00']);
  });

  it('matches the ids the Firestore rules accept (yyyy-mm-dd_HH:mm)', () => {
    for (const id of busyIdsFor('2099-05-04', '08:00', 180, 30)) {
      expect(id).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}:[0-9]{2}$/);
    }
  });
});
