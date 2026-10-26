import { expect, Page } from '@playwright/test';

// The e2e build has fake payments: cards live in the browser and a card that ends in 0002 is always refused
export const GOOD_CARD = '4242424242424242';
export const DECLINED_CARD = '4000000000000002';

// On the cards screen: opens the form, types the number and saves
export async function saveCard(page: Page, number = GOOD_CARD) {
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  await page.getByPlaceholder('Número do cartão (teste)').fill(number);
  await page.getByRole('button', { name: 'Salvar cartão' }).click();
}

// On the payment screen: saves a card first when there is none, then pays
export async function pay(page: Page) {
  const addCard = page.getByRole('link', { name: 'Cadastrar cartão' });
  const chosen = page.getByRole('link', { name: 'Trocar o cartão' });
  // The cards are still loading at first: wait to know whether there is one
  await expect(addCard.or(chosen)).toBeVisible();

  if (await addCard.isVisible()) {
    await addCard.click();
    await saveCard(page);
    await expect(page).toHaveURL(/\/pagamento$/);
  }
  await page.getByRole('button', { name: 'Pagar agora' }).click();
}
