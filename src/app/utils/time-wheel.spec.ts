import { HOURS, joinTime, minuteOptions, pad2, splitTime } from './time-wheel';

describe('time wheel', () => {
  it('has the 24 hours', () => {
    expect(HOURS).toHaveLength(24);
    expect(HOURS[0]).toBe(0);
    expect(HOURS[23]).toBe(23);
  });

  it('pads with a zero', () => {
    expect(pad2(7)).toBe('07');
    expect(pad2(12)).toBe('12');
  });

  describe('splitTime', () => {
    it('reads a time', () => {
      expect(splitTime('09:30')).toEqual({ hour: 9, minute: 30 });
      expect(splitTime('9:05')).toEqual({ hour: 9, minute: 5 });
    });

    it('is 08:00 for what is not a time: an empty field opens on the usual hour', () => {
      expect(splitTime('')).toEqual({ hour: 8, minute: 0 });
      expect(splitTime('abc')).toEqual({ hour: 8, minute: 0 });
      expect(splitTime('--:--')).toEqual({ hour: 8, minute: 0 });
    });

    it('keeps inside the day', () => {
      expect(splitTime('24:00')).toEqual({ hour: 23, minute: 0 });
      expect(splitTime('10:75')).toEqual({ hour: 10, minute: 59 });
    });
  });

  it('joins hour and minute as HH:MM', () => {
    expect(joinTime(8, 0)).toBe('08:00');
    expect(joinTime(18, 30)).toBe('18:30');
  });

  describe('minuteOptions', () => {
    it('offers every 5 minutes', () => {
      const minutes = minuteOptions(30);
      expect(minutes).toHaveLength(12);
      expect(minutes[0]).toBe(0);
      expect(minutes[11]).toBe(55);
    });

    it('keeps a minute saved before that is not a multiple of 5, in its place', () => {
      const minutes = minuteOptions(7);
      expect(minutes).toHaveLength(13);
      expect(minutes.slice(0, 4)).toEqual([0, 5, 7, 10]);
    });
  });
});
