// Le client HTTP du front vers l'API Hono, avec un fetch simulé :
// ces tests passent sans que l'API tourne.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addToWishlist,
  getLikes,
  getWishlist,
  likePokemon,
  removeFromWishlist,
  unlikePokemon,
  setWishlistCaught,
  WishlistApiError,
} from '../app/utils/wishlistApi'

const BASE = 'http://api.test'
const API = { base: BASE, lang: 'fr' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const pikachu = { id: 25, name: 'Pikachu', caught: false }

describe('getWishlist', () => {
  it('GET /wishlist -> la liste', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([pikachu]))

    await expect(getWishlist(API)).resolves.toEqual([pikachu])
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE}/wishlist`)
  })

  it("envoie la langue de l'interface dans Accept-Language", async () => {
    fetchMock.mockImplementation(async () => jsonResponse([]))

    await getWishlist({ base: BASE, lang: 'de' })
    await getWishlist({ base: BASE })

    const headers = fetchMock.mock.calls.map(
      ([, init]) =>
        (init?.headers as Record<string, string>)['Accept-Language'],
    )
    expect(headers).toEqual(['de', undefined])
  })
})

describe('addToWishlist', () => {
  it('POST /wishlist avec { id, name } -> le Pokémon créé (201)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(pikachu, 201))

    await expect(
      addToWishlist(API, { id: 25, name: 'Pikachu' }),
    ).resolves.toEqual(pikachu)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${BASE}/wishlist`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ id: 25, name: 'Pikachu' })
  })

  it('409 : lève une WishlistApiError avec le code et le message de l’API', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: 'WISHLIST_FULL', message: 'La wishlist est pleine.' },
        409,
      ),
    )

    const error = await addToWishlist(API, { id: 25, name: 'Pikachu' }).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(WishlistApiError)
    expect(error).toMatchObject({
      status: 409,
      code: 'WISHLIST_FULL',
      apiMessage: 'La wishlist est pleine.',
    })
  })
})

describe('setWishlistCaught', () => {
  it('PATCH /wishlist/:id avec { caught }', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...pikachu, caught: true }))

    await expect(setWishlistCaught(API, 25, true)).resolves.toMatchObject({
      caught: true,
    })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${BASE}/wishlist/25`)
    expect(init?.method).toBe('PATCH')
  })
})

describe('removeFromWishlist', () => {
  it('DELETE /wishlist/:id -> 204 sans corps', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(removeFromWishlist(API, 25)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('DELETE')
  })

  it('404 : lève une WishlistApiError NOT_FOUND', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'NOT_FOUND', message: 'Absent.' }, 404),
    )

    await expect(removeFromWishlist(API, 25)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
  })
})

describe('erreurs génériques', () => {
  it('API éteinte : status 0 et message explicite', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(getWishlist(API)).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK',
      apiMessage: null,
    })
  })

  it('erreur sans corps JSON : message par défaut avec le code HTTP', async () => {
    fetchMock.mockResolvedValueOnce(new Response('oops', { status: 500 }))

    await expect(getWishlist(API)).rejects.toMatchObject({
      status: 500,
      code: null,
      apiMessage: null,
    })
  })
})

describe('likes', () => {
  it('GET / POST / DELETE /likes/:id renvoient le total', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 25, likes: 3 }))
      .mockResolvedValueOnce(jsonResponse({ id: 25, likes: 4 }))
      .mockResolvedValueOnce(jsonResponse({ id: 25, likes: 3 }))

    expect(await getLikes(API, 25)).toEqual({ id: 25, likes: 3 })
    expect(await likePokemon(API, 25)).toEqual({ id: 25, likes: 4 })
    expect(await unlikePokemon(API, 25)).toEqual({ id: 25, likes: 3 })

    expect(
      fetchMock.mock.calls.map(([url, init]) => [url, init?.method ?? 'GET']),
    ).toEqual([
      [`${BASE}/likes/25`, 'GET'],
      [`${BASE}/likes/25`, 'POST'],
      [`${BASE}/likes/25`, 'DELETE'],
    ])
  })
})
