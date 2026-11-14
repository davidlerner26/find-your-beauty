import { expect, test } from '@playwright/test';
import { Timestamp } from 'firebase-admin/firestore';
import { ADMIN, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed, updateProfessional } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

test.describe('the plan of a professional, for the admin', () => {
  test('is free until the subscription is paid', async ({ page }) => {
    await signIn(page, ADMIN.email);
    await page.goto(`/admin/profissionais/${PRO.uid}`);

    const plan = page.locator('section.card', {
      has: page.getByRole('heading', { name: 'Plano' }),
    });
    await expect(plan).toContainText('Gratuito');
  });

  test('shows Pro and until when', async ({ page }) => {
    await updateProfessional(PRO.uid, {
      pro: true,
      proUntil: Timestamp.fromDate(new Date('2099-12-31T12:00:00')),
    });
    await signIn(page, ADMIN.email);
    await page.goto(`/admin/profissionais/${PRO.uid}`);

    const plan = page.locator('section.card', {
      has: page.getByRole('heading', { name: 'Plano' }),
    });
    await expect(plan).toContainText('Pro ativo até 31 de dezembro de 2099');
  });
});
