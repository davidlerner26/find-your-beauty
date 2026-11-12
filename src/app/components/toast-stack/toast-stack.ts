import { Component, inject } from '@angular/core';
import { Feedback } from '../../services/feedback';
import { Toast } from '../toast/toast';

// The messages of Feedback, one under the other (see the position in the style)
@Component({
  selector: 'app-toast-stack',
  imports: [Toast],
  template: `
    @for (item of feedback.items(); track item.id) {
      <app-toast [text]="item.text" (dismiss)="feedback.dismiss(item.id)" />
    }
  `,
  styleUrl: './toast-stack.scss',
})
export class ToastStack {
  protected readonly feedback = inject(Feedback);
}
