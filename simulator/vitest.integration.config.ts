import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.integration.test.{ts,tsx}'],
      // Integration test files share one Firestore/Auth emulator instance
      // per `emulators:exec` run. Running them in parallel workers races
      // the shared test user's sign-in/creation (and would race shared
      // Firestore fixture data too) -- run them one file at a time.
      fileParallelism: false,
    },
  })
);
