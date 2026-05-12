import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/security-rules/**/*.test.ts'],
    testTimeout: 30000,
  },
});
