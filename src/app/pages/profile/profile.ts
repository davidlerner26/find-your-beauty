import { Component, resource, signal } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { UserProfile } from '../../models/user';
import { Users } from '../../services/users';
import { formatPhone } from '../../utils/phone';

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

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saveError = signal('');
  protected firstName = '';
  protected lastName = '';
  protected phone = '';

  protected get nameValid() {
    return this.firstName.trim().length >= 3;
  }

  protected get lastNameValid() {
    return this.lastName.trim().length >= 2;
  }

  // Mobile numbers have 11 digits: area code + 9 + 8 digits
  protected get phoneValid() {
    return this.phone.replace(/\D/g, '').length === 11;
  }

  constructor(
    protected readonly auth: Auth,
    private readonly users: Users,
    private readonly router: Router,
  ) {}

  protected edit(data: UserProfile | null | undefined) {
    this.firstName = data?.firstName ?? '';
    this.lastName = data?.lastName ?? '';
    this.phone = data?.phone ? formatPhone(data.phone) : '';
    this.submitted.set(false);
    this.saveError.set('');
    this.editing.set(true);
  }

  protected onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.phone = formatPhone(input.value);
    // Writes the mask back, or the browser would keep what was typed
    input.value = this.phone;
  }

  protected onTextInput(event: Event, field: 'firstName' | 'lastName') {
    this[field] = (event.target as HTMLInputElement).value;
  }

  protected async save() {
    this.submitted.set(true);
    const uid = this.auth.user()?.uid;
    if (!uid || !this.nameValid || !this.lastNameValid || !this.phoneValid) return;

    this.saveError.set('');
    this.saving.set(true);
    try {
      const firstName = this.firstName.trim();
      const lastName = this.lastName.trim();
      await this.users.update(uid, { firstName, lastName, phone: this.phone });
      await this.auth.updateName(`${firstName} ${lastName}`);
      this.profile.reload();
      this.editing.set(false);
    } catch (error) {
      console.error('Failed to save profile', error);
      this.saveError.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }

  protected initial(name: string | null, email: string | null) {
    return (name || email || '?')[0].toUpperCase();
  }

  protected signOut() {
    // Leave right away: don't depend on the sign-out promise to resolve
    this.router.navigateByUrl('/entrar');
    this.auth.signOut().catch((error) => console.error('Sign out failed', error));
  }
}
