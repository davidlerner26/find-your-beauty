import { MatIconModule } from '@angular/material/icon';
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { authErrorMessage, isValidEmail } from '../../utils/validators';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, MatIconModule],
  templateUrl: './login.html',
  styleUrl: '../auth/auth.scss',
})
export class Login {
  // Set by the route: the professional area has its own login
  readonly pro = input(false);

  protected email = '';
  protected password = '';
  protected rememberMe = true;
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  private readonly touched = signal<Record<string, boolean>>({});
  protected readonly googleError = signal('');
  protected readonly formError = signal('');
  protected readonly submitting = signal(false);

  protected get emailValid() {
    return isValidEmail(this.email);
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
    if (!this.emailValid || !this.password) return;

    this.formError.set('');
    this.submitting.set(true);
    try {
      if (this.pro()) {
        await this.auth.signInProfessional(this.email, this.password, this.rememberMe);
      } else {
        await this.auth.signInClient(this.email, this.password, this.rememberMe);
      }
      this.router.navigateByUrl(this.auth.homePath());
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/email-not-verified') {
        this.router.navigateByUrl('/verificar-email');
        return;
      }
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
      await this.auth.signInWithGoogle(this.rememberMe, this.pro() ? 'professional' : 'client');
      this.router.navigateByUrl(this.auth.homePath());
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/not-professional' || code === 'auth/not-client' || code === 'auth/pending-approval') {
        this.googleError.set(authErrorMessage(error));
        return;
      }
      this.googleError.set($localize`Não foi possível entrar com o Google. Tente novamente.`);
    }
  }
}
