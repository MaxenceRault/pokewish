import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPokemon,
  fetchPokemonDetails,
  fetchPokemonList,
  fetchPokemonNames,
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
  it('réponse 200 : renvoie le Pokémon avec son nom dans la langue demandée', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(
        species(4, 'charmander', {
          en: 'Charmander',
          fr: 'Salamèche',
          de: 'Glumanda',
        }),
      ),
    )

    await expect(fetchPokemon('charmander', 'fr')).resolves.toEqual({
      id: 4,
      name: 'Salamèche',
    })
    await expect(fetchPokemon('charmander', 'de')).resolves.toMatchObject({
      name: 'Glumanda',
    })
    // anglais par défaut
    await expect(fetchPokemon('charmander')).resolves.toMatchObject({
      name: 'Charmander',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${POKEAPI_URL}/pokemon-species/charmander`,
    )
  })

  it("prend le nom anglais s'il n'y a pas de traduction", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(species(25, 'pikachu', { en: 'Pikachu' })),
    )

    await expect(fetchPokemon(25, 'es')).resolves.toEqual({
      id: 25,
      name: 'Pikachu',
    })
  })

  it("garde l'identifiant PokéAPI s'il n'y a aucun nom", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(species(25, 'pikachu', {})))

    await expect(fetchPokemon(25, 'fr')).resolves.toEqual({
      id: 25,
      name: 'pikachu',
    })
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

describe('fetchPokemonNames (GraphQL)', () => {
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

    await expect(fetchPokemonNames('fr')).resolves.toEqual([
      { id: 1, name: 'Bulbizarre' },
      { id: 4, name: 'Salamèche' },
    ])

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(POKEAPI_GRAPHQL_URL)
    expect(init?.method).toBe('POST')
    // la langue part en variable GraphQL, pas collée dans la requête
    expect(JSON.parse(String(init?.body)).variables).toEqual({ lang: 'fr' })
  })

  it('erreur HTTP : lève une PokeApiError', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))

    await expect(fetchPokemonNames('fr')).rejects.toMatchObject({
      status: 429,
    })
  })

  it('erreur GraphQL (réponse 200 avec errors) : lève une erreur', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: [{ message: 'field not found' }] }),
    )

    await expect(fetchPokemonNames('fr')).rejects.toThrow('field not found')
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

describe('fetchPokemonDetails (fiche /pokemon/[name])', () => {
  /** Réponse de /pokemon/{id} : données de combat, en anglais. */
  const pokemonData = {
    id: 6,
    name: 'charizard',
    height: 17,
    weight: 905,
    types: [
      { slot: 2, type: { name: 'flying' } },
      { slot: 1, type: { name: 'fire' } },
    ],
    stats: [
      { base_stat: 78, stat: { name: 'hp' } },
      { base_stat: 109, stat: { name: 'special-attack' } },
    ],
    sprites: {
      front_default: 'https://img.test/6.png',
      other: {
        'official-artwork': { front_default: 'https://img.test/art/6.png' },
      },
    },
    species: { name: 'charizard', url: `${POKEAPI_URL}/pokemon-species/6/` },
  }

  /** Réponse de /pokemon-species/{id} : textes, dont le français. */
  const speciesData = {
    ...species(6, 'charizard', { en: 'Charizard', fr: 'Dracaufeu' }),
    genera: [
      { genus: 'Flame Pokémon', language: { name: 'en' } },
      { genus: 'Pokémon Flamme', language: { name: 'fr' } },
    ],
    flavor_text_entries: [
      { flavor_text: 'Ancienne\ndescription.', language: { name: 'fr' } },
      { flavor_text: 'Spits fire.', language: { name: 'en' } },
      {
        flavor_text: 'Crache du feu\nà très haute\ftempérature.',
        language: { name: 'fr' },
      },
    ],
  }

  it('réponse 200 : textes dans la langue demandée, unités converties', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pokemonData))
      .mockResolvedValueOnce(jsonResponse(speciesData))

    await expect(fetchPokemonDetails('Charizard', 'fr')).resolves.toEqual({
      id: 6,
      name: 'Dracaufeu',
      genus: 'Pokémon Flamme',
      // la description française la plus récente, sans retours à la ligne
      description: 'Crache du feu à très haute température.',
      // clés dans l'ordre des slots (libellés : fichiers de traduction)
      types: ['fire', 'flying'],
      height: 1.7, // 17 décimètres
      weight: 90.5, // 905 hectogrammes
      image: 'https://img.test/art/6.png',
      stats: [
        { key: 'hp', value: 78 },
        { key: 'special-attack', value: 109 },
      ],
    })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${POKEAPI_URL}/pokemon/charizard`,
      `${POKEAPI_URL}/pokemon-species/6`,
    ])
  })

  it('base remplaçable (faux PokéAPI des tests e2e) : les 2 appels y vont', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pokemonData))
      .mockResolvedValueOnce(jsonResponse(speciesData))

    await fetchPokemonDetails(6, 'fr', 'http://localhost:3102')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3102/pokemon/6',
      'http://localhost:3102/pokemon-species/6',
    ])
  })

  it('anglais par défaut, et repli sur l’anglais pour une langue absente', async () => {
    fetchMock.mockImplementation(async (url) =>
      jsonResponse(String(url).includes('species') ? speciesData : pokemonData),
    )

    await expect(fetchPokemonDetails(6)).resolves.toMatchObject({
      name: 'Charizard',
      genus: 'Flame Pokémon',
      description: 'Spits fire.',
    })
    // pas de textes en allemand dans speciesData : repli sur l'anglais
    await expect(fetchPokemonDetails(6, 'de')).resolves.toMatchObject({
      name: 'Charizard',
    })
  })

  it('Pokémon introuvable (404) : renvoie null sans appeler l’espèce', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))

    await expect(fetchPokemonDetails('missingno')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("espèce indisponible : la fiche s'affiche quand même, en anglais", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pokemonData))
      .mockResolvedValueOnce(new Response('', { status: 500 }))

    await expect(fetchPokemonDetails(6)).resolves.toMatchObject({
      name: 'charizard',
      genus: null,
      description: null,
      types: ['fire', 'flying'],
    })
  })

  it('erreur serveur sur /pokemon : lève une PokeApiError', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))

    await expect(fetchPokemonDetails(6)).rejects.toMatchObject({ status: 503 })
  })
})
