import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { authErrorMessage, isValidEmail } from '../../utils/validators';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: '../auth/auth.scss',
})
export class Signup {
  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  private readonly touched = signal<Record<string, boolean>>({});
  protected readonly googleError = signal('');
  protected readonly formError = signal('');
  protected readonly submitting = signal(false);

  protected get nameValid() {
    return this.firstName.trim().length >= 3;
  }

  protected get lastNameValid() {
    return this.lastName.trim().length >= 2;
  }

  protected get emailValid() {
    return isValidEmail(this.email);
  }

  // Mobile numbers have 11 digits: area code + 9 + 8 digits
  protected get phoneValid() {
    return this.phone.replace(/\D/g, '').length === 11;
  }

  protected get passwordValid() {
    return this.password.length >= 10 && /\d/.test(this.password);
  }

  // Formats as (21) 99747-2878, or (21) 3974-2878 for landlines
  protected onPhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const area = digits.slice(0, 2);
    const rest = digits.slice(2);
    const split = digits.length > 10 ? 5 : 4;

    let masked = digits;
    if (digits.length > 2) {
      masked = `(${area}) ${rest.slice(0, split)}`;
      if (rest.length > split) masked += `-${rest.slice(split)}`;
    } else if (digits.length) {
      masked = `(${area}`;
    }

    this.phone = masked;
  }

  protected touch(field: string) {
    this.touched.update((touched) => ({ ...touched, [field]: true }));
  }

  // Errors show once a field was left (blur) or after the first submit
  protected showError(field: string) {
    return this.submitted() || !!this.touched()[field];
  }

  protected async submit() {
    this.submitted.set(true);
    if (!this.nameValid || !this.lastNameValid || !this.emailValid || !this.phoneValid || !this.passwordValid) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      await this.auth.signUpWithEmail({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        password: this.password,
      });
      this.router.navigateByUrl('/');
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {}

  protected async signInWithGoogle() {
    this.googleError.set('');
    try {
      await this.auth.signInWithGoogle();
      this.router.navigateByUrl('/');
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      this.googleError.set('Não foi possível entrar com o Google. Tente novamente.');
    }
  }
}
