import { expect, Page, test } from '@playwright/test';
import { PRO } from './support/data';
import { seed } from './support/seed';

// Read only tests: they start from the seed
test.beforeAll(async () => {
  await seed();
});

const meta = (page: Page, selector: string) => page.locator(`meta[${selector}]`);
const jsonLd = async (page: Page) =>
  JSON.parse((await page.locator('script[data-seo]').textContent()) ?? 'null');

test.describe('what a search engine reads', () => {
  test('the home has a title, a description, the canonical address and the data of the site', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Maquiagem e cabelo perto de você | Find Your Beauty');
    await expect(meta(page, 'name=description')).toHaveAttribute('content', /agende o seu horário/);
    await expect(meta(page, 'name=robots')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      'https://findyourbeauty.com.br/',
    );
    await expect(meta(page, 'property="og:image"')).toHaveAttribute(
      'content',
      'https://findyourbeauty.com.br/og-image.png',
    );
    await expect
      .poll(async () => (await jsonLd(page)).map((node: { '@type': string }) => node['@type']))
      .toEqual(['Organization', 'WebSite']);
  });

  test('the cards of the home are links a crawler can follow', async ({ page }) => {
    await page.goto('/');
    // The name on the card is an <a href>, not only a click on the card
    const link = page.locator(`a[href="/explorar/${PRO.uid}"]`).first();
    await expect(link).toHaveText(PRO.name);
  });

  test('a professional has its own title, description, canonical address and structured data', async ({
    page,
  }) => {
    await page.goto(`/explorar/${PRO.uid}`);
    await expect(page).toHaveTitle(`${PRO.name} · Maquiagem em Botafogo | Find Your Beauty`);
    await expect(meta(page, 'name=description')).toHaveAttribute(
      'content',
      /faz maquiagem há anos/,
    );
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      `https://findyourbeauty.com.br/explorar/${PRO.uid}`,
    );
    await expect.poll(async () => (await jsonLd(page))?.['@type']).toBe('HealthAndBeautyBusiness');
    const data = await jsonLd(page);
    expect(data.name).toBe(PRO.name);
    expect(data.address.addressLocality).toBe('Rio de Janeiro');
    expect(data.aggregateRating.ratingValue).toBe(4.5);
  });

  test('a professional who does not exist is kept out', async ({ page }) => {
    await page.goto('/explorar/ninguem');
    await expect(page).toHaveTitle('Profissional não encontrado | Find Your Beauty');
    await expect(meta(page, 'name=robots')).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('the screens of the accounts are kept out', async ({ page }) => {
    for (const [path, title] of [
      ['/agenda', 'Agenda'],
      ['/entrar', 'Entrar'],
      ['/mensagens', 'Mensagens'],
    ]) {
      await page.goto(path);
      await expect(page, path).toHaveTitle(`${title} | Find Your Beauty`);
      await expect(meta(page, 'name=robots'), path).toHaveAttribute('content', 'noindex, nofollow');
    }
  });
});
