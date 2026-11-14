import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { assertProductionApiConfig } from './productionApiGuard.mjs';

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    assertProductionApiConfig(loadEnv(mode, process.cwd(), 'VITE_'));
  }
  return {
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-http': ['axios'],
        }
      }
    }
  }
};
});
