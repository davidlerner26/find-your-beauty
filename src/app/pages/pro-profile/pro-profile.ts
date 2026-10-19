import { Component, computed, effect, input, output, signal } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { parseInstagram } from '../../utils/instagram';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import {
  Availability,
  Professional,
  DateRange,
  ImagePosition,
  DEFAULT_AVAILABILITY,
  Service,
  ServiceCategory,
} from '../../models/professional';
import { durationToText, maskDuration, parseDuration } from '../../utils/duration';
import { maskMoney, moneyToText, parseMoney } from '../../utils/money';
import { toDateKey, toMinutes } from '../../utils/slots';
import { Auth } from '../../services/auth';
import { db } from '../../services/firebase';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { Photos } from '../../services/photos';
import { PhotoPositioner } from '../../components/photo-positioner/photo-positioner';
import { DateRangePicker, PendingRange } from '../../components/date-range-picker/date-range-picker';
import { Professionals } from '../../services/professionals';

// A service being edited: nothing is pre-filled, so the fields can be empty
type ServiceDraft = Omit<Service, 'category' | 'price' | 'durationMinutes'> & {
  category: ServiceCategory | '';
  // Typed like a money field, e.g. "15,50"
  price: string;
  // Typed as H:MM, e.g. "1:30"
  duration: string;
};

type AddressSuggestion = { text: string; prediction: google.maps.places.PlacePrediction };

@Component({
  selector: 'app-pro-profile',
  imports: [PhotoPositioner, DateRangePicker, Spinner, FormsModule],
  templateUrl: './pro-profile.html',
  styleUrl: './pro-profile.scss',
})
export class ProProfile {
  // Second step of the sign up: the same form, but the profile has to be complete to be sent
  readonly signup = input(false);
  readonly submitted = output<void>();

  protected readonly categories: ServiceCategory[] = ['Maquiagem', 'Cabelo'];

  protected name = '';
  protected phone = '';
  protected instagram = '';
  protected image = '';
  protected readonly imagePosition = signal<ImagePosition>({ x: 50, y: 50 });
  protected gallery: string[] = [];
  private removedPhotos: string[] = [];
  protected address = '';
  protected about = '';
  protected services: ServiceDraft[] = [];
  protected readonly serviceTried = signal(false);
  protected position = { lat: 0, lng: 0 };
  protected availability: Availability = structuredClone(DEFAULT_AVAILABILITY);
  protected readonly today = toDateKey(new Date());
  protected readonly pending = signal<PendingRange>({ start: null, end: null });

  // Monday first, as in the Brazilian calendar
  protected readonly weekdays = [
    { key: '1', label: 'Segunda' },
    { key: '2', label: 'Terça' },
    { key: '3', label: 'Quarta' },
    { key: '4', label: 'Quinta' },
    { key: '5', label: 'Sexta' },
    { key: '6', label: 'Sábado' },
    { key: '0', label: 'Domingo' },
  ];

  protected readonly visible = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  // Address search (Google Places): the address only counts once a suggestion was chosen
  protected readonly suggestions = signal<AddressSuggestion[]>([]);
  protected readonly addressOpen = signal(false);
  protected readonly addressConfirmed = signal(false);
  protected readonly addressError = signal('');
  private addressTimer?: ReturnType<typeof setTimeout>;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  protected readonly uploading = signal(false);
  private filled = false;

  private readonly uid = computed(() => this.auth.user()?.uid ?? '');
  protected readonly profile = computed(() => this.professionals.byId(this.uid()));

  constructor(
    private readonly auth: Auth,
    private readonly professionals: Professionals,
    private readonly router: Router,
    private readonly photos: Photos,
    private readonly maps: GoogleMapsLoader,
  ) {
    // The profile document was just created by the first step: the list of professionals is stale
    if (this.signup()) this.professionals.load();

    // Fills the form once, when the profile document arrives
    effect(() => {
      const profile = this.profile();
      if (!profile || this.filled) return;

      this.filled = true;
      this.name = profile.name;
      this.phone = profile.phone ?? '';
      this.instagram = profile.instagram ? '@' + profile.instagram : '';
      // Accounts from when there were two photos: the old cover is used when there is no profile photo
      const legacy = profile as Professional & { coverImage?: string; coverPosition?: ImagePosition };
      this.image = profile.image || legacy.coverImage || '';
      this.imagePosition.set((profile.image ? profile.imagePosition : legacy.coverPosition) ?? { x: 50, y: 50 });
      this.gallery = [...profile.gallery];
      this.address = profile.address;
      this.about = profile.about.join('\n\n');
      this.services = profile.services.map(({ durationMinutes, price, ...service }) => ({
        ...service,
        price: moneyToText(price),
        duration: durationToText(durationMinutes),
      }));
      this.position = { ...profile.position };
      this.addressConfirmed.set(this.hasPosition);
      const availability = structuredClone(profile.availability ?? DEFAULT_AVAILABILITY);
      // Single days saved before periods existed become one-day periods
      availability.blockedRanges = [
        ...(availability.blockedRanges ?? []),
        ...(availability.blockedDates ?? []).map((date) => ({ start: date, end: date })),
      ];
      delete availability.blockedDates;
      this.availability = availability;
      this.visible.set(profile.visible !== false);
    });
  }

