import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Multi-page build: the desktop experience and each standalone site are
// independent entry points so the sites can be designed/reviewed on their own.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        portfolio: resolve(import.meta.dirname, 'portfolio.html'),
        games: resolve(import.meta.dirname, 'games.html'),
        lab: resolve(import.meta.dirname, 'lab.html'),
      },
    },
  },
})
