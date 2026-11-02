import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPokemon,
  fetchPokemonList,
  fetchPokemonListFr,
  PokeApiError,
  POKEAPI_GRAPHQL_URL,
  POKEAPI_URL,
} from '../app/utils/pokeapi'

/** Fabrique une vraie `Response` JSON, comme le ferait le serveur. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Fiche « species » minimale, avec les noms dans plusieurs langues. */
function species(id: number, name: string, names: Record<string, string>) {
  return {
    id,
    name,
    names: Object.entries(names).map(([lang, n]) => ({
      name: n,
      language: { name: lang },
    })),
  }
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  // Remplace le fetch global : aucun appel réseau ne peut partir
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('fetchPokemon', () => {
  it('réponse 200 : renvoie le Pokémon avec son nom français', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        species(4, 'charmander', {
          en: 'Charmander',
          fr: 'Salamèche',
          de: 'Glumanda',
        }),
      ),
    )

    await expect(fetchPokemon('charmander')).resolves.toEqual({
      id: 4,
      name: 'Salamèche',
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${POKEAPI_URL}/pokemon-species/charmander`,
    )
  })

  it("garde le nom anglais s'il n'y a pas de traduction française", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(species(25, 'pikachu', { en: 'Pikachu' })),
    )

    await expect(fetchPokemon(25)).resolves.toEqual({ id: 25, name: 'pikachu' })
  })

  it('Pokémon introuvable (404) : renvoie null', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    await expect(fetchPokemon('missingno')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${POKEAPI_URL}/pokemon-species/missingno`,
    )
  })

  it("normalise la saisie avant l'appel (espaces, majuscules, numéro)", async () => {
    // Une Response neuve à chaque appel : un body ne se lit qu'une fois
    fetchMock.mockImplementation(async () =>
      jsonResponse(species(25, 'pikachu', { fr: 'Pikachu' })),
    )

    await fetchPokemon('  PIKACHU ')
    await fetchPokemon(25)

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${POKEAPI_URL}/pokemon-species/pikachu`,
      `${POKEAPI_URL}/pokemon-species/25`,
    ])
  })

  it('erreur serveur (500) : lève une PokeApiError', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Oops', { status: 500 }))

    const error = await fetchPokemon('pikachu').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PokeApiError)
    expect(error).toMatchObject({ status: 500 })
  })

  it('réseau coupé : propage l’erreur de fetch', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(fetchPokemon('pikachu')).rejects.toThrow('fetch failed')
  })
})

describe('fetchPokemonListFr (GraphQL)', () => {
  it('réponse 200 : renvoie les noms français en { id, name }', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          pokemon_v2_pokemonspeciesname: [
            { name: 'Bulbizarre', pokemon_species_id: 1 },
            { name: 'Salamèche', pokemon_species_id: 4 },
          ],
        },
      }),
    )

    await expect(fetchPokemonListFr()).resolves.toEqual([
      { id: 1, name: 'Bulbizarre' },
      { id: 4, name: 'Salamèche' },
    ])

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(POKEAPI_GRAPHQL_URL)
    expect(init?.method).toBe('POST')
    expect(String(init?.body)).toContain('\\"fr\\"')
  })

  it('erreur HTTP : lève une PokeApiError', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))

    await expect(fetchPokemonListFr()).rejects.toMatchObject({ status: 429 })
  })

  it('erreur GraphQL (réponse 200 avec errors) : lève une erreur', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ message: 'field not found' }] }),
    )

    await expect(fetchPokemonListFr()).rejects.toThrow('field not found')
  })
})

describe('fetchPokemonList (secours, noms anglais)', () => {
  it('réponse 200 : convertit les résultats en { id, name }', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        count: 2,
        results: [
          { name: 'bulbasaur', url: `${POKEAPI_URL}/pokemon/1/` },
          { name: 'pikachu', url: `${POKEAPI_URL}/pokemon/25/` },
        ],
      }),
    )

    await expect(fetchPokemonList()).resolves.toEqual([
      { id: 1, name: 'bulbasaur' },
      { id: 25, name: 'pikachu' },
    ])
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${POKEAPI_URL}/pokemon?limit=2000`,
    )
  })

  it('erreur HTTP : lève une PokeApiError', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))

    await expect(fetchPokemonList()).rejects.toBeInstanceOf(PokeApiError)
  })
})
