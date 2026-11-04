// @vitest-environment nuxt
// useLikes dans une vraie app Nuxt ; seul fetch est simulé.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { jsonResponse, withSetup } from './helpers'

const API = 'http://localhost:3001'
const fetchMock = vi.fn<typeof fetch>()

/** Simule l'API des likes : un compteur par Pokémon, en mémoire. */
function fakeLikesApi(initial: Record<number, number> = {}) {
  const counts = { ...initial }
  fetchMock.mockImplementation(async (input, init) => {
    const id = Number(String(input).split('/').pop())
    const method = init?.method ?? 'GET'
    if (method === 'POST') counts[id] = (counts[id] ?? 0) + 1
    if (method === 'DELETE') counts[id] = Math.max(0, (counts[id] ?? 0) - 1)
    return jsonResponse({ id, likes: counts[id] ?? 0 })
  })
  return counts
}

const calls = (method: string) =>
  fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method)

async function mounted(id = 25) {
  const pokemonId = ref<number | undefined>(id)
  const likes = await withSetup(() => useLikes(pokemonId))
  await vi.waitFor(() => expect(likes.count.value).not.toBeNull())
  return { ...likes, pokemonId }
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('useLikes', () => {
  it('au montage : total de l’API, « liké » depuis le navigateur', async () => {
    fakeLikesApi({ 25: 7 })
    localStorage.setItem('pokewish:liked', '[25]')

    const { count, liked } = await mounted()

    expect(count.value).toBe(7)
    expect(liked.value).toBe(true)
    expect(fetchMock.mock.calls[0]![0]).toBe(`${API}/likes/25`)
  })

  it('toggle : like (POST) puis unlike (DELETE), mémorisé dans le navigateur', async () => {
    fakeLikesApi({ 25: 2 })
    const likes = await mounted()

    await likes.toggle()
    expect(likes.count.value).toBe(3)
    expect(likes.liked.value).toBe(true)
    expect(JSON.parse(localStorage.getItem('pokewish:liked')!)).toEqual([25])

    await likes.toggle()
    expect(likes.count.value).toBe(2)
    expect(likes.liked.value).toBe(false)
    expect(JSON.parse(localStorage.getItem('pokewish:liked')!)).toEqual([])
    expect(calls('POST')).toHaveLength(1)
    expect(calls('DELETE')).toHaveLength(1)
  })

  it('double clic rapide : un seul like envoyé', async () => {
    fakeLikesApi()
    const likes = await mounted()

    await Promise.all([likes.toggle(), likes.toggle()])

    expect(calls('POST')).toHaveLength(1)
    expect(likes.count.value).toBe(1)
  })

  it('garde les likes des autres Pokémon dans le navigateur', async () => {
    fakeLikesApi()
    localStorage.setItem('pokewish:liked', '[1, 4]')
    const likes = await mounted()

    await likes.toggle()

    expect(JSON.parse(localStorage.getItem('pokewish:liked')!)).toEqual([
      1, 4, 25,
    ])
  })

  it('changement de Pokémon : recharge son compteur', async () => {
    fakeLikesApi({ 25: 3, 133: 9 })
    const likes = await mounted(25)

    likes.pokemonId.value = 133

    await vi.waitFor(() => expect(likes.count.value).toBe(9))
  })

  it('API injoignable : compteur inconnu (null), pas d’erreur', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const pokemonId = ref<number | undefined>(25)

    const likes = await withSetup(() => useLikes(pokemonId))

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(likes.count.value).toBeNull()
  })

  it('sans Pokémon (fiche pas encore chargée) : rien n’est appelé', async () => {
    const likes = await withSetup(() => useLikes(ref(undefined)))

    await likes.toggle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(likes.count.value).toBeNull()
  })
})
