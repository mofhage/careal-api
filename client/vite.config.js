/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true, secure: false } } },
  test: {
    environment: 'jsdom',
    // Tests get a relative API base. This must live here, NOT in a top-level
    // `define`, which would also be baked into every production build.
    env: { VITE_API_BASE: '/api' },
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    testTimeout: 30000,
    server: { deps: { interopDefault: true } },
  },
})
