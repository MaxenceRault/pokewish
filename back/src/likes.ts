/**
 * Les likes : un compteur par Pokémon. Deux implémentations, même comportement :
 * - createLikesStore : en mémoire (tests, ou sans base)
 * - createPostgresLikesStore (db.ts) : table `likes` (migration 001)
 */
export interface LikesStore {
  /** Nombre de likes (0 si jamais liké) */
  get(id: number): Promise<number>
  /** +1, renvoie le nouveau total */
  like(id: number): Promise<number>
  /** −1 (jamais sous 0), renvoie le nouveau total */
  unlike(id: number): Promise<number>
}

export function createLikesStore(
  initial: Record<number, number> = {},
): LikesStore {
  const counts = new Map(
    Object.entries(initial).map(([id, n]) => [Number(id), n]),
  )
  const get = (id: number) => counts.get(id) ?? 0

  return {
    async get(id) {
      return get(id)
    },
    async like(id) {
      counts.set(id, get(id) + 1)
      return get(id)
    },
    async unlike(id) {
      counts.set(id, Math.max(0, get(id) - 1))
      return get(id)
    },
  }
}
