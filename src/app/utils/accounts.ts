// What the admin sees of an account of Firebase Authentication (see functions/src/accounts.ts)
export type AccountRow = {
  uid: string;
  email: string;
  name: string;
  role: 'professional' | 'client' | 'none';
  admin: boolean;
  createdAt: string;
};

const clean = (value: string) => value.trim().toLowerCase();

// The admin confirms the deletion by typing the e-mail of the account (its id, for one without an e-mail). The
// server checks it again.
export const confirmationText = (account: Pick<AccountRow, 'uid' | 'email'>) =>
  account.email || account.uid;

export const confirmationMatches = (account: Pick<AccountRow, 'uid' | 'email'>, typed: string) =>
  clean(typed) === clean(confirmationText(account));
