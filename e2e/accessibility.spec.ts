import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { CLIENT, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeAll(async () => {
  await seed();
});

// What a person with a screen reader or a keyboard needs. Only what axe is sure about (serious and critical).
const violationsOf = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // The icons are font ligatures (the word "search" is the picture of a magnifier): the visible text of an icon
    // button can't be part of its name
    .disableRules(['label-content-name-mismatch'])
    .analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`);
};

test.describe('visitor screens', () => {
  for (const [name, path] of [
    ['home', '/'],
    ['search', '/busca'],
    ['professional page', `/profissionais/${PRO.uid}`],
    ['login', '/entrar'],
    ['signup', '/cadastro'],
    ['forgot password', '/esqueci-senha'],
  ] as const) {
    test(`${name} has no serious accessibility problems`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1, h2').first()).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);
    });
  }
});

test.describe('signed in screens', () => {
  test('client: bookings and profile', async ({ page }) => {
    await signIn(page, CLIENT.email);
    for (const path of ['/agenda', '/perfil', '/mensagens']) {
      await page.goto(path);
      await expect(page.locator('h1, h2').first()).toBeVisible();
      expect(await violationsOf(page), path).toEqual([]);
    }
  });

  test('professional: agenda and profile', async ({ page }) => {
    await signIn(page, PRO.email, 'professional');
    for (const path of ['/pro', '/pro/perfil']) {
      await page.goto(path);
      await expect(page.locator('h1, h2').first()).toBeVisible();
      expect(await violationsOf(page), path).toEqual([]);
    }
  });
});

test.describe('dialogs and the keyboard', () => {
  test('the filters of the search: focus goes in, stays in, Escape closes and focus comes back', async ({
    page,
  }) => {
    await page.goto('/busca');
    const opener = page.getByRole('button', { name: 'Filtros', exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Filtros' });
    await expect(dialog).toBeFocused();

    // Tab goes around inside the dialog, never to the page behind it
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});
