import { test as base, expect, type Locator, type Page } from '@playwright/test'
import type { Pokemon, WishlistItem } from '../app/types/pokemon'
import { API_URL } from './env'

/** Petit Pokédex de test, dans chaque langue, renvoyé à la place de PokéAPI. */
const NAMES: Record<number, Record<'en' | 'fr' | 'es' | 'de', string>> = {
  1: { en: 'Bulbasaur', fr: 'Bulbizarre', es: 'Bulbasaur', de: 'Bisasam' },
  4: { en: 'Charmander', fr: 'Salamèche', es: 'Charmander', de: 'Glumanda' },
  7: { en: 'Squirtle', fr: 'Carapuce', es: 'Squirtle', de: 'Schiggy' },
  25: { en: 'Pikachu', fr: 'Pikachu', es: 'Pikachu', de: 'Pikachu' },
  26: { en: 'Raichu', fr: 'Raichu', es: 'Raichu', de: 'Raichu' },
  94: { en: 'Gengar', fr: 'Ectoplasma', es: 'Gengar', de: 'Gengar' },
  133: { en: 'Eevee', fr: 'Évoli', es: 'Eevee', de: 'Evoli' },
  150: { en: 'Mewtwo', fr: 'Mewtwo', es: 'Mewtwo', de: 'Mewtu' },
  849: { en: 'Toxtricity', fr: 'Salarsen', es: 'Toxtricity', de: 'Riffex' },
}

/** Le Pokédex dans une langue (le français sert pour préparer les données). */
export const dexIn = (lang: keyof (typeof NAMES)[1]): Pokemon[] =>
  Object.entries(NAMES).map(([id, names]) => ({
    id: Number(id),
    name: names[lang],
  }))

export const DEX = dexIn('fr')

const byName = (name: string): Pokemon => DEX.find((p) => p.name === name)!

// PNG 1×1 transparent : remplace les sprites, pour ne rien télécharger
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** Simule PokéAPI, les sprites et les polices : aucun appel réseau externe. */
async function mockExternal(page: Page): Promise<void> {
  // Les noms dans la langue demandée (variable GraphQL `lang`)
  await page.route('https://beta.pokeapi.co/graphql/**', (route) => {
    const { lang } = route.request().postDataJSON().variables
    return route.fulfill({
      json: {
        data: {
          pokemon_v2_pokemonspeciesname: dexIn(lang).map((p) => ({
            name: p.name,
            pokemon_species_id: p.id,
          })),
        },
      },
    })
  })
  await page.route('https://pokeapi.co/**', (route) =>
    route.fulfill({ status: 500 }),
  )
  // Fiches /pokemon/[name] : servies par le faux PokéAPI (e2e/mock-pokeapi.mjs),
  // appelé par le serveur Nuxt (SSR) comme par le navigateur.
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({ body: PIXEL, contentType: 'image/png' }),
  )
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort())
}

/** Accès direct à l'API Hono, pour préparer et vérifier son état. */
export interface WishlistApi {
  list(): Promise<WishlistItem[]>
  /** Ajoute des Pokémon du DEX par leur nom (et les marque capturés si demandé) */
  seed(names: string[], options?: { caught?: string[] }): Promise<void>
  /** Retire un Pokémon du DEX côté API, dans le dos de la page */
  remove(name: string): Promise<void>
  reset(): Promise<void>
}

/**
 * Les éléments de la page que les tests manipulent, en FRANÇAIS (/fr).
 * L'anglais par défaut et le changement de langue : voir i18n.spec.ts.
 */
export interface PokewishPage {
  goto(): Promise<void>
  search: Locator
  results: Locator
  wishlist: Locator
  /** Bouton d'un résultat de recherche */
  tile(name: string): Locator
  /** Carte d'un Pokémon de la wishlist */
  card(name: string): Locator
  /** Cherche puis clique sur le résultat */
  add(query: string, name: string): Promise<void>
}

export const test = base.extend<{
  api: WishlistApi
  app: PokewishPage
  pageErrors: string[]
  pokeApi: undefined
}>({
  // PokéAPI, sprites et polices simulés pour TOUS les tests : aucun ne peut
  // appeler le vrai réseau par oubli. Un test peut ajouter ses propres
  // page.route(), qui passent avant (les plus récentes gagnent).
  pokeApi: [
    async ({ page }, use) => {
      await mockExternal(page)
      await use(undefined)
    },
    { auto: true },
  ],

  // Chaque test part d'une wishlist vide côté API — même ceux qui n'utilisent
  // pas `api` (auto), sinon un test hériterait de l'état du précédent
  api: [
    async ({ request }, use) => {
      const api: WishlistApi = {
        async list() {
          return (await request.get(`${API_URL}/wishlist`)).json()
        },
        async remove(name) {
          await request.delete(`${API_URL}/wishlist/${byName(name).id}`)
        },
        async reset() {
          for (const item of await api.list()) {
            await request.delete(`${API_URL}/wishlist/${item.id}`)
          }
        },
        async seed(names, options = {}) {
          for (const name of names) {
            const res = await request.post(`${API_URL}/wishlist`, {
              data: byName(name),
            })
            expect(res.status(), `seed ${name}`).toBe(201)
            if (options.caught?.includes(name)) {
              await request.patch(`${API_URL}/wishlist/${byName(name).id}`, {
                data: { caught: true },
              })
            }
          }
        },
      }
      await api.reset()
      await use(api)
    },
    { auto: true },
  ],

  // Toute erreur JavaScript de la page fait échouer le test
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await use(errors)
      expect(errors, 'erreurs JavaScript dans la page').toEqual([])
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    const search = page.getByRole('searchbox', {
      name: 'Rechercher un Pokémon par nom ou numéro',
    })
    const results = page.getByRole('list', { name: 'Résultats de recherche' })
    const wishlist = page.getByRole('list', { name: 'Ma wishlist' })

    const app: PokewishPage = {
      search,
      results,
      wishlist,
      async goto() {
        await page.goto('/fr')
        // Pokédex chargé et wishlist récupérée depuis l'API
        await expect(search).toBeEnabled()
        await expect(page.getByText("Connexion à l'API")).toBeHidden()
      },
      tile: (name) => results.getByRole('button', { name }),
      card: (name) => wishlist.getByRole('listitem').filter({ hasText: name }),
      async add(query, name) {
        await search.fill(query)
        await app.tile(name).click()
        await expect(app.card(name)).toBeVisible()
      },
    }
    await use(app)
  },
})

export { expect }
