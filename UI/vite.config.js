import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/feed': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/posts': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/search': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/fixtures': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
