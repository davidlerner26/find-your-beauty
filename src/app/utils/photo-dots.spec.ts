import { dotsWindow, MAX_DOTS } from './photo-dots';

const on = (dots: { on: boolean; index: number }[]) => dots.find((dot) => dot.on)?.index;

describe('dotsWindow', () => {
  it('has a dot for each photo when there are few', () => {
    const dots = dotsWindow(3, 1);

    expect(dots.map((dot) => dot.index)).toEqual([0, 1, 2]);
    expect(on(dots)).toBe(1);
    expect(dots.some((dot) => dot.small)).toBe(false);
  });

  it('is empty for no photos', () => {
    expect(dotsWindow(0, 0)).toEqual([]);
  });

  it('never draws more than five dots, however many photos there are', () => {
    expect(dotsWindow(30, 12)).toHaveLength(MAX_DOTS);
    expect(dotsWindow(6, 0)).toHaveLength(MAX_DOTS);
  });

  it('follows the photo that is shown, which stays in the window', () => {
    for (const current of [0, 1, 7, 15, 28, 29]) {
      const dots = dotsWindow(30, current);

      expect(on(dots)).toBe(current);
      expect(dots.map((dot) => dot.index)).toContain(current);
    }
  });

  it('starts at the first photo and ends at the last, without going past them', () => {
    expect(dotsWindow(30, 0).map((dot) => dot.index)).toEqual([0, 1, 2, 3, 4]);
    expect(dotsWindow(30, 29).map((dot) => dot.index)).toEqual([25, 26, 27, 28, 29]);
  });

  it('makes the edge dot small only when there are more photos beyond it', () => {
    const start = dotsWindow(30, 0);
    expect(start.map((dot) => dot.small)).toEqual([false, false, false, false, true]);

    const middle = dotsWindow(30, 15);
    expect(middle.map((dot) => dot.small)).toEqual([true, false, false, false, true]);

    const end = dotsWindow(30, 29);
    expect(end.map((dot) => dot.small)).toEqual([true, false, false, false, false]);
  });

  it('keeps inside the photos when the index is out of range', () => {
    expect(on(dotsWindow(30, 99))).toBe(29);
    expect(on(dotsWindow(30, -4))).toBe(0);
  });
});
