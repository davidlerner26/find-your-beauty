import { expect, test } from '@playwright/test';
import { CLIENT, PASSWORD } from './support/data';
import { seed } from './support/seed';

const PROJECT = 'demo-find-your-beauty';

// The Auth emulator makes the reset code that the e-mail would carry
async function resetCodeFor(email: string) {
  const host = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    },
  );
  const { oobCodes } = await (
    await fetch(`http://${host}/emulator/v1/projects/${PROJECT}/oobCodes`)
  ).json();
  return oobCodes.filter((c: { email: string }) => c.email === email).pop().oobCode as string;
}

test.beforeEach(async () => {
  await seed();
});

test.describe('forgot password', () => {
  test('asks for a valid e-mail', async ({ page }) => {
    await page.goto('/esqueci-senha');
    await page.getByPlaceholder('E-mail').fill('maria@');
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Digite um e-mail válido.')).toBeVisible();
    await expect(page.getByText('Se o e-mail estiver cadastrado')).toHaveCount(0);
  });
});

test.describe('reset password', () => {
  test('a link that is not valid says so', async ({ page }) => {
    await page.goto('/redefinir-senha?mode=resetPassword&oobCode=nao-existe');
    await expect(page.getByText('Este link', { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder('Nova senha', { exact: true })).toHaveCount(0);
  });

  test('checks the new password and its confirmation, then the new password logs in', async ({
    page,
  }) => {
    const code = await resetCodeFor(CLIENT.email);
    await page.goto(`/redefinir-senha?mode=resetPassword&oobCode=${code}`);
    await expect(page.getByText(CLIENT.email)).toBeVisible();

    await page.getByPlaceholder('Nova senha', { exact: true }).fill('abcdef');
    await page.getByPlaceholder('Confirmar nova senha').fill('abcdefg');
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('A senha precisa ter pelo menos 6 caracteres')).toBeVisible();
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible();

    await page.getByPlaceholder('Nova senha', { exact: true }).fill('Nova@12345');
    await expect(page.getByText('A senha precisa ter pelo menos 6 caracteres')).toHaveCount(0);
    // The confirmation is checked again when the password changes
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible();
    await page.getByPlaceholder('Confirmar nova senha').fill('Nova@12345');
    await expect(page.getByText('As senhas não são iguais.')).toHaveCount(0);
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Pronto!')).toBeVisible();

    await page.goto('/entrar');
    await page.getByPlaceholder('E-mail').fill(CLIENT.email);
    await page.getByPlaceholder('Senha').fill(PASSWORD);
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();

    await page.getByPlaceholder('Senha').fill('Nova@12345');
    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/$/);
  });
});
