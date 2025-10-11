import { defineConfig } from 'vite';
import { baseConfig } from './vite.config';

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    lib: {
      entry: 'src/popup.ts',
      name: 'popup',
      formats: ['iife'],
      fileName: () => 'popup.js',
    },
  },
});