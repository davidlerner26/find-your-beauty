import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router } from '@angular/router';
import { Professionals } from '../services/professionals';
import { ProfessionalPanel } from '../services/professional-panel';
import { ProfessionalLink } from './professional-link.directive';

@Component({
  imports: [ProfessionalLink],
  template: `<a id="link" [appProfessionalLink]="id()" [fragment]="fragment()">Ana</a>`,
})
class Host {
  id = signal<string | null>('ana');
  fragment = signal<string | undefined>(undefined);
}

const professionals: Record<
  string,
  { serviceMode: string; position: { lat: number; lng: number } }
> = {
  ana: { serviceMode: 'home', position: { lat: 0, lng: 0 } },
  bia: { serviceMode: 'studio', position: { lat: -22.9, lng: -43.2 } },
};

const setup = (wide: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: wide, media: query })) as never;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideLocationMocks(),
      { provide: Professionals, useValue: { byId: (id: string) => professionals[id] } },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const link = fixture.nativeElement.querySelector('#link') as HTMLAnchorElement;
  const panel = TestBed.inject(ProfessionalPanel);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { fixture, link, panel, navigate };
};

const click = (link: HTMLElement, init: MouseEventInit = {}) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  link.dispatchEvent(event);
  return event;
};

describe('appProfessionalLink', () => {
  it('keeps the address in the href, with the part of the page', () => {
    const { fixture, link } = setup(true);
    expect(link.getAttribute('href')).toBe('/explorar/ana');

    fixture.componentInstance.fragment.set('avaliacoes');
    fixture.detectChanges();
    expect(link.getAttribute('href')).toBe('/explorar/ana#avaliacoes');
  });

  it('opens the panel for a home-only professional on a wide screen', () => {
    const { link, panel, navigate } = setup(true);

    const event = click(link);

    expect(panel.openId()).toBe('ana');
    expect(navigate).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('goes to the page on a phone', () => {
    const { link, panel, navigate } = setup(false);

    click(link);

    expect(panel.openId()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/explorar/ana');
  });

  it('goes to the page for a professional with a place, over the map', () => {
    const { fixture, link, panel, navigate } = setup(true);
    fixture.componentInstance.id.set('bia');
    fixture.detectChanges();

    click(link);

    expect(panel.openId()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/explorar/bia');
  });

  it('leaves a click with Ctrl or Cmd to the browser (new tab)', () => {
    const { link, panel, navigate } = setup(true);

    const event = click(link, { ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(panel.openId()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing without a professional (no href, like a routerLink with null)', () => {
    const { fixture, link, panel, navigate } = setup(true);
    fixture.componentInstance.id.set(null);
    fixture.detectChanges();

    click(link);

    expect(link.hasAttribute('href')).toBe(false);
    expect(panel.openId()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
