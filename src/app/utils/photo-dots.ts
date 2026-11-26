// The dots under the photos of a card. With a few photos there is a dot for each one. With many (a gallery of twenty) they would
// run out of the photo, so only a window of five is drawn, that follows the photo that is being shown; the dots at the edges of the
// window are small when there are more photos beyond them (as in the photo carousels of the phone).
export type Dot = { index: number; on: boolean; small: boolean };

export const MAX_DOTS = 5;

export const dotsWindow = (total: number, current: number): Dot[] => {
  const at = Math.min(Math.max(current, 0), Math.max(total - 1, 0));
  if (total <= MAX_DOTS) {
    return Array.from({ length: total }, (_, index) => ({ index, on: index === at, small: false }));
  }
  const start = Math.min(Math.max(at - Math.floor(MAX_DOTS / 2), 0), total - MAX_DOTS);
  return Array.from({ length: MAX_DOTS }, (_, i) => {
    const index = start + i;
    const beyondBefore = i === 0 && start > 0;
    const beyondAfter = i === MAX_DOTS - 1 && start + MAX_DOTS < total;
    return { index, on: index === at, small: (beyondBefore || beyondAfter) && index !== at };
  });
};
