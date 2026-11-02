import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/feed': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/posts': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/notifications': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/users': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/search': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/health': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/fixtures': {
        target: 'https://social-feed-backend-kc5w.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
