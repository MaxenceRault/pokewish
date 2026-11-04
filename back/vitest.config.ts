import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // Tout le code de l'API ; index.ts ne fait que démarrer le serveur
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      // text : terminal ; json-summary : badge ; html : rapport détaillé
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
