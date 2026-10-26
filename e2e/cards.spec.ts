import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { CLIENT, PRO } from './support/data';
import { signIn } from './support/helpers';
import { DECLINED_CARD, GOOD_CARD, saveCard } from './support/payments';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

test.describe('the cards of a client', () => {
  test('are reached from the profile, start empty, and a saved card is listed with its last digits only', async ({
    page,
  }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/perfil');
    await page.getByRole('link', { name: 'Meus cartões' }).click();

    await expect(page).toHaveURL(/\/cartoes$/);
    await expect(page.getByRole('heading', { name: 'Cartões' })).toBeVisible();
    await expect(page.getByText('Você ainda não tem um cartão cadastrado.')).toBeVisible();

    await saveCard(page, GOOD_CARD);
    await expect(page.getByText('Cartão salvo')).toBeVisible();
    const card = page.locator('li.card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Visa •••• 4242');
    await expect(card).toContainText('Vence 12/2099');
    // The number is never shown
    await expect(page.getByText(GOOD_CARD)).toHaveCount(0);
  });

  test('stay after a reload, and the latest one is the chosen one', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/cartoes');
    await saveCard(page, GOOD_CARD);
    await saveCard(page, DECLINED_CARD);

    await page.reload();
    const cards = page.locator('li.card');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('•••• 0002');
    await expect(cards.first()).toHaveClass(/selected/);
  });

  test('can be removed, after a confirmation', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/cartoes');
    await saveCard(page, GOOD_CARD);

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Remover Visa final 4242' }).click();
    await expect(page.locator('li.card')).toHaveCount(1);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Remover Visa final 4242' }).click();
    await expect(page.locator('li.card')).toHaveCount(0);
    await expect(page.getByText('Cartão removido')).toBeVisible();
  });

  test('a number that is too short is not saved, and the form can be cancelled', async ({
    page,
  }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/cartoes');
    await saveCard(page, '1234');
    await expect(page.getByRole('alert')).toHaveText('Número do cartão inválido.');
    await expect(page.locator('li.card')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Cadastrar cartão' })).toBeVisible();
  });

  test('are private: a visitor and a professional cannot open them', async ({ page }) => {
    await page.goto('/cartoes');
    await expect(page).toHaveURL(/\/entrar$/);

    await signIn(page, PRO.email, 'professional');
    await page.goto('/cartoes');
    await expect(page).toHaveURL(/\/$/);
  });

  test('another person on the same browser does not see them', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/cartoes');
    await saveCard(page, GOOD_CARD);
    await expect(page.locator('li.card')).toHaveCount(1);

    await page.goto('/perfil');
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByText('Você não está logado.')).toBeVisible();
    await page.goto('/cartoes');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('have no serious accessibility problems', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/cartoes');
    await saveCard(page, GOOD_CARD);
    await expect(page.locator('li.card')).toHaveCount(1);
    await page.getByRole('button', { name: 'Cadastrar cartão' }).click();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['label-content-name-mismatch'])
      .analyze();
    expect(
      violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} ${v.nodes[0]?.target.join(' ')}`),
    ).toEqual([]);
  });
});
