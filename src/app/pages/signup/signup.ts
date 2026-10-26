import { MatIconModule } from '@angular/material/icon';
import { Component, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProProfile } from '../pro-profile/pro-profile';
import { Auth } from '../../services/auth';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { PlaceSuggestions } from '../../components/place-suggestions/place-suggestions';
import { PlaceSearch } from '../../utils/place-search';
import { formatCpf } from '../../utils/cpf';
import { formatPhone } from '../../utils/phone';
import {
  cpfValidator,
  emailValidator,
  minTrimmedLength,
  mobileValidator,
  passwordValidator,
} from '../../utils/form-validators';
import { authErrorMessage, PASSWORD_RULE } from '../../utils/validators';
import { errorCode } from '../../utils/error-code';

@Component({
  selector: 'app-signup',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ProProfile,
    MatIconModule,
    PlaceSuggestions,
  ],
  templateUrl: './signup.html',
  styleUrl: '../auth/auth.scss',
})
export class Signup {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  // Set by the route: professionals sign up in their own area
  readonly pro = input(false);

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, minTrimmedLength(3)]],
    lastName: ['', [Validators.required, minTrimmedLength(2)]],
    email: ['', [Validators.required, emailValidator]],
    phone: ['', [Validators.required, mobileValidator]],
    cpf: ['', [Validators.required, cpfValidator]],
    password: ['', [Validators.required, passwordValidator]],
  });
  // Clients only: it has to be chosen from the suggestions
  private readonly maps = inject(GoogleMapsLoader);
  protected readonly place = new PlaceSearch(this.maps);
  private readonly addressTouched = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly googleError = signal('');
  protected readonly formError = signal('');
  protected readonly submitting = signal(false);

  protected get addressValid() {
    // Required for clients (professionals give theirs in the second step): searched and chosen from the suggestions
    return this.pro() || (!!this.place.value.trim() && this.place.confirmed());
  }

  protected readonly passwordRule = PASSWORD_RULE;

  // The masks write the formatted text back, so an extra digit that they drop also leaves the field
  protected maskPhone() {
    const { phone } = this.form.controls;
    phone.setValue(formatPhone(phone.value));
  }

  protected maskCpf() {
    const { cpf } = this.form.controls;
    cpf.setValue(formatCpf(cpf.value));
  }

  protected touchAddress() {
    this.addressTouched.set(true);
  }

  // Errors show once a field was left (blur) or after the first submit
  protected showError(control: AbstractControl) {
    return control.invalid && (this.submitted() || control.touched);
  }

  protected showAddressError() {
    return !this.addressValid && (this.submitted() || this.addressTouched());
  }

  protected async submit() {
    this.submitted.set(true);
    if (this.form.invalid || !this.addressValid) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      const data = {
        ...this.form.getRawValue(),
        address: this.pro() ? '' : this.place.value.trim(),
        addressPosition: this.pro() ? undefined : this.place.position,
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
