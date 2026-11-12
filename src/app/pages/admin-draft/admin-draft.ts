import { MatIconModule } from '@angular/material/icon';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PhotoPositioner } from '../../components/photo-positioner/photo-positioner';
import { Spinner } from '../../components/spinner/spinner';
import { SERVICE_PLACES } from '../../models/professional';
import { ProfessionalDraft, ProfessionalDrafts } from '../../services/professional-drafts';
import { copyText } from '../../utils/clipboard';
import { formatCpf } from '../../utils/cpf';
import {
  DraftForm,
  draftMissing,
  draftNeedsAddress,
  draftProblems,
  emptyDraftForm,
  inviteStatus,
} from '../../utils/drafts';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';
import { formatPhone } from '../../utils/phone';
import { AddressField } from '../pro-profile/address-field/address-field';
import { AvailabilityEditor } from '../pro-profile/availability-editor/availability-editor';
import { ServicesEditor } from '../pro-profile/services-editor/services-editor';

// Makes or edits a profile for a professional who has no account yet. It has everything of the sign up of a
// professional (CPF, photos, address, services, hours), except connecting the Instagram: that needs her own login, so
// here it is only the link. What is left empty she completes after claiming the profile.
@Component({
  selector: 'app-admin-draft',
  imports: [
    FormsModule,
    RouterLink,
    Spinner,
    MatIconModule,
    PhotoPositioner,
    AddressField,
    AvailabilityEditor,
    ServicesEditor,
  ],
  templateUrl: './admin-draft.html',
  styleUrl: './admin-draft.scss',
})
export class AdminDraft {
  private readonly drafts = inject(ProfessionalDrafts);
  private readonly router = inject(Router);

  protected readonly paths = PATHS;
  protected form: DraftForm = emptyDraftForm();
  protected readonly servicePlaces = SERVICE_PLACES;
  // Photos that the draft no longer uses: deleted from the storage once it is saved
  private removedPhotos: string[] = [];
  protected id = '';
  protected isNew = true;
  protected readonly draft = signal<ProfessionalDraft | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadingGallery = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly status = computed(() => {
    const draft = this.draft();
    return draft ? inviteStatus(draft) : 'none';
  });
  // The link that was just made, shown to be copied by hand when the browser did not copy it
  protected readonly made = signal<{ url: string; copied: boolean } | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.isNew = id === 'novo';
    this.id = this.isNew ? this.drafts.newId() : id;
    if (this.isNew) this.loading.set(false);
    else this.load();
  }

  private async load() {
    try {
      const draft = await this.drafts.get(this.id);
      if (!draft) {
        await this.router.navigateByUrl(PATHS.adminDrafts);
        return;
      }
      this.draft.set(draft);
      this.form = draft.form;
    } catch (error) {
      log.error('Failed to load the draft', error);
      this.error.set($localize`Não foi possível carregar o perfil.`);
    } finally {
      this.loading.set(false);
    }
  }

  protected get problems() {
    return this.submitted() ? draftProblems(this.form) : [];
  }

  // What is left for the profile to be public once she claims it (it is not blocking: she can finish it herself)
  protected get missingText() {
    const missing = draftMissing(this.form);
    return missing.length ? missing.join(', ') : '';
  }

  protected hasPlace(place: 'studio' | 'home') {
    return this.form.serviceMode === place || this.form.serviceMode === 'both';
  }

  // Each place is switched on or off on its own; both on is 'both'
  protected togglePlace(place: 'studio' | 'home') {
    const studio = this.hasPlace('studio') !== (place === 'studio');
    const home = this.hasPlace('home') !== (place === 'home');
    this.form.serviceMode = studio && home ? 'both' : studio ? 'studio' : home ? 'home' : null;
  }

  protected get needsAddress() {
    return draftNeedsAddress(this.form);
  }

  protected onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.form.cpf = formatCpf(input.value);
    input.value = this.form.cpf;
  }

  protected onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.form.phone = formatPhone(input.value);
    input.value = this.form.phone;
  }

  protected discardPhotos(urls: string[]) {
    this.removedPhotos.push(...urls);
  }

  protected showUploadError(error: unknown) {
    log.error('Failed to upload the photo', error);
    this.error.set($localize`Não foi possível enviar a foto. Use uma imagem e tente novamente.`);
  }

  protected async uploadPhoto(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      const previous = this.form.image;
      this.form.image = await this.drafts.uploadPhoto(this.id, 'profile', file);
      // A new photo starts centered; the old one is only deleted once the draft is saved with the new one
      this.form.imagePosition = { x: 50, y: 50 };
      if (previous) this.removedPhotos.push(previous);
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
    this.error.set('');
    try {
      const urls = await Promise.all(
        files.map((file) => this.drafts.uploadPhoto(this.id, 'gallery', file)),
      );
      this.form.gallery = [...this.form.gallery, ...urls];
    } catch (error) {
      this.showUploadError(error);
    } finally {
      this.uploadingGallery.set(false);
    }
  }

  protected removeGalleryPhoto(url: string) {
    this.form.gallery = this.form.gallery.filter((photo) => photo !== url);
    this.removedPhotos.push(url);
  }

  // Saves, and makes the invite link when asked (it is copied and shown here: the admin sends it by hand)
  protected async save(withLink: boolean) {
    this.submitted.set(true);
    if (draftProblems(this.form).length) return;

    this.saving.set(true);
    this.error.set('');
    this.made.set(null);
    try {
      await this.drafts.save(this.id, this.form, this.isNew);
      // Only deletes the removed photos once the draft no longer points to them
      await Promise.all(this.removedPhotos.map((url) => this.drafts.removePhoto(url)));
      this.removedPhotos = [];
      if (!withLink) {
        await this.router.navigateByUrl(PATHS.adminDrafts);
        return;
      }
      const url = await this.drafts.createInviteLink(this.id);
      this.made.set({ url, copied: await copyText(url) });
      // From now on it is an existing draft with a link
      this.isNew = false;
      this.draft.set(await this.drafts.get(this.id));
    } catch (error) {
      log.error('Failed to save the draft', error);
      this.error.set($localize`Não foi possível salvar. Tente novamente.`);
    } finally {
      this.saving.set(false);
    }
  }

  protected selectAll(event: Event) {
    (event.target as HTMLInputElement).select();
  }

  protected async revoke() {
    if (!confirm($localize`Cancelar o link? O link enviado deixa de funcionar.`)) return;
    try {
      await this.drafts.revokeInvite(this.id);
      this.draft.update((draft) =>
        draft ? { ...draft, invited: false, inviteExpiresAt: null } : draft,
      );
    } catch (error) {
      log.error('Failed to cancel the invite', error);
      this.error.set($localize`Não foi possível cancelar o link.`);
    }
  }

  protected async remove() {
    if (
      !confirm($localize`Apagar o perfil de ${this.form.name}:name:? Isso não pode ser desfeito.`)
    )
      return;
    try {
      await this.drafts.remove(this.id, [
        this.form.image,
        ...this.form.gallery,
        ...this.form.services.flatMap((service) => service.photos),
        ...this.removedPhotos,
      ]);
      await this.router.navigateByUrl(PATHS.adminDrafts);
    } catch (error) {
      log.error('Failed to delete the draft', error);
      this.error.set($localize`Não foi possível apagar o perfil.`);
    }
  }
}
