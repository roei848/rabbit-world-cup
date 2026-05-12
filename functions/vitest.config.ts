import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['lib/**', 'node_modules/**'],
    env: {
      // Route Firestore calls to the local emulator in all tests.
      // Has no effect in production (the emulator isn't running there).
      FIRESTORE_EMULATOR_HOST: 'localhost:8080',
      GCLOUD_PROJECT: 'rabbit-world-cup',
      GOOGLE_CLOUD_PROJECT: 'rabbit-world-cup',
    },
  },
});
