import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
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
    preserveSymlinks: false,
  },
  optimizeDeps: {
    exclude: ['@slotclient/config'],
    esbuildOptions: {
      // Tell esbuild to treat .ts files as TypeScript and skip type checking
      loader: {
        '.ts': 'ts',
      },
    },
  },
  assetsInclude: ['**/*.skel', '**/*.atlas', '**/*.ttf', '**/*.otf'],
});

