import { MatIconModule } from '@angular/material/icon';
import { Component, computed, effect, input, signal, inject } from '@angular/core';
import { Spinner } from '../../components/spinner/spinner';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { parseInstagram } from '../../utils/instagram';
import { formatCpf, isValidCpf } from '../../utils/cpf';
import { formatPhone } from '../../utils/phone';
import {
  Availability,
  Professional,
  DateRange,
  ImagePosition,
  DEFAULT_AVAILABILITY,
  Service,
  ServiceCategory,
  SERVICE_PLACES,
  ServiceMode,
} from '../../models/professional';
import { maskDuration, parseDuration } from '../../utils/duration';
import { maskMoney, parseMoney } from '../../utils/money';
import { toDateKey } from '../../utils/slots';
import { Auth } from '../../services/auth';
import { ProfessionalAccounts } from '../../services/professional-accounts';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { Photos } from '../../services/photos';
import { Feedback } from '../../services/feedback';
import { PhotoPositioner } from '../../components/photo-positioner/photo-positioner';
import {
  DateRangePicker,
  PendingRange,
} from '../../components/date-range-picker/date-range-picker';
import { Instagram } from '../../services/instagram';
import { Professionals } from '../../services/professionals';
import { APP_LANGUAGE, INTL_LOCALE } from '../../utils/locale';
import { CatalogPipe } from '../../utils/catalog.pipe';
import { log } from '../../utils/log';
import {
  addBlockedRange,
  aboutToParagraphs,
  invalidDayKeys,
  missingFields,
  paragraphsToAbout,
  rangeLabel,
  toAvailabilityDraft,
} from './profile-form';
import {
  isRuleComplete,
  isServiceComplete,
  newRuleDraft,
  newServiceDraft,
  PriceRuleDraft,
  ServiceDraft,
  serviceNamesOf,
  setCategory,
  toggleRuleDay,
  toService,
  toServiceDraft,
} from './service-draft';

type AddressSuggestion = { text: string; prediction: google.maps.places.PlacePrediction };

@Component({
  selector: 'app-pro-profile',
  imports: [CatalogPipe, PhotoPositioner, DateRangePicker, Spinner, FormsModule, MatIconModule],
  templateUrl: './pro-profile.html',
  styleUrl: './pro-profile.scss',
})
export class ProProfile {
  private readonly auth = inject(Auth);
  private readonly accounts = inject(ProfessionalAccounts);
  private readonly professionals = inject(Professionals);
  private readonly router = inject(Router);
  private readonly photos = inject(Photos);
  private readonly maps = inject(GoogleMapsLoader);
  protected readonly instagramService = inject(Instagram);
  private readonly feedback = inject(Feedback);

  // Second step of the sign up: the same form, but the profile has to be complete to be sent
  readonly signup = input(false);

  protected readonly categories: ServiceCategory[] = ['Maquiagem', 'Cabelo'];

  protected name = '';
  protected phone = '';
  // Private: kept in professionals/{id}/private/identity, not in the public profile
  // A signal behind the property: the CPF arrives after the form is shown, and the screen has to follow
  private readonly cpfText = signal('');
  protected get cpf() {
    return this.cpfText();
  }
  protected set cpf(value: string) {
    this.cpfText.set(value);
  }
  private savedCpf = '';
  private reloadedList = false;
  protected instagram = '';
  protected image = '';
  protected readonly imagePosition = signal<ImagePosition>({ x: 50, y: 50 });
  protected gallery: string[] = [];
  private removedPhotos: string[] = [];
  protected address = '';
  protected readonly servicePlaces = SERVICE_PLACES;
  // Nothing is chosen on a new sign up: the professional has to pick one
  protected readonly serviceMode = signal<ServiceMode | null>(null);
  protected about = '';
  protected services: ServiceDraft[] = [];
  protected readonly serviceTried = signal(false);
  protected position = { lat: 0, lng: 0 };
  protected availability: Availability = structuredClone(DEFAULT_AVAILABILITY);
  protected readonly today = toDateKey(new Date());
  protected readonly pending = signal<PendingRange>({ start: null, end: null });

