import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { PATHS } from '../../utils/paths';

// Where Instagram sends the professional back (?code=... or ?error=...). It has no screen of its own: the answer goes
// on to the profile (or to the second step of the sign up), which shows a small "connecting" in its Instagram section
// and finishes the connection there, like the loading of the gallery.
@Component({
  selector: 'app-pro-instagram',
  template: '',
})
export class ProInstagram {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  readonly code = input<string>();
  readonly state = input<string>();
  readonly error_description = input<string>();

  constructor() {
    // Inputs are set after the constructor
    queueMicrotask(() =>
      this.router.navigate([this.auth.signupIncomplete() ? PATHS.proSignup : PATHS.proProfile], {
        queryParams: {
          code: this.code(),
          state: this.state(),
          error_description: this.error_description(),
        },
        replaceUrl: true,
      }),
    );
  }
}
