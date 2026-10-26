import { MatIconModule } from '@angular/material/icon';
import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { authErrorMessage, isValidEmail } from '../../utils/validators';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, MatIconModule],
  templateUrl: './forgot-password.html',
  styleUrl: '../auth/auth.scss',
})
export class ForgotPassword {
  private readonly auth = inject(Auth);

  protected email = '';
  protected readonly submitted = signal(false);
  protected readonly touched = signal(false);
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly formError = signal('');

  protected get emailValid() {
    return isValidEmail(this.email);
  }

  protected get showError() {
    return this.submitted() || this.touched();
  }

  protected async submit() {
    this.submitted.set(true);
    if (!this.emailValid) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      await this.auth.sendPasswordReset(this.email);
      this.sent.set(true);
    } catch (error) {
      this.formError.set(authErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
