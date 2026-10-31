import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { seed } from './support/seed';

// Read only tests: they start from the seed, whatever the other files changed
test.beforeAll(async () => {
  await seed();
});

test.describe('visitor', () => {
  test('sees the home and a professional page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Categorias' })).toBeVisible();

    await page.goto(`/profissionais/${PRO.uid}`);
    await expect(page.getByRole('heading', { name: PRO.name }).first()).toBeVisible();
    await expect(page.getByText(PRO.service).first()).toBeVisible();
  });

  test('shows the company and its CNPJ on the home and on the legal pages', async ({ page }) => {
    for (const path of ['/', '/privacidade', '/termos']) {
      await page.goto(path);
      await expect(page.getByText('DAVID LERNER · CNPJ 42.416.006/0001-94')).toBeVisible();
    }
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

  test('is told on the professional page that signing in is needed to book', async ({ page }) => {
    await page.goto(`/profissionais/${PRO.uid}`);
    const notice = page.getByRole('link', { name: 'Entre na sua conta para agendar.' });
    await expect(notice).toBeVisible();
    // The button to book is never enabled for a visitor, even with a service chosen
    await page.getByRole('button', { name: `Adicionar ${PRO.service}` }).click();
    await expect(page.getByRole('button', { name: 'Agendar' })).toBeDisabled();
    await notice.click();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('is told to sign in on private screens', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.getByText('Você não está logado')).toBeVisible();
  });

  test('the "Entrar" button has the same size on the bookings, messages and notifications screens', async ({
    page,
  }) => {
    const sizes: Record<string, { width: number; height: number } | null> = {};
    for (const path of ['/agenda', '/mensagens', '/notificacoes']) {
      await page.goto(path);
      const button = page.getByRole('link', { name: 'Entrar', exact: true }).last();
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      sizes[path] = box && { width: box.width, height: box.height };
    }
    expect(sizes['/mensagens']).toEqual(sizes['/agenda']);
    expect(sizes['/notificacoes']).toEqual(sizes['/agenda']);
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
