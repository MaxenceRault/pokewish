import type { Ref } from 'vue'
import type { Pokemon, WishlistItem } from '~/types/pokemon'

export interface UseWishlist {
  list: Ref<WishlistItem[]>
  add: (pokemon: Pokemon) => void
  toggle: (id: number) => void
  remove: (id: number) => void
  /** Reprend les noms du Pokédex (ex. anciens noms anglais -> français) */
  syncNames: (dex: Pokemon[]) => void
}

export function useWishlist(): UseWishlist {
  const list = useState<WishlistItem[]>('wishlist', () => [])

  // localStorage n'existe que dans le navigateur : on charge après le montage
  onMounted(() => {
    list.value = parseWishlist(localStorage.getItem(STORAGE_KEY))
    watch(
      list,
      (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
      { deep: true },
    )
  })

  return {
    list,
    add(pokemon) {
      list.value = addPokemon(list.value, pokemon)
    },
    toggle(id) {
      list.value = toggleCaught(list.value, id)
    },
    remove(id) {
      list.value = removePokemon(list.value, id)
    },
    syncNames(dex) {
      list.value = renameWishlist(list.value, dex)
    },
  }
}
