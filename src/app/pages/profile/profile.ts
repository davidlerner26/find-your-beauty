import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  constructor(
    protected readonly auth: Auth,
    private readonly router: Router,
  ) {}

  protected initial(name: string | null, email: string | null) {
    return (name || email || '?')[0].toUpperCase();
  }

  protected signOut() {
    // Leave right away: don't depend on the sign-out promise to resolve
    this.router.navigateByUrl('/entrar');
    this.auth.signOut().catch((error) => console.error('Sign out failed', error));
  }
}
