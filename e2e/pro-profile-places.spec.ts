import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

test.describe('where the professional works', () => {
  test('one place always stays selected: the last one can not be switched off', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');
    const studio = page.getByRole('button', { name: 'No meu endereço' });
    const home = page.getByRole('button', { name: 'A domicílio' });
    // The seeded professional has a studio
    await expect(studio).toHaveAttribute('aria-pressed', 'true');
    await expect(home).toHaveAttribute('aria-pressed', 'false');

    // The only one that is on stays on
    await studio.click();
    await expect(studio).toHaveAttribute('aria-pressed', 'true');

    // Both on, then one of them off: the other stays
    await home.click();
    await expect(home).toHaveAttribute('aria-pressed', 'true');
    await studio.click();
    await expect(studio).toHaveAttribute('aria-pressed', 'false');
    await expect(home).toHaveAttribute('aria-pressed', 'true');

    // And now the home is the last one
    await home.click();
    await expect(home).toHaveAttribute('aria-pressed', 'true');
  });
});