  // Monday first, as in the Brazilian calendar
  protected readonly weekdays = [
    { key: '1', label: $localize`Segunda` },
    { key: '2', label: $localize`Terça` },
    { key: '3', label: $localize`Quarta` },
    { key: '4', label: $localize`Quinta` },
    { key: '5', label: $localize`Sexta` },
    { key: '6', label: $localize`Sábado` },
    { key: '0', label: $localize`Domingo` },
  ];

  protected readonly visible = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  // A new one each time a message is shown, so the floating message starts over
  protected messageId = 0;
  // Address search (Google Places): the address only counts once a suggestion was chosen
  protected readonly suggestions = signal<AddressSuggestion[]>([]);
  protected readonly addressOpen = signal(false);
  protected readonly addressConfirmed = signal(false);
  protected readonly addressError = signal('');
  private addressTimer?: ReturnType<typeof setTimeout>;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  // The profile photo and the gallery have their own loading
  protected readonly uploading = signal(false);
  protected readonly uploadingGallery = signal(false);
  private filled = false;

  private readonly uid = computed(() => this.auth.user()?.uid ?? '');
  protected readonly profile = computed(() => this.professionals.byId(this.uid()));

  constructor() {
    // The profile document may have been created after the list of professionals was loaded (first step of the
    // sign up, with e-mail or Google): the list is read again, once, when the profile is not in it
    effect(() => {
      if (
        this.reloadedList ||
        !this.uid() ||
        this.profile() ||
        this.professionals.status() !== 'ready'
      )
        return;
      this.reloadedList = true;
      void this.professionals.load();
    });

    // Fills the form once, when the profile document arrives
    effect(() => {
      const profile = this.profile();
      if (!profile || this.filled) return;

      this.filled = true;
      this.name = profile.name;
      this.phone = profile.phone ? formatPhone(profile.phone) : '';
      this.instagram = profile.instagram ? '@' + profile.instagram : '';
      // Accounts from when there were two photos: the old cover is used when there is no profile photo
      const legacy = profile as Professional & {
        coverImage?: string;
        coverPosition?: ImagePosition;
      };
      this.image = profile.image || legacy.coverImage || '';
      this.imagePosition.set(
        (profile.image ? profile.imagePosition : legacy.coverPosition) ?? { x: 50, y: 50 },
      );
      this.gallery = [...profile.gallery];
      this.address = profile.address;
      // Profiles from before this choice existed work at their address
      this.serviceMode.set(profile.serviceMode ?? (profile.address ? 'studio' : null));
      this.about = paragraphsToAbout(profile.about);
      this.services = profile.services.map(toServiceDraft);
      this.position = { ...profile.position };
      this.addressConfirmed.set(this.hasPosition);
      this.availability = toAvailabilityDraft(profile.availability);
      this.visible.set(profile.visible !== false);
      void this.loadCpf();
    });
  }

  protected hasPlace(place: 'studio' | 'home') {
    const mode = this.serviceMode();
    return mode === place || mode === 'both';
  }

  // Each place is switched on or off on its own; both on is 'both'
  protected togglePlace(place: 'studio' | 'home') {
    const studio = this.hasPlace('studio') !== (place === 'studio');
    const home = this.hasPlace('home') !== (place === 'home');
    this.serviceMode.set(studio && home ? 'both' : studio ? 'studio' : home ? 'home' : null);
  }

  // Only home-only professionals work without an address
  protected get needsAddress() {
    return this.serviceMode() !== 'home';
  }

  protected get hasPosition() {
    return this.position.lat !== 0 || this.position.lng !== 0;
  }

  // What is missing before the profile can be shown to clients
  protected get missing() {
    return missingFields({
      name: this.name,
      cpf: this.cpf,
      image: this.image,
      hasServiceMode: !!this.serviceMode(),
      needsAddress: this.needsAddress,
      address: this.address,
      addressConfirmed: this.addressConfirmed(),
      services: this.services,
    });
  }

  // The floating message that was tapped away (it shows again when its text changes)
  protected readonly dismissedText = signal('');

  protected get missingText() {
    return `Para ${this.signup() ? 'enviar o cadastro' : 'publicar'} falta: ${this.missing.join(', ')}.`;
  }

