// @vitest-environment nuxt
// useWishlist dans une vraie app Nuxt ; seul l'appel réseau (fetch) est simulé.
import { clearNuxtState } from '#imports'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, withSetup } from './helpers'

const API = 'http://localhost:3001' // apiBase par défaut (nuxt.config)
const pikachu = { id: 25, name: 'Pikachu', caught: false }

const fetchMock = vi.fn<typeof fetch>()

/** Le composable monté, une fois le chargement initial terminé. */
async function mounted() {
  const wishlist = await withSetup(() => useWishlist())
  await vi.waitFor(() => expect(wishlist.status.value).not.toBe('pending'))
  return wishlist
}

beforeEach(() => {
  clearNuxtState() // useState est partagé : chaque test repart de zéro
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('useWishlist', () => {
  it('charge la liste depuis l’API au montage, dans la langue de l’app', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([pikachu]))

    const { list, status, error } = await mounted()

    expect(status.value).toBe('success')
    expect(list.value).toEqual([pikachu])
    expect(error.value).toBeNull()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${API}/wishlist`)
    expect((init?.headers as Record<string, string>)['Accept-Language']).toBe(
      'en',
    )
  })

  it('add : ajoute le Pokémon renvoyé par l’API', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(pikachu, 201))
    const wishlist = await mounted()

    await wishlist.add({ id: 25, name: 'Pikachu' })

    expect(wishlist.list.value).toEqual([pikachu])
    expect(fetchMock.mock.calls[1]![1]?.method).toBe('POST')
  })

  it('toggle : remplace le Pokémon par la version de l’API', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([pikachu]))
      .mockResolvedValueOnce(jsonResponse({ ...pikachu, caught: true }))
    const wishlist = await mounted()

    await wishlist.toggle(25)

    expect(wishlist.list.value).toEqual([{ ...pikachu, caught: true }])
    const [url, init] = fetchMock.mock.calls[1]!
    expect(url).toBe(`${API}/wishlist/25`)
    expect(JSON.parse(String(init?.body))).toEqual({ caught: true })
  })

  it('toggle d’un Pokémon absent : aucun appel', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    const wishlist = await mounted()

    await wishlist.toggle(999)

    expect(fetchMock).toHaveBeenCalledTimes(1) // seulement le chargement
  })

  it('remove : retire le Pokémon après le 204', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([pikachu]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const wishlist = await mounted()

    await wishlist.remove(25)

    expect(wishlist.list.value).toEqual([])
  })

  describe('messages d’erreur', () => {
    it('message de l’API s’il y en a un (déjà traduit par elle)', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(
          jsonResponse(
            { error: 'WISHLIST_FULL', message: 'The wishlist is full.' },
            409,
          ),
        )
      const wishlist = await mounted()

      await wishlist.add({ id: 25, name: 'Pikachu' })

      expect(wishlist.error.value).toBe('The wishlist is full.')
      expect(wishlist.list.value).toEqual([]) // rien d'ajouté
    })

    it('réseau coupé : message traduit côté front', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

      const { status, error } = await mounted()

      expect(status.value).toBe('error')
      expect(error.value).toBe(
        'The PokéWish API is unreachable. Run `npm run dev` in back/.',
      )
    })

    it('erreur HTTP sans message : code HTTP dans le texte', async () => {
      fetchMock.mockResolvedValueOnce(new Response('oops', { status: 502 }))

      const { error } = await mounted()

      expect(error.value).toBe('The API responded 502.')
    })

    it('l’erreur disparaît au prochain appel réussi (Réessayer)', async () => {
      fetchMock
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(jsonResponse([pikachu]))
      const wishlist = await mounted()
      expect(wishlist.status.value).toBe('error')

      await wishlist.reload()

      expect(wishlist.status.value).toBe('success')
      expect(wishlist.error.value).toBeNull()
      expect(wishlist.list.value).toEqual([pikachu])
    })
  })
})
