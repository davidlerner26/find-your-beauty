import { MatIconModule } from '@angular/material/icon';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { ProfessionalDraft, ProfessionalDrafts } from '../../services/professional-drafts';
import { DraftForm, draftProblems, inviteStatus } from '../../utils/drafts';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';

const EMPTY: DraftForm = {
  name: '',
  email: '',
  phone: '',
  lang: 'pt',
  instagram: '',
  about: '',
  image: '',
};

// Makes or edits a profile for a professional who has no account yet. Only the basics: the professional completes
// the services, hours, address and CPF herself after claiming it.
@Component({
  selector: 'app-admin-draft',
  imports: [FormsModule, RouterLink, Spinner, MatIconModule],
  templateUrl: './admin-draft.html',
  styleUrl: './admin-draft.scss',
})
export class AdminDraft {
  private readonly drafts = inject(ProfessionalDrafts);
  private readonly router = inject(Router);

  protected readonly paths = PATHS;
  protected form: DraftForm = { ...EMPTY };
  protected id = '';
  protected isNew = true;
  protected readonly draft = signal<ProfessionalDraft | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly status = computed(() => {
    const draft = this.draft();
    return draft ? inviteStatus(draft) : 'none';
  });
  // The e-mail the invite went to: changing it cancels that invite
  private savedEmail = '';

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
      this.form = { ...draft.form };
      this.savedEmail = draft.form.email.toLowerCase();
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

  protected async uploadPhoto(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      const previous = this.form.image;
      this.form.image = await this.drafts.uploadPhoto(this.id, file);
      // The old one is only deleted once the draft is saved with the new one
      if (previous && !this.isNew) await this.drafts.removePhoto(previous);
    } catch (error) {
      log.error('Failed to upload the photo', error);
      this.error.set($localize`Não foi possível enviar a foto.`);
    } finally {
      this.uploading.set(false);
    }
  }

  // Saves, and sends the invite when asked
  protected async save(sendInvite: boolean) {
    this.submitted.set(true);
    if (draftProblems(this.form).length) return;

    this.saving.set(true);
    this.error.set('');
    try {
      await this.drafts.save(this.id, this.form, this.isNew);
      // The link went to the old address: it has to stop working
      const emailChanged =
        !this.isNew &&
        this.draft()?.invited &&
        this.form.email.trim().toLowerCase() !== this.savedEmail;
      if (emailChanged) await this.drafts.revokeInvite(this.id);
      if (sendInvite) await this.drafts.sendInvite(this.id);
      await this.router.navigateByUrl(PATHS.adminDrafts);
    } catch (error) {
      log.error('Failed to save the draft', error);
      this.error.set($localize`Não foi possível salvar. Tente novamente.`);
    } finally {
      this.saving.set(false);
    }
  }

  protected async revoke() {
    if (!confirm($localize`Cancelar o convite? O link enviado deixa de funcionar.`)) return;
    try {
      await this.drafts.revokeInvite(this.id);
      this.draft.update((draft) =>
        draft ? { ...draft, invited: false, inviteExpiresAt: null } : draft,
      );
    } catch (error) {
      log.error('Failed to cancel the invite', error);
      this.error.set($localize`Não foi possível cancelar o convite.`);
    }
  }

  protected async remove() {
    if (
      !confirm($localize`Apagar o perfil de ${this.form.name}:name:? Isso não pode ser desfeito.`)
    )
      return;
    try {
      await this.drafts.remove(this.id, this.form.image);
      await this.router.navigateByUrl(PATHS.adminDrafts);
    } catch (error) {
      log.error('Failed to delete the draft', error);
      this.error.set($localize`Não foi possível apagar o perfil.`);
    }
  }
}
