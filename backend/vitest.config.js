import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['services/**/*.test.js', 'routes/**/*.test.js', 'middleware/**/*.test.js', 'utils/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['services/**', 'routes/**', 'middleware/**'],
      exclude: ['**/node_modules/**'],
    },
  },
});
