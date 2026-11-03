import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ciRunnerServerPlugin } from './server/ciPipelineRunner.js';

// `base: './'` produce rutas relativas, por lo que el build funciona en
// GitHub Pages sin importar el nombre del repositorio (se usa HashRouter).
export default defineConfig({
  plugins: [react(), ciRunnerServerPlugin()],
  base: './',
  server: {
    port: 5173,
    open: false,
    watch: {
      ignored: ['**/.ci-workspaces/**'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
});
