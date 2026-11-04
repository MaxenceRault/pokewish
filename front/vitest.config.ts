import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Seulement les tests unitaires : e2e/ est pour Playwright
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Logique TypeScript du front (utils, composables). Les pages .vue
      // sont couvertes par les tests e2e Playwright, pas par Vitest.
      include: ['app/**/*.ts'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
