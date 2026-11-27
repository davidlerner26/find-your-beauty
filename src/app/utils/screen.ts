import { signal } from '@angular/core';

// The width from which the site has the layout of a wide screen (the same as the `desktop` mixin of styles.scss)
export const WIDE_SCREEN_QUERY = '(min-width: 1024px)';

// Is the screen wide? A signal that follows the width of the window (a phone turned sideways, a window that is resized). On the
// server (the pages written at build time) there is no window: it is not wide there.
export const wideScreen = () => {
  if (typeof window === 'undefined') return signal(false);
  const query = window.matchMedia(WIDE_SCREEN_QUERY);
  const wide = signal(query.matches);
  query.addEventListener('change', (event) => wide.set(event.matches));
  return wide;
};
