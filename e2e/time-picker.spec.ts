import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

test.describe('the time picker of the working hours', () => {
  test('opens from the clock, changes the opening and the closing, and saves with "Pronto"', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');
    const field = page.getByRole('button', { name: /^Segunda: 08:00 às 20:00$/ });
    await expect(field).toBeVisible();

    await field.click();
    const sheet = page.getByRole('dialog', { name: 'Segunda' });
    await expect(sheet).toBeVisible();
    // The opening: 09 hours (arrows of the keyboard on the wheel of hours)
    const hour = sheet.getByRole('spinbutton', { name: 'Abertura: Hora' });
    await hour.focus();
    await hour.press('ArrowDown');
    await expect(hour).toHaveAttribute('aria-valuenow', '9');
    // The closing: 18 hours
    const closing = sheet.getByRole('spinbutton', { name: 'Fechamento: Hora' });
    await closing.focus();
    await closing.press('ArrowUp');
    await closing.press('ArrowUp');
    await expect(closing).toHaveAttribute('aria-valuenow', '18');

    await sheet.getByRole('button', { name: 'Pronto' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: /^Segunda: 09:00 às 18:00$/ })).toBeVisible();
  });

  test('"Cancelar" and Escape leave the hours as they were', async ({ page }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');
    const field = page.getByRole('button', { name: /^Terça: 08:00 às 20:00$/ });

    await field.click();
    const sheet = page.getByRole('dialog', { name: 'Terça' });
    const hour = sheet.getByRole('spinbutton', { name: 'Abertura: Hora' });
    await hour.focus();
    await hour.press('ArrowDown');
    await sheet.getByRole('button', { name: 'Cancelar' }).click();
    await expect(sheet).toBeHidden();
    await expect(field).toBeVisible();

    await field.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(field).toBeVisible();
  });

  test('the times of a price by day and time open the same picker', async ({ page }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');
    await page.getByRole('button', { name: 'Adicionar preço por dia e horário' }).click();

    await page.getByRole('button', { name: /^A partir das: --:--$/ }).click();
    const sheet = page.getByRole('dialog', { name: 'A partir das' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Pronto' }).click();

    // An empty time opens on 08:00
    await expect(page.getByRole('button', { name: /^A partir das: 08:00$/ })).toBeVisible();
  });
});
