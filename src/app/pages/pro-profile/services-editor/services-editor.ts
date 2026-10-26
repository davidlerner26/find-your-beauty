import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Spinner } from '../../../components/spinner/spinner';
import { ServiceCategory } from '../../../models/professional';
import { Photos } from '../../../services/photos';
import { CatalogPipe } from '../../../utils/catalog.pipe';
import { maskDuration, parseDuration } from '../../../utils/duration';
import { maskMoney, parseMoney } from '../../../utils/money';
import {
  isRuleComplete,
  newRuleDraft,
  newServiceDraft,
  PriceRuleDraft,
  ServiceDraft,
  serviceNamesOf,
  setCategory,
  toggleRuleDay,
} from '../service-draft';

// The services of the professional profile: category, name, price, duration, prices by day and time, photos.
// It edits the drafts the form hands it; saving is up to the form (it is told when something changed).
@Component({
  selector: 'app-services-editor',
  imports: [CatalogPipe, Spinner, FormsModule],
  templateUrl: './services-editor.html',
  styleUrl: './services-editor.scss',
})
export class ServicesEditor {
  private readonly photos = inject(Photos);

  readonly services = model.required<ServiceDraft[]>();
  // A save was tried: the empty required fields are highlighted
  readonly tried = input(false);
  // The account that owns the uploaded photos
  readonly uid = input.required<string>();

  // Something worth saving changed (the form saves a draft)
  readonly changed = output<void>();
  // Photos that are no longer used: the form deletes them from the storage once the profile is saved
  readonly photosRemoved = output<string[]>();
  readonly uploadFailed = output<unknown>();

  protected readonly categories: ServiceCategory[] = ['Maquiagem', 'Cabelo'];
  protected readonly parseDuration = parseDuration;
  protected readonly parseMoney = parseMoney;
  protected readonly serviceNames = serviceNamesOf;
  protected readonly setCategory = setCategory;
  protected readonly ruleComplete = isRuleComplete;
  protected readonly toggleRuleDay = toggleRuleDay;

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

  // Photos of a service: the id of the service that is uploading
  protected readonly uploadingService = signal<string | null>(null);

  protected addService() {
    this.services.update((services) => [...services, newServiceDraft()]);
  }

  protected removeService(service: ServiceDraft) {
    // Its photos go away from the storage once the profile is saved
    this.photosRemoved.emit([...service.photos]);
    this.services.update((services) => services.filter((item) => item !== service));
  }

  protected addRule(service: ServiceDraft) {
    service.priceRules = [...service.priceRules, newRuleDraft()];
  }

  protected removeRule(service: ServiceDraft, rule: PriceRuleDraft) {
    service.priceRules = service.priceRules.filter((r) => r !== rule);
    this.changed.emit();
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
    return this.tried() && empty;
  }

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
      this.changed.emit();
    } catch (error) {
      this.uploadFailed.emit(error);
    } finally {
      this.uploadingService.set(null);
    }
  }

  protected removeServicePhoto(service: ServiceDraft, url: string) {
    service.photos = service.photos.filter((photo) => photo !== url);
    this.photosRemoved.emit([url]);
    this.changed.emit();
  }
}
