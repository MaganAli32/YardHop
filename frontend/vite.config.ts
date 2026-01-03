import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env from root directory (one level up)
    const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
    return {
      root: __dirname, // Frontend is now the Vite root
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: path.resolve(__dirname, '../dist'), // Output to root dist folder
        emptyOutDir: true,
      }
    };
});
