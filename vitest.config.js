import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'background.js',
        'content.js',
        'popup.js',
        'settings.js',
        'config*.js',
        'icons/**',
        'manifest.json'
      ]
    }
  }
});
