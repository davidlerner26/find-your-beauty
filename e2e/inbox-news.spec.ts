import { expect, test } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CLIENT } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

// On a phone the tabs "Mensagens" and "Notificações" are on top of the screen: a dot says where there is news
test.describe('news on the tabs of the inbox', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('a new notification shows a dot on the tab of the notifications', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await page.goto('/mensagens');
    const tab = page.getByRole('link', { name: /Notificações/ });
    await expect(tab).toBeVisible();
    await expect(tab.locator('.news')).toHaveCount(0);

    if (!getApps().length) initializeApp({ projectId: 'demo-find-your-beauty' });
    await getFirestore()
      .doc(`users/${CLIENT.uid}/notifications/n1`)
      .set({
        icon: 'calendar',
        text: [{ text: 'Seu agendamento foi confirmado' }],
        unread: true,
        createdAt: FieldValue.serverTimestamp(),
      });

    await expect(tab.locator('.news')).toHaveCount(1);
    // The tab of the messages has none: nothing unread there
    await expect(page.getByRole('link', { name: /Mensagens/ }).locator('.news')).toHaveCount(0);
  });
});
