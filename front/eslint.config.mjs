// @ts-check
import prettier from 'eslint-config-prettier/flat'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // console.warn / console.error restent autorisés pour les vraies erreurs
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
  // Désactive les règles de mise en forme : c'est le rôle de Prettier
  prettier,
)
