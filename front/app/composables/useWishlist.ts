import type { Ref } from 'vue'
import type { Pokemon, WishlistItem } from '~/types/pokemon'

export interface UseWishlist {
  list: Ref<WishlistItem[]>
  /** Chargement initial depuis l'API */
  status: Ref<'pending' | 'success' | 'error'>
  /** Dernier message d'erreur à afficher (dans la langue choisie) ; `null` si tout va bien */
  error: Ref<string | null>
  add: (pokemon: Pokemon) => Promise<void>
  toggle: (id: number) => Promise<void>
  remove: (id: number) => Promise<void>
  reload: () => Promise<void>
}

/** La wishlist vit dans l'API Hono : le front ne fait qu'afficher et appeler. */
export function useWishlist(): UseWishlist {
  const { locale, t } = useI18n()
  const base = useRuntimeConfig().public.apiBase
  // L'API répond dans la langue de l'interface (en-tête Accept-Language)
  const api = (): ApiTarget => ({ base, lang: locale.value })

  const list = useState<WishlistItem[]>('wishlist', () => [])
  const status = useState<UseWishlist['status']['value']>(
    'wishlist-status',
    () => 'pending',
  )
  const error = useState<string | null>('wishlist-error', () => null)

  /** Message affiché : celui de l'API s'il y en a un (déjà traduit), sinon le nôtre. */
  function messageOf(e: unknown): string {
    if (!(e instanceof WishlistApiError)) return t('errors.unexpected')
    if (e.apiMessage) return e.apiMessage
    return e.status === 0
      ? t('errors.network')
      : t('errors.http', { status: e.status })
  }

  /** Lance un appel API ; en cas d'échec, garde le message pour l'afficher. */
  async function run(call: () => Promise<void>): Promise<void> {
    try {
      await call()
      error.value = null
    } catch (e) {
      error.value = messageOf(e)
    }
  }

  async function reload(): Promise<void> {
    status.value = 'pending'
    await run(async () => {
      list.value = await getWishlist(api())
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
        const item = await addToWishlist(api(), pokemon)
        list.value = [...list.value, item]
      }),
    toggle: (id) =>
      run(async () => {
        const current = list.value.find((p) => p.id === id)
        if (!current) return
        const item = await setWishlistCaught(api(), id, !current.caught)
        list.value = list.value.map((p) => (p.id === id ? item : p))
      }),
    remove: (id) =>
      run(async () => {
        await removeFromWishlist(api(), id)
        list.value = list.value.filter((p) => p.id !== id)
      }),
  }
}
