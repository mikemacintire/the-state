import { defineConfig } from 'vite';

/**
 * Vite config for the renderer (the game UI). Kept separate from
 * vitest.config.ts so the test runner does not inherit dev-server settings.
 */
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
