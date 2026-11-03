import type {
  PokeApiListResponse,
  PokeApiPokemonResponse,
  PokeApiSpeciesNamesResponse,
  PokeApiSpeciesResponse,
  Pokemon,
  PokemonDetails,
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
  const key = pokemonKey(nameOrId)
  const res = await fetch(`${POKEAPI_URL}/pokemon-species/${key}`)
  if (res.status === 404) return null
  if (!res.ok) throw new PokeApiError(res.status)
  const data = (await res.json()) as PokeApiSpeciesResponse
  const fr = data.names.find((n) => n.language.name === 'fr')
  return { id: data.id, name: fr?.name ?? data.name }
}

/** Identifiant PokéAPI : nom anglais en minuscules ou numéro, encodé pour l'URL. */
function pokemonKey(nameOrId: string | number): string {
  return encodeURIComponent(String(nameOrId).trim().toLowerCase())
}

export const TYPES_FR: Record<string, string> = {
  normal: 'Normal',
  fire: 'Feu',
  water: 'Eau',
  grass: 'Plante',
  electric: 'Électrik',
  ice: 'Glace',
  fighting: 'Combat',
  poison: 'Poison',
  ground: 'Sol',
  flying: 'Vol',
  psychic: 'Psy',
  bug: 'Insecte',
  rock: 'Roche',
  ghost: 'Spectre',
  dragon: 'Dragon',
  dark: 'Ténèbres',
  steel: 'Acier',
  fairy: 'Fée',
}

const STATS_FR: Record<string, string> = {
  hp: 'PV',
  attack: 'Attaque',
  defense: 'Défense',
  'special-attack': 'Atq. Spé.',
  'special-defense': 'Déf. Spé.',
  speed: 'Vitesse',
}

const inFrench = <T extends { language: { name: string } }>(list?: T[]) =>
  (list ?? []).filter((entry) => entry.language.name === 'fr')

/**
 * Fiche complète d'un Pokémon (nom anglais ou numéro), en français ;
 * `null` s'il n'existe pas (404). Deux appels : /pokemon puis /pokemon-species.
 */
export async function fetchPokemonDetails(
  nameOrId: string | number,
): Promise<PokemonDetails | null> {
  const res = await fetch(`${POKEAPI_URL}/pokemon/${pokemonKey(nameOrId)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new PokeApiError(res.status)
  const pokemon = (await res.json()) as PokeApiPokemonResponse

  // L'espèce donne le nom, la catégorie et la description en français.
  // Si elle ne répond pas, on affiche quand même la fiche (en anglais).
  const speciesRes = await fetch(pokemon.species.url)
  const species = speciesRes.ok
    ? ((await speciesRes.json()) as PokeApiSpeciesResponse)
    : null

  const description = inFrench(species?.flavor_text_entries).at(-1)
  const typeKeys = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)

  return {
    id: pokemon.id,
    name: inFrench(species?.names)[0]?.name ?? pokemon.name,
    genus: inFrench(species?.genera)[0]?.genus ?? null,
    // Les textes du Pokédex contiennent des retours à la ligne « de cartouche »
    description: description
      ? description.flavor_text.replace(/\s+/g, ' ').trim()
      : null,
    types: typeKeys.map((key) => TYPES_FR[key] ?? key),
    typeKeys,
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    image:
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.front_default,
    stats: pokemon.stats.map((s) => ({
      key: s.stat.name,
      label: STATS_FR[s.stat.name] ?? s.stat.name,
      value: s.base_stat,
    })),
  }
}
