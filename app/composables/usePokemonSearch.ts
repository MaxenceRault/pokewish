import type { ComputedRef, Ref } from 'vue'
import type { AsyncDataRequestStatus } from '#app'
import type { Pokemon } from '~/types/pokemon'

export interface UsePokemonSearch {
  query: Ref<string>
  results: ComputedRef<Pokemon[]>
  /** Tout le Pokédex chargé (vide tant qu'il n'est pas arrivé) */
  dex: ComputedRef<Pokemon[]>
  status: Ref<AsyncDataRequestStatus>
}

/** Noms français (depuis le cache si possible), sinon noms anglais en secours. */
async function loadDex(): Promise<Pokemon[]> {
  const cached = loadDexCache()
  if (cached.length) return cached

  try {
    const dex = await fetchPokemonListFr()
    saveDexCache(dex)
    return dex
  } catch (error) {
    console.warn('Noms français indisponibles, noms anglais en secours', error)
    return fetchPokemonList()
  }
}

export function usePokemonSearch(): UsePokemonSearch {
  const query = ref('')

  const { data, status } = useAsyncData('pokedex', loadDex, { server: false })

  const dex = computed(() => data.value ?? [])
  const results = computed(() => searchPokemon(dex.value, query.value))

  return { query, results, dex, status }
}
