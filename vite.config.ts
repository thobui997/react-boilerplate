import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig((configEnv) => {
  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    resolve: {
      alias: {
        '@app': path.resolve(__dirname, 'src')
      }
    },
    build: {
      sourcemap: configEnv.mode === 'development'
    }
  };
});
