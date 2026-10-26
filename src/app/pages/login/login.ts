import { MatIconModule } from '@angular/material/icon';
import { Component, input, signal, inject } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { emailValidator } from '../../utils/form-validators';
import { authErrorMessage } from '../../utils/validators';
import { errorCode } from '../../utils/error-code';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './login.html',
  styleUrl: '../auth/auth.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  // Set by the route: the professional area has its own login
  readonly pro = input(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
    password: ['', Validators.required],
    rememberMe: [true],
  });
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly googleError = signal('');
  protected readonly formError = signal('');
  protected readonly submitting = signal(false);

  // Errors show once a field was left (blur) or after the first submit
  protected showError(control: AbstractControl) {
    return control.invalid && (this.submitted() || control.touched);
  }

  protected async submit() {
    this.submitted.set(true);
    if (this.form.invalid) return;
    const { email, password, rememberMe } = this.form.getRawValue();

    this.formError.set('');
    this.submitting.set(true);
    try {
      if (this.pro()) {
        await this.auth.signInProfessional(email, password, rememberMe);
      } else {
        await this.auth.signInClient(email, password, rememberMe);
      }
      this.router.navigateByUrl(this.auth.homePath());
    } catch (error) {
      if (errorCode(error) === 'auth/email-not-verified') {
        this.router.navigateByUrl('/verificar-email');
        return;
      }
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async signInWithGoogle() {
    this.googleError.set('');
    try {
      await this.auth.signInWithGoogle(
        this.form.controls.rememberMe.value,
        this.pro() ? 'professional' : 'client',
      );
      this.router.navigateByUrl(this.auth.homePath());
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (
        code === 'auth/not-professional' ||
        code === 'auth/not-client' ||
        code === 'auth/professional-not-registered' ||
        code === 'auth/pending-approval'
      ) {
        this.googleError.set(authErrorMessage(error));
        return;
      }
      this.googleError.set($localize`Não foi possível entrar com o Google. Tente novamente.`);
    }
  }
}
