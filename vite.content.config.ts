import { defineConfig } from 'vite';
import { baseConfig } from './vite.config';

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    lib: {
      entry: 'src/content.ts',
      name: 'content',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
});