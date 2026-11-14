import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

test.describe('what is missing on the profile', () => {
  test('is told once, when the form is ready: not while it is still being filled', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');

    // The seeded professional has everything but the CPF
    const toasts = page.locator('app-toast');
    await expect(toasts).toHaveCount(1);
    await expect(toasts.first()).toContainText('Para publicar falta: CPF.');
    // Give it time to show a second one, if there is a bug
    await page.waitForTimeout(1500);
    await expect(toasts).toHaveCount(1);
  });
});
