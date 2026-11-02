import type { Pokemon, WishlistItem } from '~/types/pokemon'

export const STORAGE_KEY = 'pokewish:list'

/** Comme une équipe : 6 Pokémon maximum dans la wishlist. */
export const MAX_WISHLIST = 6

export function isWishlistFull(list: WishlistItem[]): boolean {
  return list.length >= MAX_WISHLIST
}

export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

// "https://pokeapi.co/api/v2/pokemon/25/" -> 25
export function idFromUrl(url: string): number {
  return Number(url.split('/').filter(Boolean).pop())
}

export function searchPokemon(
  all: Pokemon[],
  query: string,
  limit = 10,
): Pokemon[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return all
    .filter((p) => p.name.includes(q) || String(p.id) === q)
    .slice(0, limit)
}

export function addPokemon(
  list: WishlistItem[],
  pokemon: Pokemon,
): WishlistItem[] {
  if (list.some((p) => p.id === pokemon.id)) return list
  if (isWishlistFull(list)) return list
  return [...list, { id: pokemon.id, name: pokemon.name, caught: false }]
}

export function toggleCaught(list: WishlistItem[], id: number): WishlistItem[] {
  return list.map((p) => (p.id === id ? { ...p, caught: !p.caught } : p))
}

export function removePokemon(
  list: WishlistItem[],
  id: number,
): WishlistItem[] {
  return list.filter((p) => p.id !== id)
}

export function parseWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (p): p is WishlistItem =>
          typeof p?.id === 'number' &&
          typeof p?.name === 'string' &&
          typeof p?.caught === 'boolean',
      )
      .slice(0, MAX_WISHLIST)
  } catch {
    return []
  }
}
