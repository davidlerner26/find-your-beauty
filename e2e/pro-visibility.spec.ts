import { expect, test } from '@playwright/test';
import { PRO, PRO_HOME } from './support/data';
import { seed, updateProfessional } from './support/seed';

// What a client sees of the Pro subscription: the featured section of the home, the badge, the priority. The webhook that
// turns `pro` on is covered by the tests of the functions: here it is set in the database.
test.beforeEach(async () => {
  await seed();
});

const featured = (page: import('@playwright/test').Page) =>
  page.locator('section', {
    has: page.getByRole('heading', { name: 'Profissionais em destaque' }),
  });

test.describe('what the Pro subscription shows', () => {
  test('without subscribers the home has no featured section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Categorias' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Profissionais em destaque' })).toHaveCount(0);
  });

  test('the featured section has the subscribers only, with the Pro badge', async ({ page }) => {
    await updateProfessional(PRO.uid, { pro: true });
    await page.goto('/');

    const section = featured(page);
    await expect(section.getByRole('link', { name: PRO.name })).toBeVisible();
    await expect(section.locator('.pro-badge')).toHaveCount(1);
    // Who does not subscribe is not featured (the home-only professional has no subscription)
    await expect(section.getByText(PRO_HOME.name)).toHaveCount(0);
  });

  test('the page of the professional and the list of the map show the badge', async ({ page }) => {
    await updateProfessional(PRO.uid, { pro: true });

    await page.goto(`/explorar/${PRO.uid}`);
    await expect(
      page.locator('.results .offer', { hasText: PRO.name }).locator('.pro-badge'),
    ).toBeVisible();
    await expect(
      page.locator('.results .offer', { hasText: PRO.name }).locator('.pro-badge'),
    ).toContainText('Pro');
  });

  test('a professional that does not subscribe has no badge', async ({ page }) => {
    await page.goto(`/explorar/${PRO.uid}`);

    await expect(page.locator('.results .offer', { hasText: PRO.name })).toBeVisible();
    await expect(page.locator('.pro-badge')).toHaveCount(0);
  });
});
