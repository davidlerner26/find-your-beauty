import { defineConfig } from 'vitest/config';

// Tests that need the Firebase emulators: security rules (npm run test:rules) and functions (npm run test:functions)
export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts', 'functions/tests/**/*.test.ts'],
    environment: 'node',
    // The emulators are shared, so the files run one after the other
    fileParallelism: false,
    testTimeout: 15000,
  },
});
