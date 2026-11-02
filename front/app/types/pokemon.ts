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
