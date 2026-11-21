import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE = '/hala-space-adventure/'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'off',
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'ipad-landscape', use: { ...devices['iPad (gen 7) landscape'], browserName: 'chromium' } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
})
