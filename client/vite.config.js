/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true, secure: false } } },
  define: { 'import.meta.env.VITE_API_BASE': JSON.stringify('/api') },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    testTimeout: 30000,
    server: { deps: { interopDefault: true } },
  },
})
