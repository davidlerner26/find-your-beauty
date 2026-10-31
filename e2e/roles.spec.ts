import { expect, test } from '@playwright/test';
import { CLIENT, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

// Read only tests: they start from the seed
test.beforeAll(async () => {
  await seed();
});

const conversation = `${CLIENT.uid}_${PRO.uid}`;

test.describe('a client does not get into the professional area', () => {
  test('every screen of it sends the client to the start', async ({ page }) => {
    await signIn(page, CLIENT.email);
    for (const path of [
      '/pro',
      '/pro/perfil',
      '/pro/mensagens',
      '/pro/notificacoes',
      `/pro/mensagens/${conversation}`,
      '/pro/instagram',
      '/pro/entrar',
      '/pro/cadastro',
    ]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/$/);
    }
  });
});

test.describe('a professional does not get into the area of the client', () => {
  test('each screen sends the professional to the same screen of the professional area', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    for (const [path, expected] of [
      ['/agenda', /\/pro$/],
      ['/mensagens', /\/pro\/mensagens$/],
      ['/notificacoes', /\/pro\/notificacoes$/],
      [`/mensagens/${PRO.uid}`, /\/pro\/mensagens$/],
      ['/perfil', /\/pro\/perfil$/],
      ['/entrar', /\/pro$/],
      ['/cadastro', /\/pro$/],
      ['/pro/entrar', /\/pro$/],
      ['/pro/cadastro', /\/pro$/],
    ] as const) {
      await page.goto(path);
      await expect(page, path).toHaveURL(expected);
    }
  });
});
