import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@pablo/shared': path.resolve(__dirname, '../shared/src'),
      '@pablo/server': path.resolve(__dirname, '../server/src'),
    },
  },
});

