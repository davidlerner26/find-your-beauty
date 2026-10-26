import { monthDays, startOfDay, startOfMonth } from './calendar';

describe('startOfDay / startOfMonth', () => {
  it('drops the time and the day', () => {
    expect(startOfDay(new Date(2099, 4, 4, 15, 30)).getTime()).toBe(new Date(2099, 4, 4).getTime());
    expect(startOfMonth(new Date(2099, 4, 20)).getTime()).toBe(new Date(2099, 4, 1).getTime());
  });
});

describe('monthDays', () => {
  it('has one entry per day of the month, numbered from 1', () => {
    const days = monthDays(new Date(2099, 4, 1), () => false);
    expect(days).toHaveLength(31);
    expect(days[0].number).toBe(1);
    expect(days[30].number).toBe(31);
    expect(days[0].date.getTime()).toBe(new Date(2099, 4, 1).getTime());
  });

  it('knows the length of short months and leap years', () => {
    expect(monthDays(new Date(2099, 1, 1), () => false)).toHaveLength(28);
    expect(monthDays(new Date(2096, 1, 1), () => false)).toHaveLength(29);
    expect(monthDays(new Date(2099, 3, 1), () => false)).toHaveLength(30);
  });

  it('disables the days the callback refuses', () => {
    const days = monthDays(new Date(2099, 4, 1), (date) => date.getDay() === 0);
    expect(days.filter((day) => day.disabled).map((day) => day.number)).toEqual([
      3, 10, 17, 24, 31,
    ]);
  });

  it('labels the weekday without a dot (Portuguese build)', () => {
    // 2099-05-04 is a Monday
    const days = monthDays(new Date(2099, 4, 1), () => false);
    expect(days[3].weekday).toBe('seg');
    expect(days.every((day) => !day.weekday.includes('.'))).toBe(true);
  });
});
