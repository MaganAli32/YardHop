import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env from both current directory (frontend) and parent directory
    const parentEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
    const localEnv = loadEnv(mode, __dirname, '');
    // Merge: local env takes precedence
    const env = { ...parentEnv, ...localEnv };
    
    return {
      root: __dirname, // Frontend is now the Vite root
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
        },
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
        outDir: 'dist', // Output to frontend/dist (relative to frontend root)
        emptyOutDir: true,
      }
    };
});
