import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, cpSync } from 'fs';

function emitStaticOnce(): Plugin {
  let copied = false;
  return {
    name: 'emit-static-files-once',
    apply: 'build',
    closeBundle() {
      if (copied) return;
      copied = true;
      mkdirSync('dist', { recursive: true });
      copyFileSync('manifest.json', 'dist/manifest.json');
      cpSync('icons', 'dist/icons', { recursive: true });
      copyFileSync('popup.html', 'dist/popup.html');
      try { copyFileSync('config.js', 'dist/config.js'); } catch {}
    },
  };
}

export const baseConfig = {
  plugins: [react(), emitStaticOnce()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    'global': 'globalThis',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    target: 'es2020' as const,
    minify: false,
    rollupOptions: {
      output: {
        extend: true,
        intro: 'const process = { env: { NODE_ENV: "production" }, emit: () => {} };',
      },
    },
  },
};

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    emptyOutDir: true,
    lib: {
      entry: 'src/background.ts',
      name: 'background',
      formats: ['iife'],
      fileName: () => 'background.js',
    },
  },
});
