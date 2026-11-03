import { test as base, expect, type Locator, type Page } from '@playwright/test'
import type { Pokemon, WishlistItem } from '../app/types/pokemon'
import { API_URL } from './env'

/** Petit Pokédex de test, renvoyé à la place de PokéAPI. */
export const DEX: Pokemon[] = [
  { id: 1, name: 'Bulbizarre' },
  { id: 4, name: 'Salamèche' },
  { id: 7, name: 'Carapuce' },
  { id: 25, name: 'Pikachu' },
  { id: 26, name: 'Raichu' },
  { id: 94, name: 'Ectoplasma' },
  { id: 133, name: 'Évoli' },
  { id: 150, name: 'Mewtwo' },
  { id: 849, name: 'Salarsen' },
]

const byName = (name: string): Pokemon => DEX.find((p) => p.name === name)!

// PNG 1×1 transparent : remplace les sprites, pour ne rien télécharger
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** Fiche PokéAPI de Pikachu (réponses /pokemon/25 et /pokemon-species/25). */
const PIKACHU = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  types: [{ slot: 1, type: { name: 'electric' } }],
  stats: [
    { base_stat: 35, stat: { name: 'hp' } },
    { base_stat: 55, stat: { name: 'attack' } },
    { base_stat: 90, stat: { name: 'speed' } },
  ],
  sprites: {
    front_default: 'https://raw.githubusercontent.com/sprites/25.png',
    other: {
      'official-artwork': {
        front_default: 'https://raw.githubusercontent.com/art/25.png',
      },
    },
  },
  species: {
    name: 'pikachu',
    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
  },
}
const PIKACHU_SPECIES = {
  id: 25,
  name: 'pikachu',
  names: [{ name: 'Pikachu', language: { name: 'fr' } }],
  genera: [{ genus: 'Pokémon Souris', language: { name: 'fr' } }],
  flavor_text_entries: [
    {
      flavor_text: 'Il stocke\nde l’électricité dans ses joues.',
      language: { name: 'fr' },
    },
  ],
}

/** Simule PokéAPI, les sprites et les polices : aucun appel réseau externe. */
async function mockExternal(page: Page): Promise<void> {
  await page.route('https://beta.pokeapi.co/graphql/**', (route) =>
    route.fulfill({
      json: {
        data: {
          pokemon_v2_pokemonspeciesname: DEX.map((p) => ({
            name: p.name,
            pokemon_species_id: p.id,
          })),
        },
      },
    }),
  )
  await page.route('https://pokeapi.co/**', (route) =>
    route.fulfill({ status: 500 }),
  )
  // Fiches /pokemon/[name] : seul Pikachu existe (par nom ou numéro), sinon 404
  await page.route(
    /pokeapi\.co\/api\/v2\/pokemon(-species)?\/([^/?]+)\/?$/,
    (route) => {
      const [, species, key] = route
        .request()
        .url()
        .match(/pokemon(-species)?\/([^/?]+)\/?$/)!
      if (key !== '25' && key !== 'pikachu') {
        return route.fulfill({ status: 404, body: 'Not Found' })
      }
      return route.fulfill({ json: species ? PIKACHU_SPECIES : PIKACHU })
    },
  )
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
  reset(): Promise<void>
}

/** Les éléments de la page que les tests manipulent. */
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
        await page.goto('/')
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