  protected get hasPosition() {
    return this.position.lat !== 0 || this.position.lng !== 0;
  }

  // What is missing before the profile can be shown to clients
  protected get missing() {
    const missing: string[] = [];
    if (this.name.trim().length < 3) missing.push('nome');
    if (!this.image.trim()) missing.push('foto');
    if (this.address.trim().length < 5) missing.push('endereço');
    else if (!this.addressConfirmed()) missing.push('escolher o endereço na lista de sugestões');
    if (!this.services.some((service) => this.serviceComplete(service))) {
      missing.push('pelo menos 1 serviço completo');
    }
    return missing;
  }

  // Days where the closing time isn't after the opening time
  protected get invalidDays() {
    return this.weekdays.filter(({ key }) => {
      const day = this.availability.weekly[key];
      return day.enabled && toMinutes(day.end) <= toMinutes(day.start);
    });
  }

  protected blockPending() {
    const { start, end } = this.pending();
    if (!start) return;

    const range: DateRange = { start, end: end ?? start };
    const exists = this.availability.blockedRanges.some((r) => r.start === range.start && r.end === range.end);
    if (!exists) {
      this.availability.blockedRanges = [...this.availability.blockedRanges, range].sort((a, b) =>
        a.start.localeCompare(b.start),
      );
    }
    this.pending.set({ start: null, end: null });
  }

  protected unblock(range: DateRange) {
    this.availability.blockedRanges = this.availability.blockedRanges.filter((r) => r !== range);
  }

  // "10/03/2026" for a single day, "10/03/2026 a 15/03/2026" for a period
  protected rangeLabel(start: string, end: string | null) {
    const format = (key: string) => {
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    };
    return !end || end === start ? format(start) : `${format(start)} a ${format(end)}`;
  }

  // Shows the feedback at the top of the page and brings it into view
  private show(text: string) {
    this.message.set(text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async uploadProfilePhoto(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploading.set(true);
    this.message.set('');
    try {
      this.image = await this.photos.upload(this.uid(), 'profile', file);
      // A new photo starts centered
      this.imagePosition.set({ x: 50, y: 50 });
    } catch (error) {
      this.showUploadError(error);
    } finally {
      this.uploading.set(false);
    }
  }

  protected async uploadGalleryPhotos(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.uploading.set(true);
    this.message.set('');
    try {
      const urls = await Promise.all(files.map((file) => this.photos.upload(this.uid(), 'gallery', file)));
      this.gallery = [...this.gallery, ...urls];
    } catch (error) {
      this.showUploadError(error);
    } finally {
      this.uploading.set(false);
    }
  }

  protected removeGalleryPhoto(url: string) {
    this.gallery = this.gallery.filter((photo) => photo !== url);
    this.removedPhotos.push(url);
  }

  private showUploadError(error: unknown) {
    console.error('Upload failed', error);
    this.show('Não foi possível enviar a foto. Use uma imagem e tente novamente.');
  }

  protected addService() {
    this.services = [
      ...this.services,
      {
        id: Math.random().toString(36).slice(2, 10),
        name: '',
        category: '',
        price: '0,00',
        duration: '0:00',
        description: '',
        image: '',
      },
    ];
  }

  // Description is optional, everything else is required
  protected serviceComplete(service: ServiceDraft) {
    return (
      !!service.name.trim() &&
      !!service.category &&
      parseMoney(service.price) > 0 &&
      !!parseDuration(service.duration)
    );
  }

  protected readonly parseDuration = parseDuration;
  protected readonly parseMoney = parseMoney;

  protected onPriceInput(service: ServiceDraft, event: Event) {
    const input = event.target as HTMLInputElement;
    service.price = maskMoney(input.value);
    input.value = service.price;
  }

  protected onDurationInput(service: ServiceDraft, event: Event) {
    const input = event.target as HTMLInputElement;
    service.duration = maskDuration(input.value);
    // Written back so a rejected extra digit disappears from the field too
    input.value = service.duration;
  }

  // Highlights an empty required field once a save was attempted
  protected fieldInvalid(empty: boolean) {
    return this.serviceTried() && empty;
  }

  protected removeService(service: ServiceDraft) {
    this.services = this.services.filter((item) => item !== service);
  }

  protected onAddressInput(value: string) {
    this.address = value;
    // Editing the text breaks the link with the chosen place: it has to be chosen again
    this.addressConfirmed.set(false);
    this.position = { lat: 0, lng: 0 };
    this.addressError.set('');
    clearTimeout(this.addressTimer);

    if (value.trim().length < 3) {
      this.suggestions.set([]);
      return;
    }
    // Waits for a pause in the typing so it doesn't search on every key
    this.addressTimer = setTimeout(() => this.searchAddress(value), 250);
  }

  private async searchAddress(input: string) {
    try {
      await this.maps.load();
      const { AutocompleteSuggestion, AutocompleteSessionToken } = google.maps.places;
      this.sessionToken ??= new AutocompleteSessionToken();

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: this.sessionToken,
        includedRegionCodes: ['br'],
        language: 'pt-BR',
        region: 'br',
      });

      // The user kept typing while this was loading: that answer is already old
      if (input !== this.address) return;

      this.suggestions.set(
        suggestions.flatMap((suggestion) =>
          suggestion.placePrediction
            ? [{ text: suggestion.placePrediction.text.text, prediction: suggestion.placePrediction }]
            : [],
        ),
      );
      this.addressOpen.set(true);
    } catch (error) {
      console.error('Address search failed', error);
      this.suggestions.set([]);
      this.addressError.set('Não foi possível buscar endereços agora. Tente novamente em instantes.');
    }
  }