  // Days where the closing time isn't after the opening time
  protected get invalidDays() {
    const invalid = invalidDayKeys(
      this.availability,
      this.weekdays.map(({ key }) => key),
    );
    return this.weekdays.filter(({ key }) => invalid.includes(key));
  }

  protected blockPending() {
    if (!this.pending().start) return;

    this.availability.blockedRanges = addBlockedRange(
      this.availability.blockedRanges,
      this.pending(),
    );
    this.pending.set({ start: null, end: null });
    // Blocking a period saves right away
    this.autoSave();
  }

  protected unblock(range: DateRange) {
    this.availability.blockedRanges = this.availability.blockedRanges.filter((r) => r !== range);
    this.autoSave();
  }

  protected readonly rangeLabel = rangeLabel;

  // Shows the feedback at the top of the page and brings it into view
  private show(text: string, milliseconds = 5500) {
    const id = ++this.messageId;
    this.message.set(text);
    // The message of what is missing doesn't pop up again behind it, until the list changes
    this.dismissedText.set(this.missingText);
    // Floats on top and goes away by itself, like the message of what is missing
    setTimeout(() => this.messageId === id && this.message.set(''), milliseconds);
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

    this.uploadingGallery.set(true);
    this.message.set('');
    try {
      const urls = await Promise.all(
        files.map((file) => this.photos.upload(this.uid(), 'gallery', file)),
      );
      this.gallery = [...this.gallery, ...urls];
      this.autoSave();
    } catch (error) {
      this.showUploadError(error);
    } finally {
      this.uploadingGallery.set(false);
    }
  }

  // Photos of a service: the id of the service that is uploading
  protected readonly uploadingService = signal<string | null>(null);

  protected async uploadServicePhotos(service: ServiceDraft, input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    this.uploadingService.set(service.id);
    try {
      const urls = await Promise.all(
        files.map((file) => this.photos.upload(this.uid(), 'services', file)),
      );
      service.photos = [...service.photos, ...urls];
      this.autoSave();
    } catch (error) {
      this.showUploadError(error);
    } finally {
      this.uploadingService.set(null);
    }
  }

  protected removeServicePhoto(service: ServiceDraft, url: string) {
    service.photos = service.photos.filter((photo) => photo !== url);
    this.removedPhotos.push(url);
    this.autoSave();
  }

  protected removeGalleryPhoto(url: string) {
    this.gallery = this.gallery.filter((photo) => photo !== url);
    this.removedPhotos.push(url);
    this.autoSave();
  }

  private showUploadError(error: unknown) {
    log.error('Upload failed', error);
    this.show($localize`Não foi possível enviar a foto. Use uma imagem e tente novamente.`);
  }

  protected readonly serviceNames = serviceNamesOf;
  protected readonly setCategory = setCategory;

  protected addService() {
    this.services = [...this.services, newServiceDraft()];
  }

  protected readonly serviceComplete = isServiceComplete;
  protected readonly ruleComplete = isRuleComplete;
  protected readonly toggleRuleDay = toggleRuleDay;

  protected readonly parseDuration = parseDuration;
  protected readonly parseMoney = parseMoney;

  // Other prices of a service: on some days of the week and times
  protected readonly ruleDays = [
    { day: 1, label: $localize`Seg` },
    { day: 2, label: $localize`Ter` },
    { day: 3, label: $localize`Qua` },
    { day: 4, label: $localize`Qui` },
    { day: 5, label: $localize`Sex` },
    { day: 6, label: $localize`Sáb` },
    { day: 0, label: $localize`Dom` },
  ];

  // "Início do dia" and "Fim do dia" stand for the whole edge of the day (the end is not included)
  protected readonly dayStart = '00:00';
  protected readonly dayEnd = '24:00';

  protected addRule(service: ServiceDraft) {
    service.priceRules = [...service.priceRules, newRuleDraft()];
  }

  protected removeRule(service: ServiceDraft, rule: PriceRuleDraft) {
    service.priceRules = service.priceRules.filter((r) => r !== rule);
    this.autoSave();
  }

