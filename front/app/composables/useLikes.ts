import type { Ref } from 'vue'

export interface UseLikes {
  /** Nombre de likes (null tant qu'il n'est pas chargé ou si l'API est injoignable) */
  count: Ref<number | null>
  /** Ce navigateur a-t-il liké ce Pokémon ? */
  liked: Ref<boolean>
  pending: Ref<boolean>
  toggle: () => Promise<void>
}

/** Likes d'un Pokémon : compteur dans l'API, « j'ai liké » dans le navigateur. */
export function useLikes(id: Ref<number | undefined>): UseLikes {
  const { locale } = useI18n()
  const base = useRuntimeConfig().public.apiBase
  const api = (): ApiTarget => ({ base, lang: locale.value })

  const count = ref<number | null>(null)
  const liked = ref(false)
  const pending = ref(false)

  async function load(): Promise<void> {
    if (!id.value) return
    liked.value = loadLiked().includes(id.value)
    try {
      count.value = (await getLikes(api(), id.value)).likes
    } catch {
      count.value = null
    }
  }

  // Dans le navigateur seulement : le compteur change sans cesse, il ne doit
  // pas être figé dans le HTML (SSR ou site statique)
  onMounted(load)
  watch(id, load)

  async function toggle(): Promise<void> {
    if (!id.value || pending.value) return
    pending.value = true
    try {
      const res = liked.value
        ? await unlikePokemon(api(), id.value)
        : await likePokemon(api(), id.value)
      count.value = res.likes
      liked.value = !liked.value
      const others = loadLiked().filter((x) => x !== id.value)
      saveLiked(liked.value ? [...others, id.value] : others)
    } finally {
      pending.value = false
    }
  }

  return { count, liked, pending, toggle }
}
