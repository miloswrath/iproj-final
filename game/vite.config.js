import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
      '/events': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
        ws: false,
      },
    },
  },
});