  protected onRulePriceInput(rule: PriceRuleDraft, event: Event) {
    const input = event.target as HTMLInputElement;
    rule.price = maskMoney(input.value);
    input.value = rule.price;
  }

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
    // Its photos go away from the storage once the profile is saved
    this.removedPhotos.push(...service.photos);
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
        language: INTL_LOCALE,
        region: 'br',
      });

      // The user kept typing while this was loading: that answer is already old
      if (input !== this.address) return;

      this.suggestions.set(
        suggestions.flatMap((suggestion) =>
          suggestion.placePrediction
            ? [
                {
                  text: suggestion.placePrediction.text.text,
                  prediction: suggestion.placePrediction,
                },
              ]
            : [],
        ),
      );
      this.addressOpen.set(true);
    } catch (error) {
      log.error('Address search failed', error);
      this.suggestions.set([]);
      this.addressError.set(
        $localize`Não foi possível buscar endereços agora. Tente novamente em instantes.`,
      );
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
      log.error('Failed to load the place', error);
      this.addressError.set($localize`Não foi possível carregar este endereço. Escolha outro.`);
    }
  }

  protected closeAddressList() {
    this.addressOpen.set(false);
  }

  private async loadCpf() {
    try {
      this.savedCpf = await this.accounts.getCpf(this.uid());
      // What was typed before the answer came is kept
      if (!this.cpf) this.cpf = formatCpf(this.savedCpf);
    } catch (error) {
      log.error('Failed to load the CPF', error);
    }
  }

  protected get cpfValid() {
    return isValidCpf(this.cpf);
  }

  protected onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.phone = formatPhone(input.value);
    input.value = this.phone;
  }

  protected onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.cpf = formatCpf(input.value);
    input.value = this.cpf;
  }

  // Only a valid CPF is saved, and only when it changed
  private async saveCpf() {
    if (!isValidCpf(this.cpf) || this.cpf === this.savedCpf) return;
    await this.accounts.saveCpf(this.uid(), this.cpf);
    this.savedCpf = this.cpf;
  }

  // The services that are filled in, ready to be saved
  private completeServices(): Service[] {
    return this.services.filter(isServiceComplete).map(toService);
  }

  // What the form writes to the profile. `instagram` and `place` are left out when they can't be saved yet.
  private profileFields(services: Service[], instagram: string | undefined, draft = false) {
    // A draft keeps the previous address until a suggestion is chosen, and the previous hours while they are invalid
    const keepAddress = draft && this.needsAddress && !this.addressConfirmed();
    const keepHours = draft && this.invalidDays.length > 0;
    return {
      name: this.name.trim(),
      phone: this.phone.trim(),
      ...(instagram === undefined ? {} : { instagram }),
      image: this.image.trim(),
      imagePosition: this.imagePosition(),
      serviceMode: this.serviceMode(),
      lang: APP_LANGUAGE,
      ...(keepAddress
        ? {}
        : {
            // Home-only professionals have no address on the map
            address: this.needsAddress ? this.address.trim() : '',
            position: this.needsAddress ? this.position : { lat: 0, lng: 0 },
          }),
      about: aboutToParagraphs(this.about),
      services,
      tags: [...new Set(services.map((service) => service.category))],
      gallery: this.gallery,
      ...(keepHours
        ? {}
        : {
            availability: {
              slotMinutes: Number(this.availability.slotMinutes),
              weekly: this.availability.weekly,
              blockedRanges: this.availability.blockedRanges,
            },
          }),
    };
  }

  // Saved by itself when a field loses focus: a draft, nothing is sent for approval
  private autoSaveTimer?: ReturnType<typeof setTimeout>;
  private lastSaved = '';

  // What is compared to know whether there is anything new to save
  private snapshot(fields: object) {
    return JSON.stringify({ ...fields, cpf: this.cpf });
  }

  protected autoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.saveDraft(), 400);
  }

  private async saveDraft() {
    if (!this.filled || this.saving()) return;
    const instagram = parseInstagram(this.instagram);
    const fields = this.profileFields(
      this.completeServices(),
      instagram === null ? undefined : instagram,
      true,
    );
    // Once the sign up is sent, `visible` and `published` follow the form; before, the profile isn't shown anyway
    const visible = this.visible();
    const status = this.signup()
      ? {}
      : { visible, published: visible && this.missing.length === 0 };
    const snapshot = this.snapshot({ ...fields, ...status });
    if (snapshot === this.lastSaved) return;

    try {
      await this.accounts.update(this.uid(), { ...fields, ...status });
      await this.saveCpf();
      this.lastSaved = snapshot;
      // A short toast, like the other messages of the screen
      this.show($localize`Alterações salvas`, 2500);
    } catch (error) {
      log.error('Failed to auto save the profile', error);
    }
  }

  protected async save() {
    clearTimeout(this.autoSaveTimer);
    if (this.invalidDays.length) {
      this.show($localize`O horário de fechamento precisa ser depois do de abertura.`);
      return;
    }

    const instagram = parseInstagram(this.instagram);
    if (instagram === null) {
      this.show($localize`Usuário do Instagram inválido. Use o formato @usuario.`);
      return;
    }

    if (this.signup() && this.missing.length) {
      this.serviceTried.set(true);
      this.show(`Para enviar o cadastro falta: ${this.missing.join(', ')}.`);
      return;
    }

    this.serviceTried.set(true);
    if (!this.services.every((service) => this.serviceComplete(service))) {
      this.show(
        $localize`Preencha todos os campos obrigatórios dos serviços ou remova os que estiverem vazios.`,
      );
      return;
    }

    this.saving.set(true);
    this.message.set('');

    const services = this.completeServices();
    // Clients only see profiles that are visible and complete
    const visible = this.visible();
    const published = visible && this.missing.length === 0;

    try {
      const fields = this.profileFields(services, instagram);
      await this.accounts.update(this.uid(), {
        ...fields,
        visible,
        published,
        // Sign up finished: the account now waits for an admin
        // (a denied sign up is sent again: the denial is cleared)
        ...(this.signup() ? { submitted: true } : {}),
        ...(this.signup() && this.profile()?.rejected ? { rejected: false } : {}),
      });
      await this.saveCpf();
      this.lastSaved = this.snapshot(fields);
      // Only deletes the removed photos once the profile no longer points to them
      await Promise.all(this.removedPhotos.map((url) => this.photos.remove(url)));
      this.removedPhotos = [];
      if (this.signup()) {
        await this.auth.finishSignup();
        return;
      }
      await this.professionals.load();
      this.show(
        published
          ? $localize`Perfil salvo e publicado! Os clientes já podem encontrar você.`
          : !visible
            ? $localize`Perfil salvo, mas oculto. Marque "Mostrar meu perfil para os clientes" para publicar.`
            : $localize`Perfil salvo, mas ainda não publicado. Falta: ${this.missing.join(', ')}:missing:.`,
      );
    } catch (error) {
      log.error('Failed to save profile', error);
      this.show($localize`Não foi possível salvar. Tente novamente.`);
    } finally {
      this.saving.set(false);
    }
  }

  protected readonly instagramBusy = signal(false);

  protected connectInstagram() {
    this.instagramService.connect();
  }

  protected async refreshInstagram() {
    this.instagramBusy.set(true);
    try {
      const { photos } = await this.instagramService.refresh();
      await this.professionals.load();
      this.show($localize`Fotos do Instagram atualizadas (${photos}:photos:).`);
    } catch (error) {
      log.error('Failed to refresh Instagram', error);
      this.show($localize`Não foi possível atualizar as fotos do Instagram. Tente novamente.`);
    } finally {
      this.instagramBusy.set(false);
    }
  }

  protected async disconnectInstagram() {
    if (
      !confirm(
        $localize`Desconectar o Instagram? As fotos importadas deixam de aparecer no seu perfil.`,
      )
    )
      return;

    this.instagramBusy.set(true);
    try {
      await this.instagramService.disconnect();
      await this.professionals.load();
      this.show($localize`Instagram desconectado.`);
    } catch (error) {
      log.error('Failed to disconnect Instagram', error);
      this.show($localize`Não foi possível desconectar. Tente novamente.`);
    } finally {
      this.instagramBusy.set(false);
    }
  }

  protected signOut() {
    this.router.navigateByUrl('/pro/entrar');
    this.auth
      .signOut()
      .then(() => this.feedback.show($localize`Você saiu da conta`))
      .catch((error) => log.error('Sign out failed', error));
  }
}
