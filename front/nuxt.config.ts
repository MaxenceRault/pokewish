// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Adresse de l'API Hono (back/). Surchargeable sans rebuild :
      // NUXT_PUBLIC_API_BASE=http://localhost:4000 npm run dev
      apiBase: 'http://localhost:3001',
    },
  },
  // Inclut les tests Vitest dans `nuxt typecheck`
  typescript: {
    tsConfig: { include: ['../tests/**/*'] },
  },
  app: {
    head: {
      title: 'PokéWishlist',
      htmlAttrs: { lang: 'fr' },
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
