import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import ogImagePlugin from './scripts/og-image-plugin.ts';

// `base: './'` keeps the built assets relative so the game can be hosted on
// GitHub Pages (project pages), Cloudflare Pages, or any static file server.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), ogImagePlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
