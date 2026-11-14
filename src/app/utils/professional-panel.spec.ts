import { opensInPanel } from './professional-panel';

const at = { lat: -22.97, lng: -43.18 };
const nowhere = { lat: 0, lng: 0 };

describe('opensInPanel', () => {
  it('is for a home-only professional on a wide screen', () => {
    expect(opensInPanel({ serviceMode: 'home', position: at }, true)).toBe(true);
  });

  it('is not for a professional with a place: the map shows the pin', () => {
    expect(opensInPanel({ serviceMode: 'studio', position: at }, true)).toBe(false);
    expect(opensInPanel({ serviceMode: 'both', position: at }, true)).toBe(false);
    // Without a chosen mode the professional has a studio
    expect(opensInPanel({ position: at }, true)).toBe(false);
  });

  it('is for a professional with no position either: there is no pin to show', () => {
    expect(opensInPanel({ serviceMode: 'studio', position: nowhere }, true)).toBe(true);
  });

  it('is not for phones and tablets, where the page is a screen of its own', () => {
    expect(opensInPanel({ serviceMode: 'home', position: at }, false)).toBe(false);
  });

  it('is not for a professional that is not loaded yet', () => {
    expect(opensInPanel(undefined, true)).toBe(false);
  });
});
