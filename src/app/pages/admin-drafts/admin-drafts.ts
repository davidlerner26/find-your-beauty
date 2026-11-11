import { MatIconModule } from '@angular/material/icon';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { ProfessionalDraft, ProfessionalDrafts } from '../../services/professional-drafts';
import { copyText } from '../../utils/clipboard';
import { inviteStatus } from '../../utils/drafts';
import { formatRelative } from '../../utils/format-date';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';

// The profiles an admin made for professionals who have no account yet, and the state of each invite link
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
  // The link that was just made, shown to be copied by hand when the browser did not copy it
  protected readonly made = signal<{ name: string; url: string; copied: boolean } | null>(null);
  // Id of the draft whose link is being made
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

  protected async makeLink(draft: ProfessionalDraft) {
    this.working.set(draft.id);
    this.error.set('');
    this.made.set(null);
    try {
      const url = await this.drafts.createInviteLink(draft.id);
      this.made.set({ name: draft.form.name, url, copied: await copyText(url) });
      this.list.set(await this.drafts.list());
    } catch (error) {
      log.error('Failed to make the invite link', error);
      this.error.set($localize`Não foi possível gerar o link. Tente novamente.`);
    } finally {
      this.working.set(null);
    }
  }

  protected selectAll(event: Event) {
    (event.target as HTMLInputElement).select();
  }
}
