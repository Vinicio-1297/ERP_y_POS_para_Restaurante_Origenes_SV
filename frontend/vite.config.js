import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Reenvía las llamadas de la interfaz a la API durante el desarrollo.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});