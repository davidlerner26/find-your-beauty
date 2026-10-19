import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template: `<span class="ring" [class.small]="small()" role="status" aria-label="Carregando"></span>`,
  styleUrl: './spinner.scss',
  host: { '[class.small]': 'small()' },
})
export class Spinner {
  // Inline size, for spots inside a section instead of a whole screen
  readonly small = input(false);
}
