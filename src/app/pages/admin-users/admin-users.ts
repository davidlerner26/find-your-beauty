import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Spinner } from '../../components/spinner/spinner';
import { Accounts } from '../../services/accounts';
import { Feedback } from '../../services/feedback';
import { AccountRow, confirmationMatches, confirmationText } from '../../utils/accounts';
import { log } from '../../utils/log';
import { PATHS } from '../../utils/paths';

// An admin finds an account and deletes it with everything it has (Firestore, Storage and Authentication)
@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, RouterLink, Spinner],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers {
  private readonly accounts = inject(Accounts);
  private readonly feedback = inject(Feedback);

  protected readonly paths = PATHS;
  protected query = '';
  protected readonly list = signal<AccountRow[]>([]);
  protected readonly searched = signal(false);
  protected readonly searching = signal(false);
  protected readonly error = signal('');
  // The account that is about to be deleted, and what the admin typed to confirm it
  protected readonly selected = signal<AccountRow | null>(null);
  protected typed = '';
  protected readonly deleting = signal(false);
  protected readonly confirmationText = confirmationText;

  protected get confirmed() {
    const account = this.selected();
    return !!account && confirmationMatches(account, this.typed);
  }

  protected async search() {
    this.searching.set(true);
    this.error.set('');
    this.selected.set(null);
    try {
      this.list.set(await this.accounts.search(this.query));
      this.searched.set(true);
    } catch (error) {
      log.error('Failed to search the accounts', error);
      this.error.set($localize`Não foi possível buscar os usuários.`);
    } finally {
      this.searching.set(false);
    }
  }

  protected choose(account: AccountRow) {
    this.selected.set(account);
    this.typed = '';
    this.error.set('');
  }

  protected async remove() {
    const account = this.selected();
    if (!account || !this.confirmed) return;

    this.deleting.set(true);
    this.error.set('');
    try {
      await this.accounts.remove(account.uid, this.typed);
      this.list.update((list) => list.filter((row) => row.uid !== account.uid));
      this.selected.set(null);
      this.feedback.show($localize`Usuário apagado: ${account.name || account.email}:name:`, 5000);
    } catch (error) {
      log.error('Failed to delete the account', error);
      const message = (error as { message?: string }).message ?? '';
      this.error.set(
        message.includes('payment still open')
          ? $localize`Este usuário tem um agendamento com pagamento em aberto. Cancele o agendamento antes de apagar.`
          : $localize`Não foi possível apagar o usuário. Tente novamente.`,
      );
    } finally {
      this.deleting.set(false);
    }
  }
}
