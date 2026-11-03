import type { Pokemon, WishlistItem } from '~/types/pokemon'

/** Où appeler l'API, et dans quelle langue elle doit répondre. */
export interface ApiTarget {
  base: string
  /** Code langue (en, fr, es, de) envoyé dans Accept-Language */
  lang?: string
}

/** Erreur renvoyée par l'API Hono (ou réseau coupé : status 0). */
export class WishlistApiError extends Error {
  constructor(
    public readonly status: number,
    /** Code d'erreur : DUPLICATE, WISHLIST_FULL, NOT_FOUND…, NETWORK si coupé */
    public readonly code: string | null,
    /** Message de l'API, déjà traduit par elle ; `null` si elle n'en a pas donné */
    public readonly apiMessage: string | null,
  ) {
    super(apiMessage ?? (status ? `HTTP ${status}` : 'Network error'))
    this.name = 'WishlistApiError'
  }
}

async function request<T>(
  { base, lang }: ApiTarget,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(lang && { 'Accept-Language': lang }),
        ...init?.headers,
      },
    })
  } catch {
    throw new WishlistApiError(0, 'NETWORK', null)
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string
      message?: string
    } | null
    throw new WishlistApiError(
      res.status,
      body?.error ?? null,
      body?.message ?? null,
    )
  }

  return (res.status === 204 ? undefined : await res.json()) as T
}

/** GET /wishlist */
export function getWishlist(api: ApiTarget): Promise<WishlistItem[]> {
  return request(api, '/wishlist')
}

/** POST /wishlist -> le Pokémon ajouté (201) */
export function addToWishlist(
  api: ApiTarget,
  pokemon: Pokemon,
): Promise<WishlistItem> {
  return request(api, '/wishlist', {
    method: 'POST',
    body: JSON.stringify({ id: pokemon.id, name: pokemon.name }),
  })
}

/** PATCH /wishlist/:id -> le Pokémon mis à jour */
export function setWishlistCaught(
  api: ApiTarget,
  id: number,
  caught: boolean,
): Promise<WishlistItem> {
  return request(api, `/wishlist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ caught }),
  })
}

/** DELETE /wishlist/:id (204) */
export function removeFromWishlist(api: ApiTarget, id: number): Promise<void> {
  return request(api, `/wishlist/${id}`, { method: 'DELETE' })
}
