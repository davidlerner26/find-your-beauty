import { TestBed } from '@angular/core/testing';
import { Instagram } from './instagram';

// The Cloud Functions are replaced: each callable answers what the test says
const answers = vi.hoisted(() => ({ calls: [] as { name: string; data: unknown }[] }));

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  connectFunctionsEmulator: () => undefined,
  httpsCallable: (_functions: unknown, name: string) => async (data: unknown) => {
    answers.calls.push({ name, data });
    return { data: { username: 'ana.makeup', photos: 12 } };
  },
}));

describe('Instagram.finish', () => {
  beforeEach(() => {
    answers.calls.length = 0;
    sessionStorage.setItem('instagram-oauth-state', 'state-1');
  });

  it('sends the code with the redirect address, without the "#_" Instagram appends', async () => {
    const result = await TestBed.inject(Instagram).finish('abc#_', 'state-1');
    expect(result.username).toBe('ana.makeup');
    expect(answers.calls).toEqual([
      {
        name: 'connectInstagram',
        data: { code: 'abc', redirectUri: `${location.origin}/pro/instagram` },
      },
    ]);
  });

  it('never sends the same code twice: a code works once', async () => {
    const instagram = TestBed.inject(Instagram);
    const [first, second] = await Promise.all([
      instagram.finish('abc', 'state-1'),
      instagram.finish('abc', 'state-1'),
    ]);
    expect(second).toBe(first);
    expect(answers.calls).toHaveLength(1);
  });

  it('refuses a return whose state is not the one that was sent', async () => {
    await expect(TestBed.inject(Instagram).finish('abc', 'other')).rejects.toThrow('invalid-state');
    expect(answers.calls).toHaveLength(0);
  });
});
