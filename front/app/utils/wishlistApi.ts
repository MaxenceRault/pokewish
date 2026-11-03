import type { Pokemon, WishlistItem } from '~/types/pokemon'

/** Erreur renvoyée par l'API Hono (ou réseau coupé : status 0). */
export class WishlistApiError extends Error {
  constructor(
    public readonly status: number,
    /** Code d'erreur de l'API : DUPLICATE, WISHLIST_FULL, NOT_FOUND… */
    public readonly code: string | null,
    message: string,
  ) {
    super(message)
    this.name = 'WishlistApiError'
  }
}

async function request<T>(
  base: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new WishlistApiError(
      0,
      null,
      "L'API PokéWish est injoignable. Lance `npm run dev` dans back/.",
    )
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string
      message?: string
    } | null
    throw new WishlistApiError(
      res.status,
      body?.error ?? null,
      body?.message ?? `L'API a répondu ${res.status}.`,
    )
  }

  return (res.status === 204 ? undefined : await res.json()) as T
}

/** GET /wishlist */
export function getWishlist(base: string): Promise<WishlistItem[]> {
  return request(base, '/wishlist')
}

/** POST /wishlist -> le Pokémon ajouté (201) */
export function addToWishlist(
  base: string,
  pokemon: Pokemon,
): Promise<WishlistItem> {
  return request(base, '/wishlist', {
    method: 'POST',
    body: JSON.stringify({ id: pokemon.id, name: pokemon.name }),
  })
}

/** PATCH /wishlist/:id -> le Pokémon mis à jour */
export function setWishlistCaught(
  base: string,
  id: number,
  caught: boolean,
): Promise<WishlistItem> {
  return request(base, `/wishlist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ caught }),
  })
}

/** DELETE /wishlist/:id (204) */
export function removeFromWishlist(base: string, id: number): Promise<void> {
  return request(base, `/wishlist/${id}`, { method: 'DELETE' })
}
