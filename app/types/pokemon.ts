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
