import type { AddError, Pokemon, WishlistItem } from './types.js'

/** Comme une équipe : 6 Pokémon maximum dans la wishlist. */
export const MAX_WISHLIST = 6

export function isWishlistFull(list: WishlistItem[]): boolean {
  return list.length >= MAX_WISHLIST
}

/** Pourquoi ce Pokémon ne peut pas être ajouté ; `null` s'il peut l'être. */
export function checkAdd(list: WishlistItem[], id: number): AddError | null {
  if (list.some((p) => p.id === id)) return 'DUPLICATE'
  if (isWishlistFull(list)) return 'WISHLIST_FULL'
  return null
}

/** Ajoute en fin de liste ; renvoie la même liste si l'ajout est refusé. */
export function addPokemon(
  list: WishlistItem[],
  pokemon: Pokemon,
): WishlistItem[] {
  if (checkAdd(list, pokemon.id)) return list
  return [...list, { id: pokemon.id, name: pokemon.name, caught: false }]
}

export function removePokemon(
  list: WishlistItem[],
  id: number,
): WishlistItem[] {
  return list.filter((p) => p.id !== id)
}

export function setCaught(
  list: WishlistItem[],
  id: number,
  caught: boolean,
): WishlistItem[] {
  return list.map((p) => (p.id === id ? { ...p, caught } : p))
}

/** La wishlist, gardée dans un simple tableau en mémoire (perdue au redémarrage). */
export interface WishlistStore {
  all(): WishlistItem[]
  add(pokemon: Pokemon): { item: WishlistItem } | { error: AddError }
  /** `false` si le Pokémon n'était pas dans la liste */
  remove(id: number): boolean
  /** `null` si le Pokémon n'est pas dans la liste */
  setCaught(id: number, caught: boolean): WishlistItem | null
}

export function createWishlistStore(
  initial: WishlistItem[] = [],
): WishlistStore {
  let items = [...initial]

  return {
    all: () => items,
    add(pokemon) {
      const error = checkAdd(items, pokemon.id)
      if (error) return { error }
      items = addPokemon(items, pokemon)
      return { item: items.at(-1)! }
    },
    remove(id) {
      const before = items.length
      items = removePokemon(items, id)
      return items.length < before
    },
    setCaught(id, caught) {
      if (!items.some((p) => p.id === id)) return null
      items = setCaught(items, id, caught)
      return items.find((p) => p.id === id)!
    },
  }
}
