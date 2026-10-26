import { expect, Page } from '@playwright/test';
import { PRO } from './data';

// Opens the booking form of the professional's service and picks the 15th of the next month: always in the
// future, and the same day for every test (the days that are enabled change while the page loads)
export async function openFirstFreeDay(page: Page) {
  await page.goto(`/profissionais/${PRO.uid}`);
  await page.getByRole('button', { name: `Adicionar ${PRO.service}` }).click();
  await page.getByRole('button', { name: 'Agendar' }).click();
  await expect(page).toHaveURL(/\/agendar(\?|$)/);

  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await page.locator('button.day:not([disabled])', { hasText: /^\S*\s*15$/ }).click();
  await expect(page.locator('button.time').first()).toBeVisible();
}

// The times offered on the picked day ("08:00")
export const offeredTimes = async (page: Page) =>
  (await page.locator('button.time:not([disabled])').allInnerTexts()).map((text) =>
    text.split('\n')[0].trim(),
  );

// Books the first free time, as the signed in client would. Returns the time it picked.
export async function bookFirstFreeTime(page: Page, options: { notes?: string } = {}) {
  await openFirstFreeDay(page);
  const [time] = await offeredTimes(page);
  await page.locator('button.time:not([disabled])').first().click();

  if (options.notes)
    await page.getByPlaceholder('Digite suas observações aqui').fill(options.notes);
  await page.getByRole('button', { name: 'Finalizar' }).click();
  // In the test environment the (simulated) payment comes first
  await expect(page).toHaveURL(/\/(agenda|pagamento)$/);
  if (page.url().endsWith('/pagamento'))
    await page.getByRole('button', { name: 'Pagar agora' }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  return time;
}

// The client cancels the booking of the card (the app asks for a confirmation)
export async function cancelBooking(page: Page, card: ReturnType<Page['locator']>) {
  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: 'Cancelar' }).click();
}
