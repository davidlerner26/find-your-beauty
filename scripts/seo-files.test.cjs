// node --test scripts/seo-files.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRobots, buildSitemap, fetchProfessionalIds } = require('./seo-files.cjs');

test('robots.txt lets the site in, keeps the private screens out and points to the sitemap', () => {
  const robots = buildRobots('https://findyourbeauty.com.br');
  assert.match(robots, /^User-agent: \*\nAllow: \/\n/);
  assert.match(robots, /Disallow: \/pro\//);
  assert.match(robots, /Disallow: \/agenda/);
  assert.match(robots, /Disallow: \/profissionais\/\*\/agendar/);
  assert.match(robots, /Sitemap: https:\/\/findyourbeauty\.com\.br\/sitemap\.xml\n$/);
  // The home must not be blocked
  assert.doesNotMatch(robots, /Disallow: \/\n/);
});

test('the sitemap lists the fixed pages and the professionals, with the characters of the address escaped', () => {
  const xml = buildSitemap('https://findyourbeauty.com.br', ['ana', 'a&b'], '2026-11-03');
  assert.match(xml, /<loc>https:\/\/findyourbeauty\.com\.br\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/findyourbeauty\.com\.br\/termos<\/loc>/);
  assert.match(xml, /<loc>https:\/\/findyourbeauty\.com\.br\/explorar\/ana<\/loc>/);
  assert.match(xml, /explorar\/a%26b</);
  assert.match(xml, /<lastmod>2026-11-03<\/lastmod>/);
  assert.doesNotMatch(xml, /\/agenda|\/pro\//);
});

test('reads the ids of the visible professionals from the answer of Firestore', async () => {
  const fake = async () => ({
    ok: true,
    json: async () => [
      { document: { name: 'projects/p/databases/(default)/documents/professionals/ana' } },
      { document: { name: 'projects/p/databases/(default)/documents/professionals/bia' } },
    ],
  });
  assert.deepEqual(await fetchProfessionalIds('p', fake), ['ana', 'bia']);
});

test('an empty answer (only the read time) is no professionals, and an error is an error', async () => {
  const empty = async () => ({
    ok: true,
    json: async () => [{ readTime: '2026-11-03T00:00:00Z' }],
  });
  assert.deepEqual(await fetchProfessionalIds('p', empty), []);
  const failing = async () => ({ ok: false, status: 403 });
  await assert.rejects(fetchProfessionalIds('p', failing), /403/);
});
