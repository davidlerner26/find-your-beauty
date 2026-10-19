import { Component, resource } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Users } from '../../services/users';

@Component({
  selector: 'app-profile',
  imports: [Spinner, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  // Loads the `users/{uid}` document whenever the logged in user changes
  protected readonly profile = resource({
    params: () => this.auth.user()?.uid,
    loader: ({ params: uid }) => this.users.get(uid),
  });

  constructor(
    protected readonly auth: Auth,
    private readonly users: Users,
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
