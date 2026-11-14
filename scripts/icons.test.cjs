const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The app loads a subset of the font Material Symbols (index.html, `icon_names=...`): an icon that is not in the list
// shows as a letter or as a wrong shape. Every icon written in a template has to be in the list.
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const listed = new Set((html.match(/icon_names=([^"&']+)/)?.[1] ?? '').split(','));

// Words that are written as `icon: '...'` but are not names of icons of the font (the kind of a notification)
const NOT_ICONS = new Set(['calendar']);

const files = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(html|ts)$/.test(entry.name) && !/\.(spec|stories)\.ts$/.test(entry.name)
      ? [full]
      : [];
  });

test('the font has a subset list', () => {
  assert.ok(listed.size > 10, 'icon_names was not found in src/index.html');
});

test('every icon written in the app is in the list of the font', () => {
  const missing = [];
  for (const file of files(path.join(root, 'src', 'app'))) {
    const text = fs.readFileSync(file, 'utf8');
    const names = [
      // <mat-icon>name</mat-icon> (a name written out, not a binding)
      ...[...text.matchAll(/<mat-icon[^>]*>\s*([a-z_0-9]+)\s*<\/mat-icon>/g)].map((m) => m[1]),
      // icon: 'name' (the tabs, the lists of icons)
      ...[...text.matchAll(/\bicon:\s*'([a-z_0-9]+)'/g)].map((m) => m[1]),
    ];
    for (const name of names) {
      if (!listed.has(name) && !NOT_ICONS.has(name))
        missing.push(`${path.relative(root, file)}: ${name}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Add these to icon_names in src/index.html and .storybook/preview-head.html`,
  );
});
