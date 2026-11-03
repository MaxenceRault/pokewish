/** Un Pokémon tel qu'on le connaît dans l'app : son numéro et son nom PokéAPI. */
export interface Pokemon {
  id: number
  name: string
}

/** Une entrée de la wishlist : un Pokémon + son statut de capture. */
export interface WishlistItem extends Pokemon {
  caught: boolean
}

/** Réponse de GET https://pokeapi.co/api/v2/pokemon?limit=… */
export interface PokeApiListResponse {
  count: number
  results: { name: string; url: string }[]
}

/** Réponse (partielle) de GET https://pokeapi.co/api/v2/pokemon-species/{nom ou id} */
export interface PokeApiSpeciesResponse {
  id: number
  /** Nom anglais, en minuscules (« pikachu ») */
  name: string
  /** Le nom dans chaque langue */
  names: { name: string; language: { name: string } }[]
  /** Catégorie (« Pokémon Souris ») dans chaque langue */
  genera?: { genus: string; language: { name: string } }[]
  /** Descriptions du Pokédex, par jeu et par langue */
  flavor_text_entries?: { flavor_text: string; language: { name: string } }[]
}

/** Réponse (partielle) de GET https://pokeapi.co/api/v2/pokemon/{nom ou id} */
export interface PokeApiPokemonResponse {
  id: number
  name: string
  /** En décimètres */
  height: number
  /** En hectogrammes */
  weight: number
  types: { slot: number; type: { name: string } }[]
  stats: { base_stat: number; stat: { name: string } }[]
  sprites: {
    front_default: string | null
    other?: { 'official-artwork'?: { front_default: string | null } }
  }
  species: { name: string; url: string }
}

/** Fiche d'un Pokémon, prête à afficher (textes dans la langue demandée). */
export interface PokemonDetails extends Pokemon {
  /** Catégorie, ex. « Pokémon Souris » */
  genus: string | null
  /** Description du Pokédex la plus récente */
  description: string | null
  /** Clés des types, ex. ['fire', 'flying'] (libellés : fichiers i18n) */
  types: string[]
  /** En mètres */
  height: number
  /** En kilogrammes */
  weight: number
  image: string | null
  /** Clés des stats (hp, attack…) et valeurs de base */
  stats: { key: string; value: number }[]
}

/** Réponse de l'API GraphQL de PokéAPI pour les noms d'espèces dans une langue */
export interface PokeApiSpeciesNamesResponse {
  data?: {
    pokemon_v2_pokemonspeciesname: {
      name: string
      pokemon_species_id: number
    }[]
  }
  errors?: { message: string }[]
}
