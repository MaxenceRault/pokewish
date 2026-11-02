import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import type { WishlistItem } from '../src/types.js'
import { createWishlistStore } from '../src/wishlist.js'

/** Une app neuve par test : chaque test part d'une wishlist connue. */
let app: ReturnType<typeof createApp>

function setup(initial: WishlistItem[] = []) {
  app = createApp(createWishlistStore(initial))
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const pikachu: WishlistItem = { id: 25, name: 'Pikachu', caught: false }

/** 6 Pokémon : la wishlist est pleine. */
const fullTeam: WishlistItem[] = [1, 4, 6, 7, 133, 150].map((id) => ({
  id,
  name: `p${id}`,
  caught: false,
}))

beforeEach(() => setup())

describe('GET /wishlist', () => {
  it('200 : liste vide au départ', async () => {
    const res = await app.request('/wishlist')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('200 : renvoie les Pokémon enregistrés', async () => {
    setup([pikachu])
    const res = await app.request('/wishlist')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([pikachu])
  })
})

describe('POST /wishlist', () => {
  it('201 : ajoute le Pokémon et le renvoie', async () => {
    const res = await app.request(
      '/wishlist',
      json({ id: 25, name: 'Pikachu' }),
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(pikachu)

    // Il est bien gardé en mémoire
    const list = await (await app.request('/wishlist')).json()
    expect(list).toEqual([pikachu])
  })

  it('201 : nettoie les espaces autour du nom', async () => {
    const res = await app.request(
      '/wishlist',
      json({ id: 4, name: '  Salamèche ' }),
    )

    expect(await res.json()).toMatchObject({ name: 'Salamèche' })
  })

  it('409 DUPLICATE : Pokémon déjà présent', async () => {
    setup([pikachu])
    const res = await app.request(
      '/wishlist',
      json({ id: 25, name: 'Pikachu' }),
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'DUPLICATE' })
  })

  it('409 WISHLIST_FULL : 7e Pokémon refusé', async () => {
    setup(fullTeam)
    const res = await app.request(
      '/wishlist',
      json({ id: 25, name: 'Pikachu' }),
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'WISHLIST_FULL' })
    expect(await (await app.request('/wishlist')).json()).toHaveLength(6)
  })

  it.each([
    ['id manquant', { name: 'Pikachu' }],
    ['id texte', { id: '25', name: 'Pikachu' }],
    ['id négatif', { id: -1, name: 'Pikachu' }],
    ['id décimal', { id: 2.5, name: 'Pikachu' }],
    ['nom manquant', { id: 25 }],
    ['nom vide', { id: 25, name: '   ' }],
    ['tableau', [25]],
  ])('400 INVALID_BODY : %s', async (_, body) => {
    const res = await app.request('/wishlist', json(body))

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'INVALID_BODY' })
  })

  it('400 : JSON mal formé', async () => {
    const res = await app.request('/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"id": 25,',
    })

    expect(res.status).toBe(400)
  })
})

describe('DELETE /wishlist/:id', () => {
  it('204 : retire le Pokémon', async () => {
    setup([pikachu])
    const res = await app.request('/wishlist/25', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(await (await app.request('/wishlist')).json()).toEqual([])
  })

  it('404 NOT_FOUND : Pokémon absent de la wishlist', async () => {
    const res = await app.request('/wishlist/25', { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'NOT_FOUND' })
  })

  it('400 INVALID_ID : id non numérique', async () => {
    const res = await app.request('/wishlist/pikachu', { method: 'DELETE' })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'INVALID_ID' })
  })
})

describe('PATCH /wishlist/:id', () => {
  const patch = (caught: unknown): RequestInit => ({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caught }),
  })

  it('200 : marque le Pokémon capturé', async () => {
    setup([pikachu])
    const res = await app.request('/wishlist/25', patch(true))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ...pikachu, caught: true })
  })

  it('404 : Pokémon absent', async () => {
    const res = await app.request('/wishlist/25', patch(true))

    expect(res.status).toBe(404)
  })

  it('400 : caught doit être un booléen', async () => {
    setup([pikachu])
    const res = await app.request('/wishlist/25', patch('oui'))

    expect(res.status).toBe(400)
  })
})

describe('CORS', () => {
  it('autorise le front en local', async () => {
    const res = await app.request('/wishlist', {
      headers: { Origin: 'http://localhost:3000' },
    })

    expect(res.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:3000',
    )
  })

  it("n'autorise pas une origine inconnue", async () => {
    const res = await app.request('/wishlist', {
      headers: { Origin: 'https://site-pirate.example' },
    })

    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})
