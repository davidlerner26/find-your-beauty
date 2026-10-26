import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { seed } from './support/seed';

test.beforeAll(async () => {
  await seed();
});

// The photos of the cards come from Firebase Storage: only the ones near the screen are fetched
test.describe('images', () => {
  test('the pictures of the professional page: the first loads at once, the rest wait', async ({
    page,
  }) => {
    await page.goto(`/profissionais/${PRO.uid}`);
    const hero = page.locator('.hero-photos img');
    await expect(hero.first()).toBeVisible();
    await expect(hero.first()).toHaveAttribute('loading', 'eager');
    await expect(hero.first()).toHaveAttribute('fetchpriority', 'high');

    const count = await hero.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 1; i < count; i++) await expect(hero.nth(i)).toHaveAttribute('loading', 'lazy');
  });

  test('no image of the screens is left to block the first paint', async ({ page }) => {
    for (const path of ['/', '/busca', '/explore']) {
      await page.goto(path);
      await page.waitForTimeout(500);
      const blocking = await page.$$eval('img', (images) =>
        images
          .filter((img) => !img.src.endsWith('.svg') && img.getAttribute('loading') !== 'lazy')
          .map((img) => img.src),
      );
      expect(await page.locator('img').count(), path).toBeGreaterThan(0);
      expect(blocking, path).toEqual([]);
    }
  });
});
