import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const projectId = env.VITE_FIREBASE_PROJECT_ID;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/s/': {
          target: 'http://localhost:5001',
          rewrite: (p) => `/${projectId}/asia-east1/serveSite${p}`,
        },
      },
    },
  };
});
