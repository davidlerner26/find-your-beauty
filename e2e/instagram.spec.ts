import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { seed, updateProfessional } from './support/seed';

const photo = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="${color}"/></svg>`,
  )}`;

test.beforeEach(async () => {
  await seed();
});

test.describe('professional with Instagram connected', () => {
  test('the page shows the gallery of the professional and the photos of Instagram', async ({
    page,
  }) => {
    await updateProfessional(PRO.uid, {
      instagram: 'ana.makeup',
      instagramConnected: true,
      instagramPhotos: ['#c98b9e', '#8bb7c9', '#b7c98b'].map((color, i) => ({
        id: `ig-${i}`,
        url: photo(color),
        permalink: `https://instagram.com/p/ig-${i}`,
        caption: '',
        video: false,
      })),
    });

    await page.goto(`/profissionais/${PRO.uid}`);

    // The cover keeps the gallery the professional uploaded (two photos in the seed)...
    await expect(page.locator('.hero-photos img')).toHaveCount(2);
    // ...and the photos of Instagram come in their own section
    await expect(page.getByRole('heading', { name: 'Instagram', exact: true })).toBeVisible();
    await expect(page.locator('.gallery img')).toHaveCount(3);
    await expect(page.locator('.gallery a').first()).toHaveAttribute(
      'href',
      'https://instagram.com/p/ig-0',
    );
  });
});
