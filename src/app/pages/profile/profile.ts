import { AddressPipe } from '../../utils/address';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject, resource, signal } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { UserProfile } from '../../models/user';
import { Users } from '../../services/users';
import { Feedback } from '../../services/feedback';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { PlaceSuggestions } from '../../components/place-suggestions/place-suggestions';
import { PlaceSearch } from '../../utils/place-search';
import { formatCpf, isValidCpf } from '../../utils/cpf';
import { formatPhone } from '../../utils/phone';
import { T } from '../../utils/texts';

@Component({
  selector: 'app-profile',
  imports: [AddressPipe, Spinner, RouterLink, MatIconModule, PlaceSuggestions],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  protected readonly t = T;
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
  protected cpf = '';
  // The address is searched and has to be chosen from the suggestions
  private readonly maps = inject(GoogleMapsLoader);
  protected readonly place = new PlaceSearch(this.maps);

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

  protected get addressValid() {
    return !!this.place.value.trim() && this.place.confirmed();
  }

  protected get cpfValid() {
    return isValidCpf(this.cpf);
  }

  constructor(
    protected readonly auth: Auth,
    private readonly users: Users,
    private readonly feedback: Feedback,
  ) {}

  protected edit(data: UserProfile | null | undefined) {
    this.firstName = data?.firstName ?? '';
    this.lastName = data?.lastName ?? '';
    this.phone = data?.phone ? formatPhone(data.phone) : '';
    this.cpf = data?.cpf ? formatCpf(data.cpf) : '';
    this.place.load(data?.address ?? '', data?.addressPosition);
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

  protected onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cpf = formatCpf(input.value);
    input.value = this.cpf;
  }

  protected onTextInput(event: Event, field: 'firstName' | 'lastName') {
    this[field] = (event.target as HTMLInputElement).value;
  }

  protected async save() {
    this.submitted.set(true);
    const uid = this.auth.user()?.uid;
    if (!uid || !this.nameValid || !this.lastNameValid || !this.phoneValid || !this.cpfValid || !this.addressValid) return;

    this.saveError.set('');
    this.saving.set(true);
    try {
      const firstName = this.firstName.trim();
      const lastName = this.lastName.trim();
      await this.users.update(uid, { firstName, lastName, phone: this.phone, cpf: this.cpf, address: this.place.value.trim(), addressPosition: this.place.position });
      await this.auth.updateName(`${firstName} ${lastName}`);
      // Shows what was just saved, without waiting for another read
      this.profile.set({
        email: this.auth.user()?.email ?? '',
        ...this.profile.value(),
        firstName,
        lastName,
        phone: this.phone,
        cpf: this.cpf,
        address: this.place.value.trim(),
        addressPosition: this.place.position,
      });
      this.editing.set(false);
      this.feedback.show($localize`Perfil atualizado`);
    } catch (error) {
      console.error('Failed to save profile', error);
      this.saveError.set($localize`Não foi possível salvar. Tente novamente.`);
    } finally {
      this.saving.set(false);
    }
  }

  protected initial(name: string | null, email: string | null) {
    return (name || email || '?')[0].toUpperCase();
  }

  // Stays on this screen: it turns into the "you are not signed in" view
  protected signOut() {
    this.editing.set(false);
    this.auth
      .signOut()
      .then(() => this.feedback.show($localize`Você saiu da conta`))
      .catch((error) => console.error('Sign out failed', error));
  }
}
