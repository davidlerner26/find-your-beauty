import { Component, inject, LOCALE_ID } from '@angular/core';
import { Router } from '@angular/router';

// The languages of the site: Portuguese is at the root, the others under /en and /es (one build of the app each)
const LANGUAGES = [
  { code: 'pt', label: 'PT', prefix: '' },
  { code: 'en', label: 'EN', prefix: '/en' },
  { code: 'es', label: 'ES', prefix: '/es' },
];

// PT | EN | ES: goes to the same page in the other language
@Component({
  selector: 'app-language-switcher',
  template: `
    <div class="languages" role="group" [attr.aria-label]="groupLabel">
      @for (language of languages; track language.code) {
        <button
          type="button"
          [class.active]="language.code === current"
          [attr.aria-pressed]="language.code === current"
          [attr.lang]="language.code"
          (click)="switchTo(language.prefix)"
        >
          {{ language.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  protected readonly languages = LANGUAGES;
  protected readonly current = inject(LOCALE_ID).slice(0, 2);
  protected readonly groupLabel = $localize`:@@language-switcher.label:Idioma`;

  private readonly router = inject(Router);

  protected switchTo(prefix: string) {
    // router.url has no language: the page is the same one under the other prefix
    location.assign(`${prefix}${this.router.url}` || '/');
  }
}
