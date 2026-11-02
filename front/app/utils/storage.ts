import type { Pokemon, WishlistItem } from '~/types/pokemon'
import {
  DEX_CACHE_KEY,
  parsePokemonList,
  parseWishlist,
  STORAGE_KEY,
} from './wishlist'

// Le stockage peut être absent (rendu serveur) ou lever une erreur
// (navigation privée, stockage bloqué, quota plein) : on ne plante jamais.

/** Lit une clé ; `null` si absente ou si le stockage est inaccessible. */
export function readStorage(key: string, storage?: Storage): string | null {
  try {
    return (storage ?? localStorage).getItem(key)
  } catch {
    return null
  }
}

/** Écrit une clé ; `false` si l'écriture a échoué. */
export function writeStorage(
  key: string,
  value: string,
  storage?: Storage,
): boolean {
  try {
    ;(storage ?? localStorage).setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function loadWishlist(storage?: Storage): WishlistItem[] {
  return parseWishlist(readStorage(STORAGE_KEY, storage))
}

export function saveWishlist(list: WishlistItem[], storage?: Storage): boolean {
  return writeStorage(STORAGE_KEY, JSON.stringify(list), storage)
}

export function loadDexCache(storage?: Storage): Pokemon[] {
  return parsePokemonList(readStorage(DEX_CACHE_KEY, storage))
}

export function saveDexCache(dex: Pokemon[], storage?: Storage): boolean {
  return writeStorage(DEX_CACHE_KEY, JSON.stringify(dex), storage)
}
