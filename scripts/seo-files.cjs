// robots.txt and sitemap.xml of production, written into the build (`node scripts/seo-files.cjs`, run by
// scripts/netlify-build.cjs on the main branch). The test site gets a robots.txt that blocks everything instead
// (scripts/robots-dev.cjs).
// The sitemap lists the fixed pages and the professionals that clients can see: the catalog is public, so it is read
// with the REST API of Firestore, without credentials. If that fails the sitemap keeps the fixed pages: the build must
// not break because of it.
const fs = require('node:fs');
const path = require('node:path');

const SITE_URL = process.env.SITE_URL || 'https://findyourbeauty.com.br';
const DIST = path.join(__dirname, '..', 'dist', 'find-your-beauty', 'browser');

// Pages that are for search engines (the languages other than Portuguese are left out by a header, see netlify.toml)
const PAGES = ['/', '/explorar', '/busca', '/termos', '/privacidade'];

// Screens of the accounts and of the booking: nothing in them to find
const PRIVATE = [
  '/pro/',
  '/admin',
  '/agenda',
  '/mensagens',
  '/notificacoes',
  '/perfil',
  '/cartoes',
  '/entrar',
  '/cadastro',
  '/esqueci-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/boas-vindas',
  '/profissionais/*/agendar',
  '/profissionais/*/pagamento',
];

const buildRobots = (siteUrl) =>
  [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE.map((route) => `Disallow: ${route}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');

const escapeXml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildSitemap = (siteUrl, professionalIds, today) => {
  const urls = [
    ...PAGES.map((page) => ({ loc: `${siteUrl}${page}`, priority: page === '/' ? '1.0' : '0.5' })),
    ...professionalIds.map((id) => ({
      loc: `${siteUrl}/profissionais/${encodeURIComponent(id)}`,
      priority: '0.8',
    })),
  ];
  const entries = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${url.priority}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};

// The ids of the professionals that clients can see: published and visible
const fetchProfessionalIds = async (projectId, fetchFn = fetch) => {
  const field = (fieldPath) => ({
    fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: { booleanValue: true } },
  });
  const response = await fetchFn(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'professionals' }],
          where: {
            compositeFilter: { op: 'AND', filters: [field('published'), field('visible')] },
          },
          select: { fields: [{ fieldPath: '__name__' }] },
          limit: 5000,
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`Firestore answered ${response.status}`);
  const rows = await response.json();
  // A row without a document is the read time of an empty answer
  return rows.filter((row) => row.document).map((row) => row.document.name.split('/').pop());
};

const projectId = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.firebaserc'), 'utf8')).projects.default;

async function run() {
  let ids = [];
  try {
    ids = await fetchProfessionalIds(projectId());
  } catch (error) {
    console.warn(
      `sitemap: the professionals could not be read (${error.message}); only the fixed pages are listed`,
    );
  }
  fs.writeFileSync(path.join(DIST, 'robots.txt'), buildRobots(SITE_URL));
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    buildSitemap(SITE_URL, ids, new Date().toISOString().slice(0, 10)),
  );
  console.log(
    `robots.txt and sitemap.xml (${PAGES.length} pages, ${ids.length} professionals) written to ${DIST}`,
  );
}

module.exports = { PAGES, PRIVATE, buildRobots, buildSitemap, fetchProfessionalIds };

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
