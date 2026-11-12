import { DOCUMENT, Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdates } from './app-updates';

describe('AppUpdates', () => {
  let versionUpdates: Subject<unknown>;
  let unrecoverable: Subject<{ reason: string }>;
  let routerEvents: Subject<unknown>;
  let assign: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let hidden: boolean;
  let onVisibility: () => void;

  const setup = (enabled = true) => {
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    routerEvents = new Subject();
    assign = vi.fn();
    reload = vi.fn();
    hidden = false;
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => void saved.set(key, value),
    };
    const doc = {
      get hidden() {
        return hidden;
      },
      defaultView: { location: { assign, reload }, sessionStorage: storage },
      addEventListener: (_type: string, listener: () => void) => (onVisibility = listener),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: enabled,
            versionUpdates,
            unrecoverable,
            checkForUpdate: () => Promise.resolve(false),
          },
        },
        { provide: Router, useValue: { events: routerEvents } },
        { provide: Location, useValue: { prepareExternalUrl: (url: string) => url } },
        { provide: DOCUMENT, useValue: doc },
      ],
    });
    TestBed.inject(AppUpdates).start();
  };

  const ready = () => versionUpdates.next({ type: 'VERSION_READY' });

  afterEach(() => vi.useRealTimers());

  it('does nothing where there is no service worker', () => {
    setup(false);
    ready();
    expect(reload).not.toHaveBeenCalled();
  });

  it('waits while the user is on the page: a form is not lost', () => {
    setup();
    ready();
    expect(reload).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('loads the new version when the tab is hidden', () => {
    setup();
    ready();
    hidden = true;
    onVisibility();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('loads it at once when the version arrives in a hidden tab', () => {
    setup();
    hidden = true;
    ready();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('loads it on the next navigation, at the address that was going to open', () => {
    setup();
    ready();
    routerEvents.next(new NavigationStart(1, '/explore'));
    expect(assign).toHaveBeenCalledWith('/explore');
  });

  it('does not touch the navigation when there is nothing new', () => {
    setup();
    routerEvents.next(new NavigationStart(1, '/explore'));
    expect(assign).not.toHaveBeenCalled();
  });

  it('replaces a broken copy of the app at once', () => {
    setup();
    unrecoverable.next({ reason: 'hash mismatch' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('tries a broken copy once, not again and again', () => {
    setup();
    unrecoverable.next({ reason: 'hash mismatch' });
    unrecoverable.next({ reason: 'hash mismatch' });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
