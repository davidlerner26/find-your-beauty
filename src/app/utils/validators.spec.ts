import { authErrorMessage, isValidEmail, isValidPassword } from './validators';

describe('isValidEmail', () => {
  it('accepts normal addresses, ignoring surrounding spaces', () => {
    expect(isValidEmail('maria@example.com')).toBe(true);
    expect(isValidEmail('  maria.silva+beleza@mail.example.com.br ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    for (const email of ['', 'maria', 'maria@', '@example.com', 'maria@example', 'a b@c.com']) {
      expect(isValidEmail(email)).toBe(false);
    }
  });
});

describe('isValidPassword', () => {
  it('needs 6+ characters with a letter, a number and a special character', () => {
    expect(isValidPassword('abc12!')).toBe(true);
    expect(isValidPassword('Sénha1@')).toBe(true);
  });

  it('rejects the missing pieces', () => {
    expect(isValidPassword('ab1!')).toBe(false);
    expect(isValidPassword('abcdef1')).toBe(false);
    expect(isValidPassword('abcdef!')).toBe(false);
    expect(isValidPassword('123456!')).toBe(false);
    expect(isValidPassword('abc 12')).toBe(false);
  });
});

describe('authErrorMessage', () => {
  it('does not tell a wrong password from an unknown e-mail', () => {
    const wrong = authErrorMessage({ code: 'auth/wrong-password' });
    expect(authErrorMessage({ code: 'auth/user-not-found' })).toBe(wrong);
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe(wrong);
  });

  it('falls back to a generic message', () => {
    const generic = authErrorMessage({ code: 'auth/unknown-thing' });
    expect(generic).toBeTruthy();
    expect(authErrorMessage(null)).toBe(generic);
    expect(authErrorMessage(new Error('boom'))).toBe(generic);
  });
});
