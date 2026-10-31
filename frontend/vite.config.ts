/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Go backend: the browser only ever talks to the
    // Vite origin, so no CORS setup is needed.
    proxy: {
      '/api': 'http://127.0.0.1:8081',
    },
    watch: {
      // Writing a coverage report must not reload the page.
      ignored: ['**/coverage/**'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      // Report every source file, including ones no test imports yet.
      include: ['src/**/*.{ts,tsx}'],
    },
  },
})
