import type {
  PokeApiListResponse,
  PokeApiSpeciesNamesResponse,
  PokeApiSpeciesResponse,
  Pokemon,
} from '~/types/pokemon'
import { idFromUrl } from './wishlist'

export const POKEAPI_URL = 'https://pokeapi.co/api/v2'
export const POKEAPI_GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta'

export class PokeApiError extends Error {
  constructor(public readonly status: number) {
    super(`PokéAPI a répondu ${status}`)
    this.name = 'PokeApiError'
  }
}

const FRENCH_NAMES_QUERY = `{
  pokemon_v2_pokemonspeciesname(
    where: { pokemon_v2_language: { name: { _eq: "fr" } } }
    order_by: { pokemon_species_id: asc }
  ) { name pokemon_species_id }
}`

/** Tous les Pokémon avec leur nom français, en un seul appel GraphQL. */
export async function fetchPokemonListFr(): Promise<Pokemon[]> {
  const res = await fetch(POKEAPI_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: FRENCH_NAMES_QUERY }),
  })
  if (!res.ok) throw new PokeApiError(res.status)
  const { data, errors } = (await res.json()) as PokeApiSpeciesNamesResponse
  if (errors?.length || !data) {
    throw new Error(
      `GraphQL PokéAPI : ${errors?.[0]?.message ?? 'réponse vide'}`,
    )
  }
  return data.pokemon_v2_pokemonspeciesname.map((p) => ({
    id: p.pokemon_species_id,
    name: p.name,
  }))
}

/** Tous les Pokémon avec leur nom anglais (API REST) : sert de secours. */
export async function fetchPokemonList(limit = 2000): Promise<Pokemon[]> {
  const res = await fetch(`${POKEAPI_URL}/pokemon?limit=${limit}`)
  if (!res.ok) throw new PokeApiError(res.status)
  const data = (await res.json()) as PokeApiListResponse
  return data.results.map((p) => ({ id: idFromUrl(p.url), name: p.name }))
}

/**
 * Un Pokémon par nom anglais ou numéro, avec son nom français
 * (nom anglais si PokéAPI n'a pas de traduction) ; `null` s'il n'existe pas (404).
 */
export async function fetchPokemon(
  nameOrId: string | number,
): Promise<Pokemon | null> {
  const key = encodeURIComponent(String(nameOrId).trim().toLowerCase())
  const res = await fetch(`${POKEAPI_URL}/pokemon-species/${key}`)
  if (res.status === 404) return null
  if (!res.ok) throw new PokeApiError(res.status)
  const data = (await res.json()) as PokeApiSpeciesResponse
  const fr = data.names.find((n) => n.language.name === 'fr')
  return { id: data.id, name: fr?.name ?? data.name }
}
