import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

// A short message that floats on top of the screen. The page that shows it removes it after a while;
// the X on the right dismisses it right away.
@Component({
  selector: 'app-toast',
  imports: [MatIconModule],
  template: `
    <div class="toast" role="status" aria-live="polite">
      <span class="text">{{ text() }}</span>
      <button
        i18n-aria-label
        type="button"
        class="close"
        aria-label="Fechar"
        (click)="dismiss.emit()"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styleUrl: './toast.scss',
})
export class Toast {
  readonly text = input.required<string>();
  readonly dismiss = output<void>();
}
