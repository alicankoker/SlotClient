import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      external: ['stats-js'],
      output: {
        manualChunks: () => 'index',
        entryFileNames: 'index.js',
        chunkFileNames: 'index.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@slotclient/types': path.resolve(__dirname, '../../types/src/index.ts'),
      '@slotclient/engine': path.resolve(__dirname, '../../engine/src'),
      '@slotclient/nexus': path.resolve(__dirname, '../../nexus/src'),
      '@slotclient/communication': path.resolve(__dirname, '../../communication/src'),
      '@slotclient/config': path.resolve(__dirname, '../../config/src'),
      '@slotclient/server': path.resolve(__dirname, '../../server/src'),
    },
  },
  assetsInclude: ['**/*.skel', '**/*.atlas', '**/*.ttf', '**/*.otf'],
});

