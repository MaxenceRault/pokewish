/** Un Pokémon : son numéro de Pokédex et son nom (français, envoyé par le front). */
export interface Pokemon {
  id: number
  name: string
}

/** Une entrée de la wishlist : un Pokémon + son statut de capture. */
export interface WishlistItem extends Pokemon {
  caught: boolean
}

/** Corps de toutes les réponses d'erreur de l'API. */
export interface ApiError {
  error: 'INVALID_BODY' | 'INVALID_ID' | 'NOT_FOUND' | AddError
  message: string
}

export type AddError = 'DUPLICATE' | 'WISHLIST_FULL'
