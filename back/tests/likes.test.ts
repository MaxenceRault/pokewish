// Routes /likes avec le store en mémoire (sans base)
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createLikesStore } from '../src/likes.js'
import { createWishlistStore } from '../src/wishlist.js'

const app = () => createApp(createWishlistStore(), createLikesStore({ 25: 3 }))

describe('routes /likes', () => {
  it('GET : 200 avec le total', async () => {
    const res = await app().request('/likes/25')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 25, likes: 3 })
  })

  it('POST puis DELETE : +1 puis −1', async () => {
    const a = app()
    expect(
      await (await a.request('/likes/25', { method: 'POST' })).json(),
    ).toEqual({ id: 25, likes: 4 })
    expect(
      await (await a.request('/likes/25', { method: 'DELETE' })).json(),
    ).toEqual({ id: 25, likes: 3 })
  })

  it('un Pokémon jamais liké : 0, et jamais sous 0', async () => {
    const a = app()
    expect(await (await a.request('/likes/7')).json()).toEqual({
      id: 7,
      likes: 0,
    })
    expect(
      await (await a.request('/likes/7', { method: 'DELETE' })).json(),
    ).toEqual({ id: 7, likes: 0 })
  })

  it('id invalide : 400 traduit', async () => {
    const res = await app().request('/likes/abc', {
      method: 'POST',
      headers: { 'Accept-Language': 'fr' },
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'INVALID_ID' })
  })
})
