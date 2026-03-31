import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
  },
  resolve: {
    alias: {
      // Tells Vitest exactly where to find the shared types during tests
      '@ha-yemot/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});