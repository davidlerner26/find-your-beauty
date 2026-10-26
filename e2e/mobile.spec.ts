import { expect, test } from '@playwright/test';
import { bookFirstFreeTime } from './support/booking';
import { CLIENT, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

// The app is used mostly on phones: the main flow on a small screen (project "mobile")
test.beforeEach(async () => {
  await seed();
});

test('a client signs in and books on a phone', async ({ page }) => {
  await signIn(page, CLIENT.email);
  await bookFirstFreeTime(page);
  await expect(page.locator('article.booking', { hasText: PRO.name })).toBeVisible();
});

test('nothing spills out of the screen sideways', async ({ page }) => {
  for (const path of ['/', '/busca', `/profissionais/${PRO.uid}`, '/entrar']) {
    await page.goto(path);
    // The Firestore listeners keep the network busy, so wait for the content instead
    await expect(page.locator('h1, h2').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal scroll on ${path}`).toBeLessThanOrEqual(0);
  }
});
