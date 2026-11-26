import { expect, test } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRO, PRO_HOME } from './support/data';
import { seed } from './support/seed';

const EXTRA = 5;

test.beforeAll(async () => {
  await seed();
  if (!getApps().length) initializeApp({ projectId: 'demo-find-your-beauty' });
  const db = getFirestore();
  const base = (await db.doc(`professionals/${PRO.uid}`).get()).data()!;
  // More professionals with an address, so there are more than the three that the section used to show
  for (let n = 1; n <= EXTRA; n++) {
    await db.doc(`professionals/extra-${n}`).set({
      ...base,
      ownerUid: `extra-${n}`,
      name: `Extra ${n}`,
      email: `extra${n}@e2e.test`,
    });
  }
});

test.describe('"Profissionais próximos" on the home', () => {
  test('has everybody, not only three: the ones with an address first and the home-only after them', async ({
    page,
  }) => {
    await page.goto('/');

    const section = page.locator('section', {
      has: page.getByRole('heading', { name: 'Profissionais próximos' }),
    });
    const names = section.locator('article.offer h3');
    // Ana, the five extras and Bia: all of them
    await expect(names).toHaveCount(EXTRA + 2);
    // The one that only goes to the home is the last
    await expect(names.last()).toContainText(PRO_HOME.name);
    await expect(section.getByText(PRO.name)).toBeVisible();
  });
});

test.describe('/busca before searching', () => {
  test('lists everybody, with the ones that only go to the home too', async ({ page }) => {
    await page.goto('/busca');

    const list = page.locator('a.result');
    // Ana, the five extras and Bia: not only five
    await expect(list).toHaveCount(EXTRA + 2);
    await expect(list.filter({ hasText: PRO_HOME.name })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Profissionais', exact: true })).toBeVisible();
  });
});
