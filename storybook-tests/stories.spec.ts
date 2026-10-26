import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

// The addon of Storybook runs axe too when a story is shown: when it is busy, wait a moment and ask again
const scan = async (page: Page) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const { violations } = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // The icons are font ligatures: the word of the icon can't be part of the name of its button
        .disableRules(['label-content-name-mismatch'])
        .analyze();
      return violations;
    } catch (error) {
      if (attempt >= 5 || !String(error).includes('already running')) throw error;
      await page.waitForTimeout(500);
    }
  }
};

type Entry = { id: string; title: string; name: string; type: string };

// The list of stories comes from the build itself, so a new story is tested without touching this file
test.describe('stories', async () => {
  let entries: Entry[] = [];

  test.beforeAll(async ({ request }) => {
    const index = await (await request.get('/index.json')).json();
    entries = (Object.values(index.entries) as Entry[]).filter((entry) => entry.type === 'story');
  });

  test('there are stories to test', () => {
    expect(entries.length).toBeGreaterThan(10);
  });

  for (const theme of ['client', 'pro']) {
    test(`every story renders and has no serious accessibility problem (${theme} look)`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`script error: ${error.message}`));

      for (const entry of entries) {
        await page.goto(
          `/iframe.html?id=${entry.id}&viewMode=story&globals=theme:${theme};a11y.manual:true`,
        );
        // Storybook marks the page when the story is on screen, or shows its error screen
        const label = `${entry.title} / ${entry.name}`;
        await expect(page.locator('body'), label).toHaveClass(/sb-show-(main|errordisplay)/, {
          timeout: 15_000,
        });
        await expect(page.locator('body'), `${label} has an error`).not.toHaveClass(
          /sb-show-errordisplay/,
        );
        await page.waitForTimeout(300);

        const violations = await scan(page);
        for (const v of violations.filter(
          (x) => x.impact === 'serious' || x.impact === 'critical',
        )) {
          problems.push(
            `${entry.title} / ${entry.name}: ${v.id} (${v.nodes[0]?.target.join(' ')})`,
          );
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
