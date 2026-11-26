import { expect, test } from '@playwright/test';
import { PRO, PRO_HOME } from './support/data';
import { seed, updateProfessional } from './support/seed';

// The list of the screen of the map has everybody, the best rating first. The pins are for who has an address (the map has no
// key in the e2e build, so what shows here is the list and the state of the selection).
test.beforeEach(async () => {
  await seed();
});

const locationQuestion = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Agora não' });

test.describe('the screen of the map', () => {
  test('lists everybody, with the best rating first, also who only goes to the home', async ({
    page,
  }) => {
    await updateProfessional(PRO_HOME.uid, { rating: 5 });
    await updateProfessional(PRO.uid, { rating: 3 });
    await page.goto('/explorar');

    const names = page.locator('.results .offer h3');
    await expect(names).toHaveCount(2);
    await expect(names.nth(0)).toContainText(PRO_HOME.name);
    await expect(names.nth(1)).toContainText(PRO.name);
    await expect(
      page
        .locator('.results .offer', { hasText: PRO_HOME.name })
        .getByText('Atendimento a domicílio'),
    ).toBeVisible();
  });

  test('selecting who only goes to the home says so, and a professional with an address does not', async ({
    page,
  }) => {
    await page.goto('/explorar');
    await locationQuestion(page).click();
    const status = page.getByRole('status').filter({ hasText: 'Atende a domicílio' });
    await expect(status).toHaveCount(0);

    await page.locator('.results .offer', { hasText: PRO_HOME.name }).click();
    await expect(page).toHaveURL(`/explorar/${PRO_HOME.uid}`);
    await expect(page.locator('.results .offer.selected')).toContainText(PRO_HOME.name);
    await expect(status).toHaveCount(1);

    await page.locator('.results .offer', { hasText: PRO.name }).click();
    await expect(page).toHaveURL(`/explorar/${PRO.uid}`);
    await expect(status).toHaveCount(0);
  });
});
