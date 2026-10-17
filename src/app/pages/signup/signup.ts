import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: '../auth/auth.scss',
})
export class Signup {
  protected name = '';
  protected email = '';
  protected countryCode = '+55';
  protected phone = '';
  protected password = '';
  protected readonly countryCodes = ['+55', '+1', '+351', '+54'];
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);
  protected readonly googleError = signal('');

  protected get emailValid() {
    return /^\S+@\S+\.\S+$/.test(this.email);
  }

  protected get phoneValid() {
    return this.phone.replace(/\D/g, '').length >= 8;
  }

  protected get passwordValid() {
    return this.password.length >= 6;
  }

  protected submit() {
    this.submitted.set(true);
    if (!this.name.trim() || !this.emailValid || !this.phoneValid || !this.passwordValid) return;
    // TODO: create account
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
