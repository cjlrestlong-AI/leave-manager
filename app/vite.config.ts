/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const isSingle = process.argv.includes('--mode') && process.argv.includes('single');

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../site', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: mode !== 'single',
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
    chunkSizeWarningLimit: 900,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));

export { isSingle };
