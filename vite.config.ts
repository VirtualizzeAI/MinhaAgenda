import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-core';
          }

          if (id.includes('@mantine')) {
            return 'mantine';
          }

          if (id.includes('lucide-react')) {
            return 'icons';
          }

          if (id.includes('dayjs')) {
            return 'date-utils';
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

