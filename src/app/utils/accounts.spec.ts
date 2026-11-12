import { confirmationMatches, confirmationText } from './accounts';

describe('confirmationMatches', () => {
  const account = { uid: 'u1', email: 'Ana@Example.com' };

  it('asks for the e-mail, without caring about the case or the spaces', () => {
    expect(confirmationText(account)).toBe('Ana@Example.com');
    expect(confirmationMatches(account, ' ana@example.com ')).toBe(true);
    expect(confirmationMatches(account, 'ana@example')).toBe(false);
    expect(confirmationMatches(account, '')).toBe(false);
  });

  it('asks for the id when the account has no e-mail', () => {
    expect(confirmationText({ uid: 'u1', email: '' })).toBe('u1');
    expect(confirmationMatches({ uid: 'u1', email: '' }, 'U1')).toBe(true);
  });
});
