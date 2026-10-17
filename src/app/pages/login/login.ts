import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth/auth.scss',
})
export class Login {
  protected email = '';
  protected password = '';
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly googleError = signal('');

  protected get emailValid() {
    return /^\S+@\S+\.\S+$/.test(this.email);
  }

  protected submit() {
    this.submitted.set(true);
    if (!this.emailValid || !this.password) return;
    // TODO: authenticate
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
