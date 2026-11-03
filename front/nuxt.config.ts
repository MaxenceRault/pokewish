// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Adresse de l'API Hono (back/). Surchargeable sans rebuild :
      // NUXT_PUBLIC_API_BASE=http://localhost:4000 npm run dev
      apiBase: 'http://localhost:3001',
      // PokéAPI REST, appelée aussi côté serveur (SSR des fiches).
      // Remplacée par un faux PokéAPI dans les tests e2e : NUXT_PUBLIC_POKEAPI_URL
      pokeapiUrl: 'https://pokeapi.co/api/v2',
    },
  },
  // Anglais par défaut (/), les autres langues préfixées (/fr, /es, /de) :
  // l'URL suffit à partager une page dans une langue donnée.
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
    ],
  },
  // Inclut les tests (Vitest et Playwright) dans `nuxt typecheck`
  typescript: {
    tsConfig: {
      include: ['../tests/**/*', '../e2e/**/*', '../playwright.config.ts'],
    },
  },
  app: {
    head: {
      title: 'PokéWish',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap',
        },
      ],
    },
  },
})
