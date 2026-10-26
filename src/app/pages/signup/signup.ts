import { MatIconModule } from '@angular/material/icon';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProProfile } from '../pro-profile/pro-profile';
import { Auth } from '../../services/auth';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { PlaceSuggestions } from '../../components/place-suggestions/place-suggestions';
import { PlaceSearch } from '../../utils/place-search';
import { formatCpf, isValidCpf } from '../../utils/cpf';
import { formatPhone } from '../../utils/phone';
import {
  authErrorMessage,
  isValidEmail,
  isValidPassword,
  PASSWORD_RULE,
} from '../../utils/validators';
import { errorCode } from '../../utils/error-code';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, ProProfile, MatIconModule, PlaceSuggestions],
  templateUrl: './signup.html',
  styleUrl: '../auth/auth.scss',
})
export class Signup {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Set by the route: professionals sign up in their own area
  readonly pro = input(false);

  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected cpf = '';
  // Clients only: it has to be chosen from the suggestions
  private readonly maps = inject(GoogleMapsLoader);
  protected readonly place = new PlaceSearch(this.maps);
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

  protected get addressValid() {
    // Required for clients (professionals give theirs in the second step): searched and chosen from the suggestions
    return this.pro() || (!!this.place.value.trim() && this.place.confirmed());
  }

  protected get cpfValid() {
    return isValidCpf(this.cpf);
  }

  protected readonly passwordRule = PASSWORD_RULE;

  protected get passwordValid() {
    return isValidPassword(this.password);
  }

  protected onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.phone = formatPhone(input.value);
    // Written back so an extra digit that the mask drops also disappears from the field
    input.value = this.phone;
  }

  protected onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cpf = formatCpf(input.value);
    input.value = this.cpf;
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
    if (
      !this.nameValid ||
      !this.lastNameValid ||
      !this.emailValid ||
      !this.phoneValid ||
      !this.cpfValid ||
      !this.addressValid ||
      !this.passwordValid
    )
      return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      const data = {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        cpf: this.cpf,
        address: this.pro() ? '' : this.place.value.trim(),
        addressPosition: this.pro() ? undefined : this.place.position,
        password: this.password,
      };
      if (this.pro()) {
        // The account is created here; the profile is completed in the second step
        await this.auth.signUpProfessional(data);
      } else {
        await this.auth.signUpWithEmail(data);
        this.router.navigateByUrl('/verificar-email');
      }
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async signInWithGoogle() {
    this.googleError.set('');
    try {
      if (this.pro()) await this.auth.signUpProfessionalWithGoogle();
      else await this.auth.signInWithGoogle();
      this.router.navigateByUrl(this.auth.homePath());
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/account-is-client' || code === 'auth/pending-approval') {
        this.googleError.set(authErrorMessage(error));
        return;
      }
      this.googleError.set($localize`Não foi possível entrar com o Google. Tente novamente.`);
    }
  }
}
