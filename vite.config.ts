/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves this project at https://<user>.github.io/hala-space-adventure/
// Override with BASE_PATH=/ for other hosts (e.g. local preview at root).
const base = process.env.BASE_PATH ?? '/hala-space-adventure/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    target: ['es2020', 'safari14'],
    chunkSizeWarningLimit: 800,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