  protected async chooseAddress(suggestion: AddressSuggestion) {
    this.addressOpen.set(false);
    this.suggestions.set([]);

    try {
      const place = suggestion.prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });
      if (!place.location) throw new Error('place-without-location');

      this.address = place.formattedAddress ?? suggestion.text;
      this.position = { lat: place.location.lat(), lng: place.location.lng() };
      this.addressConfirmed.set(true);
      // Choosing a place closes the billing session of the search
      this.sessionToken = undefined;
    } catch (error) {
      console.error('Failed to load the place', error);
      this.addressError.set('Não foi possível carregar este endereço. Escolha outro.');
    }
  }

  protected closeAddressList() {
    this.addressOpen.set(false);
  }

  protected async save() {
    if (this.invalidDays.length) {
      this.show('O horário de fechamento precisa ser depois do de abertura.');
      return;
    }

    const instagram = parseInstagram(this.instagram);
    if (instagram === null) {
      this.show('Usuário do Instagram inválido. Use o formato @usuario.');
      return;
    }

    if (this.signup() && this.missing.length) {
      this.serviceTried.set(true);
      this.show(`Para enviar o cadastro falta: ${this.missing.join(', ')}.`);
      return;
    }

    this.serviceTried.set(true);
    if (!this.services.every((service) => this.serviceComplete(service))) {
      this.show('Preencha todos os campos obrigatórios dos serviços ou remova os que estiverem vazios.');
      return;
    }

    this.saving.set(true);
    this.message.set('');

    const services: Service[] = this.services.map(({ duration, price, ...service }) => ({
      ...service,
      price: parseMoney(price),
      durationMinutes: parseDuration(duration)!,
      category: service.category as ServiceCategory,
      name: service.name.trim(),
      description: service.description.trim(),
      image: service.image || this.image.trim(),
    }));
    // Clients only see profiles that are visible and complete
    const visible = this.visible();
    const published = visible && this.missing.length === 0;

    try {
      await updateDoc(doc(db, 'professionals', this.uid()), {
        name: this.name.trim(),
        phone: this.phone.trim(),
        instagram,
        image: this.image.trim(),
        imagePosition: this.imagePosition(),
        coverImage: deleteField(),
        coverPosition: deleteField(),
        address: this.address.trim(),
        about: this.about
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
        services,
        tags: [...new Set(services.map((service) => service.category))],
        gallery: this.gallery,
        position: this.position,
        availability: {
          slotMinutes: Number(this.availability.slotMinutes),
          weekly: this.availability.weekly,
          blockedRanges: this.availability.blockedRanges,
        },
        visible,
        published,
        // Sign up finished: the account now waits for an admin
        ...(this.signup() ? { submitted: true } : {}),
      });
      // Only deletes the removed photos once the profile no longer points to them
      await Promise.all(this.removedPhotos.map((url) => this.photos.remove(url)));
      this.removedPhotos = [];
      if (this.signup()) {
        await this.auth.finishSignup();
        this.submitted.emit();
        return;
      }
      await this.professionals.load();
      this.show(
        published
          ? 'Perfil salvo e publicado! As clientes já podem encontrar você.'
          : !visible
            ? 'Perfil salvo, mas oculto. Marque "Mostrar meu perfil para as clientes" para publicar.'
            : `Perfil salvo, mas ainda não publicado. Falta: ${this.missing.join(', ')}.`,
      );
    } catch (error) {
      console.error('Failed to save profile', error);
      this.show('Não foi possível salvar. Tente novamente.');
    } finally {
      this.saving.set(false);
    }
  }

  protected signOut() {
    this.router.navigateByUrl('/pro/entrar');
    this.auth.signOut().catch((error) => console.error('Sign out failed', error));
  }
}
