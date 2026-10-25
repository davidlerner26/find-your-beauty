import { Injectable, signal } from '@angular/core';

// A short message that floats on top of any screen to answer an action of the user (it survives a change of screen,
// like after sending a booking). The same look of the toasts of the pages.
@Injectable({ providedIn: 'root' })
export class Feedback {
  readonly text = signal('');
  private id = 0;

  show(text: string, milliseconds = 3500) {
    const id = ++this.id;
    this.text.set(text);
    setTimeout(() => this.id === id && this.text.set(''), milliseconds);
  }

  dismiss() {
    this.id++;
    this.text.set('');
  }
}
