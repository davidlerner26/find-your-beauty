import { durationToText, maskDuration, parseDuration } from './duration';

describe('maskDuration', () => {
  it('fills digits from the right like a clock', () => {
    expect(maskDuration('')).toBe('');
    expect(maskDuration('1')).toBe('0:01');
    expect(maskDuration('13')).toBe('0:13');
    expect(maskDuration('130')).toBe('1:30');
    expect(maskDuration('1230')).toBe('12:30');
  });

  it('keeps at most 4 digits', () => {
    expect(maskDuration('12345')).toBe('12:34');
  });
});

describe('parseDuration', () => {
  it('turns H:MM into minutes', () => {
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('0:45')).toBe(45);
    expect(parseDuration('12:00')).toBe(720);
  });

  it('is null for empty text or minutes of 60 or more', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('1:75')).toBeNull();
    expect(parseDuration('90')).toBeNull();
    expect(parseDuration('1:5')).toBeNull();
  });
});

describe('durationToText', () => {
  it('turns minutes into H:MM', () => {
    expect(durationToText(90)).toBe('1:30');
    expect(durationToText(5)).toBe('0:05');
    expect(durationToText(120)).toBe('2:00');
  });

  it('round trips with parseDuration', () => {
    for (const minutes of [5, 45, 60, 90, 205]) {
      expect(parseDuration(durationToText(minutes))).toBe(minutes);
    }
  });
});
