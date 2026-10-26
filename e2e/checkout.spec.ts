import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { openFirstFreeDay } from './support/booking';
import { CLIENT, CLIENT2, PRO } from './support/data';
import { signIn } from './support/helpers';
import { seed } from './support/seed';

test.beforeEach(async () => {
  await seed();
});

// Picks the first time of the day and asks to book: in the test environment that opens the payment screen
async function chooseATime(page: Page) {
  await openFirstFreeDay(page);
  await page.locator('button.time:not([disabled])').first().click();
  await page.getByPlaceholder('Digite suas observações aqui').fill('Pele sensível');
  await page.getByRole('button', { name: 'Finalizar' }).click();
}

const bookings = (page: Page) => page.locator('article.booking');

test.describe('payment before the booking (test environment)', () => {
  test('shows what is being booked and creates nothing until the payment', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await chooseATime(page);

    await expect(page).toHaveURL(/\/profissionais\/pro-e2e-1\/pagamento$/);
    await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible();

    const summary = page.getByRole('region', { name: 'Resumo do agendamento' });
    await expect(summary.getByText(PRO.name)).toBeVisible();
    await expect(summary.getByText('1 hora')).toBeVisible();
    await expect(summary.getByText(PRO.service)).toBeVisible();
    await expect(summary.getByText('R$ 100,00')).toHaveCount(2);
    await expect(summary.getByText(`${CLIENT.firstName} ${CLIENT.lastName}`)).toBeVisible();
    await expect(page.getByText('o pagamento é simulado e nada é cobrado')).toBeVisible();

    // Nothing was booked yet
    await page.goto('/agenda');
    await expect(bookings(page)).toHaveCount(0);
  });

  test('"Pagar agora" books, and the client sees it waiting', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await chooseATime(page);

    await page.getByRole('button', { name: 'Pagar agora' }).click();
    // While it processes the button cannot be pressed again
    await expect(page.getByRole('button', { name: 'Processando...' })).toBeDisabled();

    await expect(page).toHaveURL(/\/agenda$/);
    await expect(bookings(page)).toHaveCount(1);
    await expect(bookings(page).first().getByText('Aguardando')).toBeVisible();
    await expect(bookings(page).first().getByText('Pele sensível')).toHaveCount(0);
  });

  test('the back button returns to the booking screen with the services still chosen', async ({
    page,
  }) => {
    await signIn(page, CLIENT.email);
    await chooseATime(page);
    await page.getByRole('button', { name: 'Voltar' }).click();

    await expect(page).toHaveURL(/\/agendar\?servicos=/);
    await expect(page.getByRole('heading', { name: 'Agendar serviço' })).toBeVisible();
  });

  test('without a chosen booking the screen is not available: a link or a reload goes back', async ({
    page,
  }) => {
    await signIn(page, CLIENT.email);
    await page.goto(`/profissionais/${PRO.uid}/pagamento`);
    await expect(page).toHaveURL(/\/agendar$/);

    // A reload of the payment screen forgets the choice
    await chooseATime(page);
    await expect(page).toHaveURL(/\/pagamento$/);
    await page.reload();
    await expect(page).toHaveURL(/\/agendar$/);
  });

  test('a visitor cannot reach it either', async ({ page }) => {
    await page.goto(`/profissionais/${PRO.uid}/pagamento`);
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('if someone takes the time meanwhile, the payment says so and books nothing', async ({
    page,
    browser,
  }) => {
    await signIn(page, CLIENT.email);
    await chooseATime(page);
    await expect(page).toHaveURL(/\/pagamento$/);

    // Another client books the same first time while this one is on the payment screen
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signIn(other, CLIENT2.email);
    await chooseATime(other);
    await other.getByRole('button', { name: 'Pagar agora' }).click();
    await expect(other).toHaveURL(/\/agenda$/);
    await otherContext.close();

    await page.getByRole('button', { name: 'Pagar agora' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Este horário acabou de ser ocupado. Escolha outro.',
    );
    await expect(page).toHaveURL(/\/pagamento$/);
    await expect(page.getByRole('button', { name: 'Pagar agora' })).toBeEnabled();

    await page.goto('/agenda');
    await expect(bookings(page)).toHaveCount(0);
  });

  test('has no serious accessibility problems', async ({ page }) => {
    await signIn(page, CLIENT.email);
    await chooseATime(page);
    await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['label-content-name-mismatch'])
      .analyze();
    expect(
      violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} ${v.nodes[0]?.target.join(' ')}`),
    ).toEqual([]);
  });
});

test.describe('without the payment (how production books)', () => {
  test('"Finalizar" books straight away and there is no payment screen', async ({ page }) => {
    // The e2e build lets a test turn the feature off, like production has it
    await page.addInitScript(() => localStorage.setItem('e2e-checkout', 'off'));
    await signIn(page, CLIENT.email);
    await chooseATime(page);

    await expect(page).toHaveURL(/\/agenda$/);
    await expect(bookings(page)).toHaveCount(1);
    await expect(bookings(page).first().getByText('Aguardando')).toBeVisible();

    // And the payment address goes back to the booking screen
    await page.goto(`/profissionais/${PRO.uid}/pagamento`);
    await expect(page).toHaveURL(/\/agendar$/);
  });
});
