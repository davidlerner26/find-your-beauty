import { MatIconModule } from '@angular/material/icon';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { ProfessionalDraft, ProfessionalDrafts } from '../../services/professional-drafts';
import { inviteStatus } from '../../utils/drafts';
import { formatRelative } from '../../utils/format-date';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';

// The profiles an admin made for professionals who have no account yet, and the state of each invite
@Component({
  selector: 'app-admin-drafts',
  imports: [RouterLink, Spinner, MatIconModule],
  templateUrl: './admin-drafts.html',
  styleUrl: './admin-drafts.scss',
})
export class AdminDrafts {
  private readonly drafts = inject(ProfessionalDrafts);

  protected readonly paths = PATHS;
  protected readonly list = signal<ProfessionalDraft[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  // Id of the draft whose invite is being sent
  protected readonly working = signal<string | null>(null);
  protected readonly status = inviteStatus;
  protected readonly relative = formatRelative;

  constructor() {
    this.load();
  }

  private async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.list.set(await this.drafts.list());
    } catch (error) {
      log.error('Failed to load the drafts', error);
      this.error.set($localize`Não foi possível carregar os perfis.`);
    } finally {
      this.loading.set(false);
    }
  }

  protected async invite(draft: ProfessionalDraft) {
    this.working.set(draft.id);
    this.error.set('');
    this.message.set('');
    try {
      await this.drafts.sendInvite(draft.id);
      this.message.set($localize`Convite enviado para ${draft.form.email}:email:.`);
      this.list.set(await this.drafts.list());
    } catch (error) {
      log.error('Failed to send the invite', error);
      this.error.set($localize`Não foi possível enviar o convite. Tente novamente.`);
    } finally {
      this.working.set(null);
    }
  }
}
