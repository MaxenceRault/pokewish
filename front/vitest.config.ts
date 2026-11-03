import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Seulement les tests unitaires : e2e/ est pour Playwright
    include: ['tests/**/*.test.ts'],
  },
})
