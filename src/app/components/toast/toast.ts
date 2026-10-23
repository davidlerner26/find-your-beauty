import { Component, input, output } from '@angular/core';

// A short message that floats on top of the screen. The page that shows it removes it after a while;
// tapping it dismisses it right away.
@Component({
  selector: 'app-toast',
  template: `<button type="button" class="toast" role="status" aria-live="polite" (click)="dismiss.emit()">{{ text() }}</button>`,
  styleUrl: './toast.scss',
})
export class Toast {
  readonly text = input.required<string>();
  readonly dismiss = output<void>();
}
