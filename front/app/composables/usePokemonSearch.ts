import type { ComputedRef, Ref } from 'vue'
import type { AsyncDataRequestStatus } from '#app'
import type { Pokemon } from '~/types/pokemon'

export interface UsePokemonSearch {
  query: Ref<string>
  results: ComputedRef<Pokemon[]>
  /** Tout le Pokédex chargé, dans la langue choisie (vide tant qu'il n'est pas arrivé) */
  dex: ComputedRef<Pokemon[]>
  /** Nom d'un Pokémon dans la langue choisie, si le Pokédex le connaît */
  nameOf: (id: number) => string | undefined
  status: Ref<AsyncDataRequestStatus>
}

/** Noms dans `lang` (depuis le cache si possible), sinon identifiants anglais en secours. */
async function loadDex(lang: string): Promise<Pokemon[]> {
  const cached = loadDexCache(lang)
  if (cached.length) return cached

  try {
    const dex = await fetchPokemonNames(lang)
    saveDexCache(lang, dex)
    return dex
  } catch (error) {
    console.warn(
      `Noms « ${lang} » indisponibles, noms anglais en secours`,
      error,
    )
    return fetchPokemonList()
  }
}

export function usePokemonSearch(): UsePokemonSearch {
  const { locale } = useI18n()
  const query = ref('')

  // Une clé par langue : changer de langue recharge les noms
  const { data, status } = useAsyncData(
    () => `pokedex-${locale.value}`,
    () => loadDex(locale.value),
    { server: false },
  )

  const dex = computed(() => data.value ?? [])
  const byId = computed(() => new Map(dex.value.map((p) => [p.id, p.name])))
  const results = computed(() => searchPokemon(dex.value, query.value))

  return {
    query,
    results,
    dex,
    nameOf: (id) => byId.value.get(id),
    status,
  }
}
