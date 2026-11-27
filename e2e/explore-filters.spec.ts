import { expect, test } from '@playwright/test';
import { PRO, PRO_HOME } from './support/data';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

// Wide screens (the desktop project): "Buscar profissionais" leads to the map, which has a button with the filters of the search
test.describe('the filters of the screen of the map (wide screens)', () => {
  test('"Buscar profissionais" leads to the map, without the chips of the filters', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Buscar', exact: true }).click();

    await expect(page).toHaveURL('/explorar');
    // No chips on top: one button of the filters, on the right
    await expect(page.locator('.filters')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filtros' })).toBeVisible();
  });

  test('the button opens the filters as a card on the right, and "Mostrar resultados" applies them', async ({
    page,
  }) => {
    await page.goto('/explorar');
    await page.getByRole('button', { name: 'Agora não' }).click();
    await expect(page.locator('.results .offer')).toHaveCount(2);

    await page.getByRole('button', { name: 'Filtros' }).click();
    const card = page.getByRole('dialog', { name: 'Filtros' });
    await expect(card).toBeVisible();
    // On the right side of the screen
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThan(700);

    await card.getByRole('button', { name: 'A domicílio' }).click();
    await card.getByRole('button', { name: 'Mostrar resultados' }).click();

    await expect(card).toBeHidden();
    // Who goes to the home: Bia (Ana has a studio only)
    await expect(page.locator('.results .offer')).toHaveCount(1);
    await expect(page.locator('.results .offer')).toContainText(PRO_HOME.name);
    // The button says how many filters are on
    await expect(page.getByRole('button', { name: 'Filtros' })).toContainText('1');
  });

  test('"Cancelar" and Escape close the card and keep the list', async ({ page }) => {
    await page.goto('/explorar');
    await page.getByRole('button', { name: 'Agora não' }).click();

    await page.getByRole('button', { name: 'Filtros' }).click();
    const card = page.getByRole('dialog', { name: 'Filtros' });
    await card.getByRole('button', { name: 'A domicílio' }).click();
    await card.getByRole('button', { name: 'Cancelar' }).click();
    await expect(card).toBeHidden();
    await expect(page.locator('.results .offer')).toHaveCount(2);

    await page.getByRole('button', { name: 'Filtros' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a service chosen on the home is shown, and can be dismissed', async ({ page }) => {
    await page.goto('/explorar?service=Maquiagem social&categories=Maquiagem');
    await page.getByRole('button', { name: 'Agora não' }).click();

    const pill = page.getByRole('button', { name: 'Remover o filtro de serviço' });
    await expect(pill).toContainText('Maquiagem social');
    await expect(page.locator('.results .offer')).toHaveCount(2);

    await pill.click();
    await expect(pill).toHaveCount(0);
    await expect(page.locator('.results .offer')).toContainText([PRO.name, PRO_HOME.name]);
  });
});
