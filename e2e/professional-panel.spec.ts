import { expect, test } from '@playwright/test';
import { PRO, PRO_HOME } from './support/data';
import { seed } from './support/seed';

// Read only tests: they start from the seed, whatever the other files changed
test.beforeAll(async () => {
  await seed();
});

// Wide screens only (the desktop project): the panel and the map are not on phones
test.describe('page of a professional on a wide screen', () => {
  test('a home-only professional opens as a panel on the home, with no map', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: PRO_HOME.name }).first().click();

    const panel = page.getByRole('dialog', { name: PRO_HOME.name });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Atendimento a domicílio')).toBeVisible();
    await expect(page).toHaveURL(`/profissionais/${PRO_HOME.uid}`);
    // The home stays underneath and there is no map
    await expect(page.getByRole('heading', { name: 'Categorias' })).toBeVisible();
    // The panel takes space of its own: the screen ends where it begins, nothing is covered
    const screen = await page.locator('.screen').boundingBox();
    const side = await panel.boundingBox();
    expect(screen!.x + screen!.width).toBeLessThanOrEqual(side!.x + 1);
    await expect(page.locator('app-explore')).toHaveCount(0);

    await panel.getByRole('button', { name: 'Voltar' }).click();
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL('/');
  });

  test('the Back button of the browser closes the panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: PRO_HOME.name }).first().click();
    await expect(page.getByRole('dialog', { name: PRO_HOME.name })).toBeVisible();

    await page.goBack();

    await expect(page.getByRole('dialog', { name: PRO_HOME.name })).toBeHidden();
    await expect(page).toHaveURL('/');
  });

  test('a link opened by address is a page of its own, with no map', async ({ page }) => {
    await page.goto(`/profissionais/${PRO_HOME.uid}`);

    await expect(page.getByRole('heading', { name: PRO_HOME.name }).first()).toBeVisible();
    await expect(page.locator('app-explore')).toHaveCount(0);
  });

  test('a professional with a place still opens over the map', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: PRO.name }).first().click();

    await expect(page).toHaveURL(`/profissionais/${PRO.uid}`);
    await expect(page.locator('app-explore')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ver no mapa' })).toBeVisible();
  });
});
