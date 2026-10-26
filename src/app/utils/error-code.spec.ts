import { errorCode } from './error-code';

describe('errorCode', () => {
  it('reads the code of an error', () => {
    expect(errorCode({ code: 'auth/wrong-password' })).toBe('auth/wrong-password');
    expect(errorCode(Object.assign(new Error('x'), { code: 'permission-denied' }))).toBe(
      'permission-denied',
    );
  });

  it('is undefined for anything without one, including null', () => {
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode(undefined)).toBeUndefined();
    expect(errorCode('boom')).toBeUndefined();
    expect(errorCode(new Error('x'))).toBeUndefined();
  });
});
