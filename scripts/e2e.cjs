// Runs the Playwright tests inside the Firebase emulators. Extra arguments go to Playwright:
//   npm run e2e -- --project=desktop e2e/login.spec.ts
const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2).map((arg) => `'${arg.replace(/'/g, `'\\''`)}'`);
const command = ['npx playwright test', ...args].join(' ');

const result = spawnSync(
  'npx',
  [
    'firebase',
    'emulators:exec',
    '--only',
    'auth,firestore,storage',
    '--project',
    'demo-find-your-beauty',
    command,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
