import type { Ref } from 'vue'
import type { Pokemon, WishlistItem } from '~/types/pokemon'

export interface UseWishlist {
  list: Ref<WishlistItem[]>
  /** Chargement initial depuis l'API */
  status: Ref<'pending' | 'success' | 'error'>
  /** Dernier message d'erreur de l'API, à afficher ; `null` si tout va bien */
  error: Ref<string | null>
  add: (pokemon: Pokemon) => Promise<void>
  toggle: (id: number) => Promise<void>
  remove: (id: number) => Promise<void>
  reload: () => Promise<void>
}

/** La wishlist vit dans l'API Hono : le front ne fait qu'afficher et appeler. */
export function useWishlist(): UseWishlist {
  const base = useRuntimeConfig().public.apiBase
  const list = useState<WishlistItem[]>('wishlist', () => [])
  const status = useState<UseWishlist['status']['value']>(
    'wishlist-status',
    () => 'pending',
  )
  const error = useState<string | null>('wishlist-error', () => null)

  /** Lance un appel API ; en cas d'échec, garde le message pour l'afficher. */
  async function run(call: () => Promise<void>): Promise<void> {
    try {
      await call()
      error.value = null
    } catch (e) {
      error.value =
        e instanceof WishlistApiError
          ? e.message
          : "Erreur inattendue de l'API."
    }
  }

  async function reload(): Promise<void> {
    status.value = 'pending'
    await run(async () => {
      list.value = await getWishlist(base)
    })
    status.value = error.value ? 'error' : 'success'
  }

  onMounted(reload)

  return {
    list,
    status,
    error,
    reload,
    add: (pokemon) =>
      run(async () => {
        const item = await addToWishlist(base, pokemon)
        list.value = [...list.value, item]
      }),
    toggle: (id) =>
      run(async () => {
        const current = list.value.find((p) => p.id === id)
        if (!current) return
        const item = await setWishlistCaught(base, id, !current.caught)
        list.value = list.value.map((p) => (p.id === id ? item : p))
      }),
    remove: (id) =>
      run(async () => {
        await removeFromWishlist(base, id)
        list.value = list.value.filter((p) => p.id !== id)
      }),
  }
}
