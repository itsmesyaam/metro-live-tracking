import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kochi-metro/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  }
});
