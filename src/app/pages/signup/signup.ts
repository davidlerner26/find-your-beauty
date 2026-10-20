import { MatIconModule } from '@angular/material/icon';
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProProfile } from '../pro-profile/pro-profile';
import { Auth } from '../../services/auth';
import { formatPhone } from '../../utils/phone';
import { authErrorMessage, isValidEmail } from '../../utils/validators';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, ProProfile, MatIconModule],
  templateUrl: './signup.html',
  styleUrl: '../auth/auth.scss',
})
export class Signup {
  // Set by the route: professionals sign up in their own area
  readonly pro = input(false);

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

  protected onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.phone = formatPhone(input.value);
    // Written back so an extra digit that the mask drops also disappears from the field
    input.value = this.phone;
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
      const data = {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        password: this.password,
      };
      if (this.pro()) {
        // The account is created here; the profile is completed in the second step
        await this.auth.signUpProfessional(data);
      } else {
        await this.auth.signUpWithEmail(data);
        this.router.navigateByUrl('/');
      }
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  constructor(
    protected readonly auth: Auth,
    private readonly router: Router,
  ) {}

  protected async signInWithGoogle() {
    this.googleError.set('');
    try {
      await this.auth.signInWithGoogle();
      this.router.navigateByUrl(this.auth.homePath());
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      this.googleError.set('Não foi possível entrar com o Google. Tente novamente.');
    }
  }
}
