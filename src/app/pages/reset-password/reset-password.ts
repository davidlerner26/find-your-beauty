import { MatIconModule } from '@angular/material/icon';
import { Component, input, OnInit, signal, inject } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { fieldsMatch, passwordValidator } from '../../utils/form-validators';
import { authErrorMessage, PASSWORD_RULE } from '../../utils/validators';

// Firebase opens this page from the e-mail link with ?mode=resetPassword&oobCode=...
@Component({
  selector: 'app-reset-password',
  imports: [Spinner, ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: '../auth/auth.scss',
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(Auth);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly mode = input<string>('');
  readonly oobCode = input<string>('');

  protected readonly form = this.fb.group(
    {
      password: ['', [Validators.required, passwordValidator]],
      confirmation: ['', Validators.required],
    },
    { validators: fieldsMatch('password', 'confirmation') },
  );
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);

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

  // The confirmation is wrong when it is empty or when it differs from the password
  protected get confirmationInvalid() {
    return this.form.controls.confirmation.invalid || this.form.hasError('mismatch');
  }

  // Errors show once a field was left (blur) or after the first submit
  protected showError(control: AbstractControl, invalid = control.invalid) {
    return invalid && (this.submitted() || control.touched);
  }

  protected async submit() {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      await this.auth.confirmPasswordReset(this.oobCode(), this.form.controls.password.value);
      this.state.set('done');
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
