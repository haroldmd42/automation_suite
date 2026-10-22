import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` produce rutas relativas, por lo que el build funciona en
// GitHub Pages sin importar el nombre del repositorio (se usa HashRouter).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
});
