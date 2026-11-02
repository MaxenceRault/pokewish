import { defineConfig, devices } from '@playwright/test'
import { API_PORT, API_URL, FRONT_PORT, FRONT_URL } from './e2e/env'

const CI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  // Une seule API en mémoire, partagée par tous les tests : ils passent
  // l'un après l'autre, et chacun repart d'une wishlist vide.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONT_URL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Playwright démarre (et arrête) la vraie API Hono et le front buildé
  webServer: [
    {
      command: 'npm run build --prefix ../back && node ../back/dist/index.js',
      url: `${API_URL}/health`,
      env: { PORT: String(API_PORT) },
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: 'npx nuxt build && node .output/server/index.mjs',
      url: FRONT_URL,
      env: { PORT: String(FRONT_PORT), NUXT_PUBLIC_API_BASE: API_URL },
      reuseExistingServer: !CI,
      timeout: 180_000,
    },
  ],
})
