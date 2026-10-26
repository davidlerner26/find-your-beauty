import { expect, test } from '@playwright/test';
import { PRO } from './support/data';

test.describe('visitor', () => {
  test('sees the home and a professional page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Categorias' })).toBeVisible();

    await page.goto(`/profissionais/${PRO.uid}`);
    await expect(page.getByRole('heading', { name: PRO.name }).first()).toBeVisible();
    await expect(page.getByText(PRO.service).first()).toBeVisible();
  });

  test('finds a professional by name in the search', async ({ page }) => {
    await page.goto('/busca');
    await page.getByPlaceholder('Busque profissional ou serviço..').fill('Ana');
    await expect(page.getByText(PRO.name).first()).toBeVisible();
  });

  test('is sent to the login when trying to book', async ({ page }) => {
    await page.goto(`/profissionais/${PRO.uid}/agendar`);
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('is told to sign in on private screens', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.getByText('Você não está logado')).toBeVisible();
  });

  test('cannot open the admin or the professional area', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/pro/perfil');
    await expect(page).toHaveURL(/\/pro\/entrar$/);
  });

  test('an unknown address goes to the home', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page).toHaveURL(/\/$/);
  });
});
