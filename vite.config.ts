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
  },
  preview: {
    allowedHosts: [
      'aicv-frontend.ashymoss-b2d15dcf.eastus.azurecontainerapps.io'
    ]
  }
});
