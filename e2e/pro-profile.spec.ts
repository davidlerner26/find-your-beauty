import { expect, test } from '@playwright/test';
import { PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

test.describe('professional profile', () => {
  test('shows the Instagram connection, turned off while the Meta app is not configured', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');
    await expect(page.getByRole('heading', { name: 'Instagram', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conectar Instagram' })).toBeDisabled();
    await expect(
      page.getByText('A conexão com o Instagram ainda não foi configurada.'),
    ).toBeVisible();
  });

  test('the changes are saved by themselves, with the CPF kept apart, and survive a reload', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');

    const name = page.locator('input[name=name]');
    await expect(name).toHaveValue(PRO.name);
    await name.fill('Ana Souza Editada');
    await page.locator('input[name=cpf]').fill('52998224725');
    // Leaving the field saves the draft
    await page.locator('input[name=phone]').focus();
    await expect(page.getByText('Alterações salvas')).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name=name]')).toHaveValue('Ana Souza Editada');
    await expect(page.locator('input[name=cpf]')).toHaveValue('529.982.247-25');

    // The public page shows the new name
    await page.goto(`/profissionais/${PRO.uid}`);
    await expect(page.getByRole('heading', { name: 'Ana Souza Editada' }).first()).toBeVisible();
  });

  test('the Instagram field is not in the form, and the public page links to the connected profile', async ({
    page,
  }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');
    await expect(page.locator('input[name=instagram]')).toHaveCount(0);

    await page.goto(`/profissionais/${PRO.uid}`);
    await expect(page.locator('a.instagram')).toHaveAttribute(
      'href',
      'https://instagram.com/ana.makeup',
    );
  });

  test('an invalid CPF is not saved', async ({ page }) => {
    await signIn(page, PRO.email, 'professional');
    await page.goto('/pro/perfil');

    await page.locator('input[name=cpf]').fill('11111111111');
    await page.locator('input[name=name]').fill('Ana Outra');
    await page.locator('input[name=phone]').focus();
    await expect(page.getByText('Alterações salvas')).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name=name]')).toHaveValue('Ana Outra');
    await expect(page.locator('input[name=cpf]')).toHaveValue('');
  });
});
