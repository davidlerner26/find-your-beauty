import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfessionalPanel } from './professional-panel';

const setup = () => {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideLocationMocks()] });
  const location = TestBed.inject(Location);
  location.go('/');
  return { panel: TestBed.inject(ProfessionalPanel), location };
};

describe('ProfessionalPanel', () => {
  it('opens a professional: the address bar shows the page and the panel is on', () => {
    const { panel, location } = setup();

    panel.open('ana');

    expect(panel.openId()).toBe('ana');
    expect(location.path()).toBe('/profissionais/ana');
  });

  it('closes by taking the address bar back to the screen underneath', () => {
    const { panel, location } = setup();
    panel.open('ana');

    panel.close();

    expect(panel.openId()).toBeNull();
    expect(location.path()).toBe('/');
  });

  it('closes when the browser goes back', () => {
    const { panel, location } = setup();
    panel.open('ana');

    location.back();

    expect(panel.openId()).toBeNull();
    expect(location.path()).toBe('/');
  });

  it('shows another professional without adding an entry: Back still goes to the screen underneath', () => {
    const { panel, location } = setup();
    panel.open('ana');

    panel.open('bia');
    expect(panel.openId()).toBe('bia');
    expect(location.path()).toBe('/profissionais/bia');

    location.back();
    expect(panel.openId()).toBeNull();
    expect(location.path()).toBe('/');
  });

  it('does nothing when closed with no panel open', () => {
    const { panel, location } = setup();

    panel.close();

    expect(location.path()).toBe('/');
  });
});
