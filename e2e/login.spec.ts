import { expect, test } from '@playwright/test';
import { CLIENT, PASSWORD, PRO } from './support/data';
import { signIn } from './support/helpers';

test.describe('login', () => {
  test('a client signs in and reaches the home', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(`Olá, ${CLIENT.firstName}`)).toBeVisible();
  });

  test('a wrong password shows the same message as an unknown e-mail', async ({ page }) => {
    for (const email of [CLIENT.email, 'ninguem@e2e.test']) {
      await page.goto('/entrar');
      await page.getByPlaceholder('E-mail').fill(email);
      await page.getByPlaceholder('Senha').fill('Errada@123');
      await page.locator('button[type=submit]').click();
      await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
    }
  });

  test('a professional signs in to the professional area', async ({ page }) => {
    await signIn(page, PRO.email, 'professional');
    await expect(page).toHaveURL(/\/pro/);
  });

  test('a client cannot use the professional login, and the other way around', async ({ page }) => {
    await page.goto('/pro/entrar');
    await page.getByPlaceholder('E-mail').fill(CLIENT.email);
    await page.getByPlaceholder('Senha').fill(PASSWORD);
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Esta conta não é de profissional.')).toBeVisible();

    await page.goto('/entrar');
    await page.getByPlaceholder('E-mail').fill(PRO.email);
    await page.getByPlaceholder('Senha').fill(PASSWORD);
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Esta conta é de profissional.')).toBeVisible();
  });
});
