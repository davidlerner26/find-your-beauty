import { expect, test } from '@playwright/test';
import { PRO, PRO_HOME } from './support/data';
import { seed } from './support/seed';

// Read only tests: they start from the seed, whatever the other files changed
test.beforeAll(async () => {
  await seed();
});

// Wide screens only (the desktop project): the page of a professional is a card over the map, for everybody. Who only goes to the
// client's home has no pin: the map goes to where the client is.
test.describe('page of a professional on a wide screen', () => {
  test('a home-only professional opens on the map, not on the home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: PRO_HOME.name }).first().click();

    await expect(page).toHaveURL(`/explorar/${PRO_HOME.uid}`);
    await expect(page.locator('app-explore')).toHaveCount(1);
    // Her card is on top of the map, and the list has her selected
    await expect(page.getByRole('dialog').getByText('Atendimento a domicílio')).toBeVisible();
    await expect(page.locator('.results .offer.selected')).toContainText(PRO_HOME.name);
    // The home is not there: nothing opened beside it
    await expect(page.getByRole('heading', { name: 'Categorias' })).toHaveCount(0);
    // The map goes to where the client is (no pin for her)
    await expect(page.getByRole('status').filter({ hasText: 'Atende a domicílio' })).toHaveCount(1);
  });

  test('a link opened by address is the same screen of the map', async ({ page }) => {
    await page.goto(`/explorar/${PRO_HOME.uid}`);

    await expect(page.locator('app-explore')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: PRO_HOME.name }).first()).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Atende a domicílio' })).toHaveCount(1);
  });

  test('a professional with a place opens over the map too', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: PRO.name }).first().click();

    await expect(page).toHaveURL(`/explorar/${PRO.uid}`);
    await expect(page.locator('app-explore')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ver no mapa' })).toBeVisible();
  });
});
