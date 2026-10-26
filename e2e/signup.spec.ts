import { expect, test } from '@playwright/test';
import { seed } from './support/seed';

test.beforeAll(async () => {
  await seed();
});

test.describe('signup form', () => {
  test('shows each error only after the field is left, or after sending', async ({ page }) => {
    await page.goto('/cadastro');
    await expect(page.getByText('Digite um CPF válido.')).toHaveCount(0);

    await page.getByPlaceholder('CPF').fill('11111111111');
    await page.getByPlaceholder('Nome', { exact: true }).focus();
    await expect(page.getByText('Digite um CPF válido.')).toBeVisible();
    await expect(page.getByText('O nome precisa ter pelo menos 3 caracteres.')).toHaveCount(0);

    await page.locator('button[type=submit]').click();
    await expect(page.getByText('O nome precisa ter pelo menos 3 caracteres.')).toBeVisible();
    await expect(page.getByText('O sobrenome precisa ter pelo menos 2 caracteres.')).toBeVisible();
    await expect(page.getByText('Digite um e-mail válido.')).toBeVisible();
    await expect(page.getByText('Digite o celular completo, com DDD e 9 dígitos.')).toBeVisible();
    await expect(page.getByText('Busque o endereço e escolha uma das sugestões.')).toBeVisible();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test('masks the phone and the CPF while typing, dropping extra digits', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByPlaceholder('Celular').pressSequentially('219974728789999');
    await expect(page.getByPlaceholder('Celular')).toHaveValue('(21) 99747-2878');

    await page.getByPlaceholder('CPF').pressSequentially('52998224725999');
    await expect(page.getByPlaceholder('CPF')).toHaveValue('529.982.247-25');
  });

  test('a valid field clears its error', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByPlaceholder('Celular').fill('219');
    await page.getByPlaceholder('CPF').focus();
    await expect(page.getByText('Digite o celular completo, com DDD e 9 dígitos.')).toBeVisible();

    await page.getByPlaceholder('Celular').fill('21997472878');
    await expect(page.getByText('Digite o celular completo, com DDD e 9 dígitos.')).toHaveCount(0);
  });

  test('the password rule is explained', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByPlaceholder('Senha').fill('abcdef');
    await page.getByPlaceholder('Nome', { exact: true }).focus();
    await expect(page.getByText('A senha precisa ter pelo menos 6 caracteres')).toBeVisible();

    await page.getByPlaceholder('Senha').fill('abc12!');
    await expect(page.getByText('A senha precisa ter pelo menos 6 caracteres')).toHaveCount(0);
  });
});

test.describe('login form', () => {
  test('asks for a valid e-mail and for the password, after leaving the field or sending', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await page.getByPlaceholder('E-mail').fill('maria@');
    await page.getByPlaceholder('Senha').focus();
    await expect(page.getByText('Digite um e-mail válido.')).toBeVisible();
    await expect(page.getByText('Digite sua senha.')).toHaveCount(0);

    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Digite sua senha.')).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('"Lembrar de mim" starts on and can be turned off', async ({ page }) => {
    await page.goto('/entrar');
    const remember = page.getByLabel('Lembrar de mim');
    await expect(remember).toBeChecked();
    await remember.uncheck();
    await expect(remember).not.toBeChecked();
  });

  test('shows and hides the password', async ({ page }) => {
    await page.goto('/entrar');
    const password = page.getByPlaceholder('Senha');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });
});
