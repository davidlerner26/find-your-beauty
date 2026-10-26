import { expect, Page } from '@playwright/test';
import { PASSWORD } from './data';

// Signs in through the login screen of the area (client: /entrar, professional: /pro/entrar)
export async function signIn(
  page: Page,
  email: string,
  area: 'client' | 'professional' = 'client',
) {
  await page.goto(area === 'client' ? '/entrar' : '/pro/entrar');
  await page.getByPlaceholder('E-mail').fill(email);
  await page.getByPlaceholder('Senha').fill(PASSWORD);
  await page.locator('button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/(pro\/)?entrar/);
}
