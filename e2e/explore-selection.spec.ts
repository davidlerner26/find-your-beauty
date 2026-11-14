import { expect, test } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PRO } from './support/data';
import { seed } from './support/seed';

// The map has no key in the e2e build, but the list beside it is there: it is where the selection shows
const EXTRA = 8;

test.beforeAll(async () => {
  await seed();
  if (!getApps().length) initializeApp({ projectId: 'demo-find-your-beauty' });
  const db = getFirestore();
  const base = (await db.doc(`professionals/${PRO.uid}`).get()).data()!;
  // More professionals with a place, so the list is longer than the screen
  for (let n = 1; n <= EXTRA; n++) {
    await db.doc(`professionals/extra-${n}`).set({
      ...base,
      ownerUid: `extra-${n}`,
      name: `Extra ${n}`,
      email: `extra${n}@e2e.test`,
    });
  }
});

test.describe('page of a professional on the map screen (wide screens)', () => {
  test('the professional is selected in the list, in the middle of it', async ({ page }) => {
    await page.goto('/explorar/extra-6');

    const selected = page.locator('.results .offer.selected');
    await expect(selected).toHaveCount(1);
    await expect(selected).toContainText('Extra 6');
    // The list was scrolled to show it in the middle (not at the edge)
    await expect
      .poll(async () => {
        const list = (await page.locator('.results').boundingBox())!;
        const card = (await selected.boundingBox())!;
        return Math.abs(card.y + card.height / 2 - (list.y + list.height / 2));
      })
      .toBeLessThan(40);
  });

  test('choosing another professional in the list selects it and goes to its page', async ({
    page,
  }) => {
    await page.goto('/explorar/extra-2');
    await expect(page.locator('.results .offer.selected')).toContainText('Extra 2');
    // The question about the location comes first: it covers the list
    await page.getByRole('button', { name: 'Agora não' }).click();

    await page.locator('.results .offer', { hasText: 'Extra 7' }).click();

    await expect(page).toHaveURL('/explorar/extra-7');
    await expect(page.locator('.results .offer.selected')).toContainText('Extra 7');
  });

  test('the old address of a professional goes to the new one', async ({ page }) => {
    await page.goto('/profissionais/extra-3');

    await expect(page).toHaveURL('/explorar/extra-3');
    await expect(page.locator('.results .offer.selected')).toContainText('Extra 3');
  });
});
