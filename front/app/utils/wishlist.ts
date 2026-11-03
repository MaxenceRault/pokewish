import type { Pokemon, WishlistItem } from '~/types/pokemon'

/** Cache des noms du Pokédex dans une langue (ils ne changent quasiment jamais). */
export function dexCacheKey(lang: string): string {
  return `pokewish:dex-${lang}:v1`
}

/**
 * Comme une équipe : 6 Pokémon maximum. C'est l'API qui fait respecter la
 * règle (409 WISHLIST_FULL) ; le front s'en sert seulement pour l'affichage.
 */
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

/** Minuscules, sans espaces autour ni accents : « Salamèche » -> « salameche ». */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function searchPokemon(
  all: Pokemon[],
  query: string,
  limit = 10,
): Pokemon[] {
  const q = normalizeName(query)
  if (!q) return []
  return all
    .filter((p) => normalizeName(p.name).includes(q) || String(p.id) === q)
    .slice(0, limit)
}

/** Relit une liste de Pokémon mise en cache ; [] si absente ou invalide. */
export function parsePokemonList(raw: string | null): Pokemon[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(
      (p): p is Pokemon =>
        typeof p?.id === 'number' && typeof p?.name === 'string',
    )
  } catch {
    return []
  }
}
