// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Adresse de l'API Hono (back/). Celle présente au build est intégrée
      // (CI : API AWS) ; surchargeable ensuite par la même variable :
      // NUXT_PUBLIC_API_BASE=http://localhost:4000 npm run dev
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3001',
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
  // Site statique (npm run generate) : une page HTML par Pokémon.
  // Les noms viennent de PokéAPI au moment du build ; seule la langue par
  // défaut est pré-générée (/pokemon/pikachu), les autres langues et les
  // liens par numéro (/pokemon/25) sont rendus dans le navigateur (200.html).
  hooks: {
    async 'nitro:config'(nitroConfig) {
      if (!nitroConfig.static) return // seulement pour `nuxt generate`
      const limit = Number(process.env.PRERENDER_POKEMON_LIMIT ?? 1025)
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon?limit=${limit}`,
      )
      if (!res.ok) throw new Error(`PokéAPI a répondu ${res.status}`)
      const { results } = (await res.json()) as {
        results: { name: string }[]
      }
      const routes = results.map((p) => `/pokemon/${p.name}`)
      nitroConfig.prerender ??= {}
      nitroConfig.prerender.routes = [
        ...(nitroConfig.prerender.routes ?? []),
        // Accueil dans chaque langue + une fiche par Pokémon (langue par défaut)
        '/',
        '/fr',
        '/es',
        '/de',
        ...routes,
      ]
      // Ne pas suivre les liens (sélecteur de langue) : sinon 4 × 1025 pages
      // et ~8000 appels à PokéAPI à chaque build
      nitroConfig.prerender.crawlLinks = false
      // PokéAPI peut répondre lentement : on réessaie avant d'échouer
      nitroConfig.prerender.retry = 3
      nitroConfig.prerender.retryDelay = 1000
    },
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
