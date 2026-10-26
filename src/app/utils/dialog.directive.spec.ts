import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogFocus } from './dialog.directive';

@Component({
  imports: [DialogFocus],
  template: `
    <button id="opener">open</button>
    @if (open()) {
      <div appDialog (escape)="closed.set(true); open.set(false)" id="dialog">
        <button id="first">one</button>
        <button id="second">two</button>
      </div>
    }
  `,
})
class Host {
  open = signal(false);
  closed = signal(false);
}

const key = (target: HTMLElement, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

const setup = async () => {
  const fixture = TestBed.createComponent(Host);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  el.querySelector<HTMLElement>('#opener')!.focus();
  fixture.componentInstance.open.set(true);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, el };
};

describe('appDialog', () => {
  it('moves focus into the dialog when it opens', async () => {
    const { el } = await setup();
    expect(document.activeElement).toBe(el.querySelector('#dialog'));
  });

  it('closes with Escape and gives focus back to where it was', async () => {
    const { fixture, el } = await setup();
    key(el.querySelector<HTMLElement>('#first')!, { key: 'Escape' });
    fixture.detectChanges();

    expect(fixture.componentInstance.closed()).toBe(true);
    expect(el.querySelector('#dialog')).toBeNull();
    expect(document.activeElement).toBe(el.querySelector('#opener'));
  });

  it('keeps Tab inside: from the last item it goes to the first, and Shift+Tab the other way', async () => {
    const { el } = await setup();
    const first = el.querySelector<HTMLElement>('#first')!;
    const second = el.querySelector<HTMLElement>('#second')!;

    second.focus();
    expect(key(second, { key: 'Tab' }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    expect(key(first, { key: 'Tab', shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(second);
  });

  it('lets Tab move normally between the items in the middle', async () => {
    const { el } = await setup();
    const first = el.querySelector<HTMLElement>('#first')!;
    first.focus();
    expect(key(first, { key: 'Tab' }).defaultPrevented).toBe(false);
  });
});
