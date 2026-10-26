import { MatIconModule } from '@angular/material/icon';
import { Component, signal, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { emailValidator } from '../../utils/form-validators';
import { authErrorMessage } from '../../utils/validators';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  templateUrl: './forgot-password.html',
  styleUrl: '../auth/auth.scss',
})
export class ForgotPassword {
  private readonly auth = inject(Auth);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
  });
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly formError = signal('');

  // Errors show once the field was left (blur) or after the first submit
  protected get showError() {
    const { email } = this.form.controls;
    return email.invalid && (this.submitted() || email.touched);
  }

  protected async submit() {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      await this.auth.sendPasswordReset(this.form.controls.email.value);
      this.sent.set(true);
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
