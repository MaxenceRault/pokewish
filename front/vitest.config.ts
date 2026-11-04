import { defineVitestConfig } from '@nuxt/test-utils/config'

// defineVitestConfig : les fichiers qui le demandent (// @vitest-environment
// nuxt, dans tests/nuxt/) tournent dans une vraie app Nuxt (i18n,
// runtimeConfig, cycle de vie des composants). Les autres restent en Node.
export default defineVitestConfig({
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
