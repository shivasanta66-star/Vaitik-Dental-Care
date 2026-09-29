import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Relative base so the built site works from any folder or sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        book: resolve(import.meta.dirname, 'book.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
});
