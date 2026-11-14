import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed, updateProfessional } from './support/seed';

// The Cloud Functions are not in the emulators of the e2e: Stripe and the webhook are covered by the tests of the
// functions. Here: the screens, and what the profile of the database turns on.
test.beforeEach(async () => {
  await seed();
});

test.describe('Pro subscription of the professional', () => {
  test('the profile leads to the page that offers the subscription', async ({ page }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');

    const link = page.getByRole('link', { name: /Assinatura Pro/ });
    await expect(link).toContainText('Mais visibilidade para o seu perfil');
    await link.click();

    await expect(page).toHaveURL('/pro/assinatura');
    await expect(page.getByRole('heading', { name: 'Assinatura Pro' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assinar Pro' })).toBeVisible();
    await expect(page.getByText('Selo Pro', { exact: true })).toBeVisible();
    await expect(page.getByText('Prioridade na busca e no mapa')).toBeVisible();
  });

  test('a professional that is Pro sees it on the profile', async ({ page }) => {
    await updateProfessional(PRO.uid, { pro: true });
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');

    await expect(page.getByRole('link', { name: /Assinatura Pro/ })).toContainText(
      'Seu plano Pro está ativo',
    );
  });

  test('a visitor has no page to subscribe: it goes to the professional login', async ({
    page,
  }) => {
    await page.goto('/pro/assinatura');

    await expect(page).toHaveURL('/pro/entrar');
  });
});
