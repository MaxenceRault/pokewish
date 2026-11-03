import type { Pokemon } from '~/types/pokemon'
import { dexCacheKey, parsePokemonList } from './wishlist'

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

export function loadDexCache(lang: string, storage?: Storage): Pokemon[] {
  return parsePokemonList(readStorage(dexCacheKey(lang), storage))
}

export function saveDexCache(
  lang: string,
  dex: Pokemon[],
  storage?: Storage,
): boolean {
  return writeStorage(dexCacheKey(lang), JSON.stringify(dex), storage)
}

/** Pokémon que CE navigateur a likés (pour pouvoir annuler son like). */
export const LIKED_KEY = 'pokewish:liked'

export function loadLiked(storage?: Storage): number[] {
  try {
    const data: unknown = JSON.parse(readStorage(LIKED_KEY, storage) ?? '[]')
    return Array.isArray(data)
      ? data.filter((id): id is number => Number.isInteger(id))
      : []
  } catch {
    return []
  }
}

export function saveLiked(ids: number[], storage?: Storage): boolean {
  return writeStorage(LIKED_KEY, JSON.stringify(ids), storage)
}
