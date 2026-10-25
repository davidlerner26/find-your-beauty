// The test site must not show up in search engines: its robots.txt blocks everything.
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist', 'find-your-beauty', 'browser');
fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log('robots.txt (Disallow) written to', dist);
