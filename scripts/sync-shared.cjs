// Copies shared/domain.ts (what the app and the Cloud Functions agree on) into functions/src/shared/.
// usage: node scripts/sync-shared.cjs          copies it
//        node scripts/sync-shared.cjs --check  fails when the copy is not the same (used by the tests)
const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'shared', 'domain.ts');
const copy = path.join(__dirname, '..', 'functions', 'src', 'shared', 'domain.ts');
const header =
  '// COPY of shared/domain.ts: do not edit here. Run `npm run sync:shared` after changing the original.\n';

const wanted = header + fs.readFileSync(source, 'utf8');

if (process.argv.includes('--check')) {
  const current = fs.existsSync(copy) ? fs.readFileSync(copy, 'utf8') : '';
  if (current !== wanted) {
    console.error(
      'functions/src/shared/domain.ts is not the same as shared/domain.ts: run `npm run sync:shared`.',
    );
    process.exit(1);
  }
  process.exit(0);
}
fs.mkdirSync(path.dirname(copy), { recursive: true });
fs.writeFileSync(copy, wanted);
console.log('functions/src/shared/domain.ts updated');
