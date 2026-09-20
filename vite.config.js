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
        main: resolve(__dirname, 'index.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        games: resolve(__dirname, 'games.html'),
        lab: resolve(__dirname, 'lab.html'),
      },
    },
  },
})
