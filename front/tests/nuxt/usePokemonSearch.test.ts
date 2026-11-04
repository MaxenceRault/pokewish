// @vitest-environment nuxt
// usePokemonSearch dans une vraie app Nuxt ; PokéAPI (fetch) est simulée.
import { clearNuxtData } from '#imports'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POKEAPI_GRAPHQL_URL } from '../../app/utils/pokeapi'
import { jsonResponse, withSetup } from './helpers'

const fetchMock = vi.fn<typeof fetch>()

const graphql = (names: [number, string][]) =>
  jsonResponse({
    data: {
      pokemon_v2_pokemonspeciesname: names.map(([id, name]) => ({
        pokemon_species_id: id,
        name,
      })),
    },
  })

async function mounted() {
  const search = await withSetup(() => usePokemonSearch())
  await vi.waitFor(() => expect(search.status.value).toBe('success'))
  return search
}

beforeEach(() => {
  clearNuxtData()
  localStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('usePokemonSearch', () => {
  it('charge les noms dans la langue de l’app (GraphQL) et les met en cache', async () => {
    fetchMock.mockResolvedValueOnce(
      graphql([
        [4, 'Charmander'],
        [25, 'Pikachu'],
      ]),
    )

    const { dex } = await mounted()

    expect(dex.value).toEqual([
      { id: 4, name: 'Charmander' },
      { id: 25, name: 'Pikachu' },
    ])
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(POKEAPI_GRAPHQL_URL)
    expect(JSON.parse(String(init?.body)).variables).toEqual({ lang: 'en' })
    expect(JSON.parse(localStorage.getItem('pokewish:dex-en:v1')!)).toEqual(
      dex.value,
    )
  })

  it('cache présent : aucun appel à PokéAPI', async () => {
    localStorage.setItem(
      'pokewish:dex-en:v1',
      JSON.stringify([{ id: 133, name: 'Eevee' }]),
    )

    const { dex } = await mounted()

    expect(dex.value).toEqual([{ id: 133, name: 'Eevee' }])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('GraphQL en panne : repli sur la liste REST (identifiants anglais)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          results: [
            { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
          ],
        }),
      )

    const { dex } = await mounted()

    expect(dex.value).toEqual([{ id: 25, name: 'pikachu' }])
    expect(console.warn).toHaveBeenCalled()
  })

  it('recherche (sans accents) et nom par numéro', async () => {
    fetchMock.mockResolvedValueOnce(
      graphql([
        [4, 'Charmander'],
        [5, 'Charmeleon'],
        [25, 'Pikachu'],
      ]),
    )
    const search = await mounted()

    search.query.value = 'CHARM'
    expect(search.results.value.map((p) => p.name)).toEqual([
      'Charmander',
      'Charmeleon',
    ])
    search.query.value = '25'
    expect(search.results.value).toEqual([{ id: 25, name: 'Pikachu' }])

    expect(search.nameOf(4)).toBe('Charmander')
    expect(search.nameOf(999)).toBeUndefined()
  })

  it('tout PokéAPI en panne : statut error', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }))

    const search = await withSetup(() => usePokemonSearch())

    await vi.waitFor(() => expect(search.status.value).toBe('error'))
    expect(search.dex.value).toEqual([])
  })
})
