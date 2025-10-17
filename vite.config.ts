import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load envs from the directory where this config resides to avoid cwd issues
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // Ensure environment variables are available in development/build
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(env.VITE_SERVER_URL),
    },
    preview: {
      allowedHosts: [
        'aicv-frontend.ashymoss-b2d15dcf.eastus.azurecontainerapps.io'
      ]
    }
  };
});
