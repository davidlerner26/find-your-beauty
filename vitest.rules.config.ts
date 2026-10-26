import { defineConfig } from 'vitest/config';

// Security rules tests: they run against the Firebase emulators (npm run test:rules)
export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    environment: 'node',
    // The emulators are shared, so the files run one after the other
    fileParallelism: false,
    testTimeout: 15000,
  },
});
