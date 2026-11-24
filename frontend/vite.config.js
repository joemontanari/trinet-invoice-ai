import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3000' },
    // Solo desarrollo: la carpeta local tiene tildes y ":" que la lista de rutas permitidas no reconoce.
    fs: { strict: false },
  },
});
