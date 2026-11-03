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

// La langue est passée en variable GraphQL : jamais collée dans la requête
const NAMES_QUERY = `query names($lang: String!) {
  pokemon_v2_pokemonspeciesname(
    where: { pokemon_v2_language: { name: { _eq: $lang } } }
    order_by: { pokemon_species_id: asc }
  ) { name pokemon_species_id }
}`

/** Tous les Pokémon avec leur nom dans une langue (en, fr, es, de), en un appel. */
export async function fetchPokemonNames(lang: string): Promise<Pokemon[]> {
  const res = await fetch(POKEAPI_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: NAMES_QUERY, variables: { lang } }),
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

/** Tous les Pokémon avec leur identifiant anglais (API REST) : sert de secours. */
export async function fetchPokemonList(limit = 2000): Promise<Pokemon[]> {
  const res = await fetch(`${POKEAPI_URL}/pokemon?limit=${limit}`)
  if (!res.ok) throw new PokeApiError(res.status)
  const data = (await res.json()) as PokeApiListResponse
  return data.results.map((p) => ({ id: idFromUrl(p.url), name: p.name }))
}

/** Identifiant PokéAPI : nom anglais en minuscules ou numéro, encodé pour l'URL. */
function pokemonKey(nameOrId: string | number): string {
  return encodeURIComponent(String(nameOrId).trim().toLowerCase())
}

/** Les entrées dans `lang`, sinon en anglais. */
function localized<T extends { language: { name: string } }>(
  list: T[] | undefined,
  lang: string,
): T[] {
  const inLang = (code: string) =>
    (list ?? []).filter((entry) => entry.language.name === code)
  const found = inLang(lang)
  return found.length ? found : inLang('en')
}

/**
 * Un Pokémon par nom anglais ou numéro, avec son nom dans `lang`
 * (anglais si PokéAPI n'a pas de traduction) ; `null` s'il n'existe pas (404).
 */
export async function fetchPokemon(
  nameOrId: string | number,
  lang = 'en',
): Promise<Pokemon | null> {
  const res = await fetch(
    `${POKEAPI_URL}/pokemon-species/${pokemonKey(nameOrId)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new PokeApiError(res.status)
  const data = (await res.json()) as PokeApiSpeciesResponse
  return {
    id: data.id,
    name: localized(data.names, lang)[0]?.name ?? data.name,
  }
}

/**
 * Fiche complète d'un Pokémon (nom anglais ou numéro) avec les textes dans
 * `lang` ; `null` s'il n'existe pas (404). Deux appels : /pokemon puis
 * /pokemon-species. Types et stats restent des clés (fire, hp…) : leur
 * libellé vient des fichiers de traduction de l'app.
 */
export async function fetchPokemonDetails(
  nameOrId: string | number,
  lang = 'en',
): Promise<PokemonDetails | null> {
  const res = await fetch(`${POKEAPI_URL}/pokemon/${pokemonKey(nameOrId)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new PokeApiError(res.status)
  const pokemon = (await res.json()) as PokeApiPokemonResponse

  // L'espèce donne le nom, la catégorie et la description traduits.
  // Si elle ne répond pas, on affiche quand même la fiche.
  const speciesRes = await fetch(pokemon.species.url)
  const species = speciesRes.ok
    ? ((await speciesRes.json()) as PokeApiSpeciesResponse)
    : null

  const description = localized(species?.flavor_text_entries, lang).at(-1)

  return {
    id: pokemon.id,
    name: localized(species?.names, lang)[0]?.name ?? pokemon.name,
    genus: localized(species?.genera, lang)[0]?.genus ?? null,
    // Les textes du Pokédex contiennent des retours à la ligne « de cartouche »
    description: description
      ? description.flavor_text.replace(/\s+/g, ' ').trim()
      : null,
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    image:
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.front_default,
    stats: pokemon.stats.map((s) => ({ key: s.stat.name, value: s.base_stat })),
  }
}
