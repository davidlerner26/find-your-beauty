import { expect, test } from '@playwright/test';
import {
  bookFirstFreeTime,
  cancelBooking,
  offeredTimes,
  openFirstFreeDay,
} from './support/booking';
import { CLIENT, CLIENT2, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

// Every test starts from the same data: bookings of a test must not show up in the next one
test.beforeEach(async () => {
  await seed();
});

const card = (page: import('@playwright/test').Page, text: string) =>
  page.locator('article.booking', { hasText: text });

test.describe('booking', () => {
  test('a client books, sees it waiting, and cancels it', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await bookFirstFreeTime(page, { notes: 'Pele sensível' });

    const booking = card(page, PRO.name);
    await expect(booking.getByText('Aguardando')).toBeVisible();
    await expect(booking.getByText(PRO.service)).toBeVisible();
    await expect(booking.getByText('R$ 100,00').first()).toBeVisible();

    await cancelBooking(page, booking);
    await expect(card(page, 'Aguardando')).toHaveCount(0);
    await expect(card(page, 'Cancelado')).toHaveCount(1);
  });

  test('the professional sees the request and accepts it', async ({ page, browser }) => {
    await signIn(page, CLIENT.email);
    await bookFirstFreeTime(page, { notes: 'Pele sensível' });

    const proContext = await browser.newContext();
    const proPage = await proContext.newPage();
    await signIn(proPage, PRO.email, 'professional');
    await proPage.goto('/pro');

    const request = card(proPage, `${CLIENT.firstName} ${CLIENT.lastName}`);
    await expect(request.getByText('Pele sensível')).toBeVisible();
    await request.getByRole('button', { name: 'Aceitar' }).click();
    await expect(request.getByText('Confirmado')).toBeVisible();

    // The client sees the answer
    await page.reload();
    await expect(card(page, 'Confirmado')).toHaveCount(1);
    await proContext.close();
  });

  test('a booked time is not offered to another client, and comes back when cancelled', async ({
    page,
    browser,
  }) => {
    await signIn(page, CLIENT.email);
    const taken = await bookFirstFreeTime(page);

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signIn(other, CLIENT2.email);
    await openFirstFreeDay(other);
    // 08:00-20:00 in 60 minute slots offers 12 times: one is taken
    await expect.poll(() => offeredTimes(other)).toHaveLength(11);
    expect(await offeredTimes(other)).not.toContain(taken);

    await cancelBooking(page, card(page, PRO.name));
    await expect(card(page, 'Cancelado')).toHaveCount(1);

    await openFirstFreeDay(other);
    await expect.poll(() => offeredTimes(other)).toHaveLength(12);
    expect(await offeredTimes(other)).toContain(taken);
    await otherContext.close();
  });

  test('a client cannot book while the professional is declining', async ({ page, browser }) => {
    await signIn(page, CLIENT.email);
    await bookFirstFreeTime(page);

    const proContext = await browser.newContext();
    const proPage = await proContext.newPage();
    await signIn(proPage, PRO.email, 'professional');
    await proPage.goto('/pro');
    await card(proPage, CLIENT.firstName).getByRole('button', { name: 'Recusar' }).click();
    await expect(card(proPage, CLIENT.firstName).getByText('Recusado')).toBeVisible();

    await page.reload();
    await expect(card(page, 'Aguardando')).toHaveCount(0);
    await proContext.close();
  });
});
