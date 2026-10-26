import { MatIconModule } from '@angular/material/icon';
import { Component, input, OnInit, signal, inject } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { authErrorMessage, isValidPassword, PASSWORD_RULE } from '../../utils/validators';

// Firebase opens this page from the e-mail link with ?mode=resetPassword&oobCode=...
@Component({
  selector: 'app-reset-password',
  imports: [Spinner, FormsModule, RouterLink, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: '../auth/auth.scss',
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(Auth);

  readonly mode = input<string>('');
  readonly oobCode = input<string>('');

  protected password = '';
  protected confirmation = '';
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  private readonly touched = signal<Record<string, boolean>>({});

  // loading while the code is checked, invalid when the link is wrong or expired
  protected readonly state = signal<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  protected readonly email = signal('');
  protected readonly formError = signal('');
  protected readonly submitting = signal(false);

  async ngOnInit() {
    if (this.mode() !== 'resetPassword' || !this.oobCode()) {
      this.formError.set($localize`Este link não é válido. Peça um novo link de redefinição.`);
      this.state.set('invalid');
      return;
    }

    try {
      this.email.set(await this.auth.verifyResetCode(this.oobCode()));
      this.state.set('ready');
    } catch (error) {
      this.formError.set(authErrorMessage(error));
      this.state.set('invalid');
    }
  }

  protected readonly passwordRule = PASSWORD_RULE;

  protected get passwordValid() {
    return isValidPassword(this.password);
  }

  protected get confirmationValid() {
    return !!this.confirmation && this.confirmation === this.password;
  }

  protected touch(field: string) {
    this.touched.update((touched) => ({ ...touched, [field]: true }));
  }

  protected showError(field: string) {
    return this.submitted() || !!this.touched()[field];
  }

  protected async submit() {
    this.submitted.set(true);
    if (!this.passwordValid || !this.confirmationValid) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      await this.auth.confirmPasswordReset(this.oobCode(), this.password);
      this.state.set('done');
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
