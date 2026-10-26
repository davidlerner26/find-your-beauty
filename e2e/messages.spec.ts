import { expect, test } from '@playwright/test';
import { CLIENT, CLIENT2, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

const conversationOf = (clientUid: string) => `${clientUid}_${PRO.uid}`;

test.describe('messages', () => {
  test('a client writes to a professional, who answers', async ({ page, browser }) => {
    await signIn(page, CLIENT.email);
    await page.goto(`/mensagens/${PRO.uid}`);
    await page.getByPlaceholder('Digite uma mensagem').fill('Olá, tem horário sábado?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.locator('.bubble', { hasText: 'Olá, tem horário sábado?' })).toBeVisible();

    const proContext = await browser.newContext();
    const proPage = await proContext.newPage();
    await signIn(proPage, PRO.email, 'professional');
    await proPage.goto(`/pro/mensagens/${conversationOf(CLIENT.uid)}`);
    await expect(proPage.locator('.bubble', { hasText: 'Olá, tem horário sábado?' })).toBeVisible();

    await proPage.getByPlaceholder('Digite uma mensagem').fill('Tenho às 10h!');
    await proPage.getByRole('button', { name: 'Enviar' }).click();

    // The client sees the answer without reloading
    await expect(page.locator('.bubble', { hasText: 'Tenho às 10h!' })).toBeVisible();
    await proContext.close();
  });

  test('the conversation of a client is private', async ({ page, browser }) => {
    await signIn(page, CLIENT.email);
    await page.goto(`/mensagens/${PRO.uid}`);
    await page.getByPlaceholder('Digite uma mensagem').fill('Mensagem privada');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.locator('.bubble', { hasText: 'Mensagem privada' })).toBeVisible();

    // Another client opening the same professional starts a conversation of their own
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signIn(other, CLIENT2.email);
    await other.goto(`/mensagens/${PRO.uid}`);
    await expect(other.getByPlaceholder('Digite uma mensagem')).toBeVisible();
    await expect(other.locator('.bubble', { hasText: 'Mensagem privada' })).toHaveCount(0);
    await otherContext.close();
  });

  test('a visitor is asked to sign in to write', async ({ page }) => {
    await page.goto(`/mensagens/${PRO.uid}`);
    await expect(page.getByText('na sua conta para enviar mensagens')).toBeVisible();
  });
});
