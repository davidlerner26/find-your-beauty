import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('shared/domain.ts', () => {
  // The Cloud Functions have their own copy: it must be the one that is edited at shared/domain.ts
  it('is the same in the Cloud Functions copy', () => {
    expect(() =>
      execFileSync('node', ['scripts/sync-shared.cjs', '--check'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});
