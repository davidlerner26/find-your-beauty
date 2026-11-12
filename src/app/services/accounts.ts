import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { AccountRow } from '../utils/accounts';
import { functions } from './firebase';

// The accounts of the site, for the admins (Cloud Functions: the clients' data is closed by the Firestore rules)
@Injectable({ providedIn: 'root' })
export class Accounts {
  // Up to 20 accounts that match the e-mail, name or id typed (everything when nothing is typed)
  async search(query: string) {
    const { data } = await httpsCallable<{ query: string }, { accounts: AccountRow[] }>(
      functions,
      'searchAccounts',
    )({ query });
    return data.accounts;
  }

  // Deletes the account with everything it has: Firestore, Storage and Authentication. `confirm` is what the admin
  // typed (see confirmationText).
  async remove(uid: string, confirm: string) {
    const { data } = await httpsCallable<
      { uid: string; confirm: string },
      { ok: boolean; bookings: number; conversations: number }
    >(
      functions,
      'deleteAccount',
    )({ uid, confirm });
    return data;
  }
}
