import { signal } from '@angular/core';
import { hasLocation, Professional } from '../models/professional';

// The width from which the site has the layout of a wide screen (the same as the `desktop` mixin of styles.scss)
export const WIDE_SCREEN_QUERY = '(min-width: 1024px)';

// Where the page of a professional opens on a wide screen. A professional with a place is a card on top of the map
// (the explore screen). One with no place (home-only) has no pin, so the map would be empty: the page opens as a
// panel on the side of the screen the client is on.
export const opensInPanel = (
  professional: Pick<Professional, 'serviceMode' | 'position'> | undefined,
  wide: boolean,
) => !!professional && wide && !hasLocation(professional);

// Is the screen wide? A signal that follows the width of the window (a phone turned sideways, a window that is resized). On the
// server (the pages written at build time) there is no window: it is not wide there.
export const wideScreen = () => {
  if (typeof window === 'undefined') return signal(false);
  const query = window.matchMedia(WIDE_SCREEN_QUERY);
  const wide = signal(query.matches);
  query.addEventListener('change', (event) => wide.set(event.matches));
  return wide;
};
