import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Vite provides blazing fast HMR and optimized ES module bundling for modern web apps
export default defineConfig({
  plugins: [react()],
});
