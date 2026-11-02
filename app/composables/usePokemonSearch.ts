import type { ComputedRef, Ref } from 'vue'
import type { AsyncDataRequestStatus } from '#app'
import type { PokeApiListResponse, Pokemon } from '~/types/pokemon'

export interface UsePokemonSearch {
  query: Ref<string>
  results: ComputedRef<Pokemon[]>
  status: Ref<AsyncDataRequestStatus>
}

export function usePokemonSearch(): UsePokemonSearch {
  const query = ref('')

  const { data: all, status } = useFetch(
    'https://pokeapi.co/api/v2/pokemon?limit=2000',
    {
      key: 'pokemon-all',
      server: false,
      transform: (res: PokeApiListResponse): Pokemon[] =>
        res.results.map((p) => ({ id: idFromUrl(p.url), name: p.name })),
    },
  )

  const results = computed(() => searchPokemon(all.value ?? [], query.value))

  return { query, results, status }
}
