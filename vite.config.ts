import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Ensure environment variables are available in development
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    // Explicitly define the environment variable for build
    'import.meta.env.VITE_SERVER_URL': JSON.stringify(process.env.VITE_SERVER_URL),
  },
  preview: {
    allowedHosts: [
      'aicv-frontend.ashymoss-b2d15dcf.eastus.azurecontainerapps.io'
    ]
  }
});
