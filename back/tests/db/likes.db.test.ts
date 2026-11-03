// Les likes contre une vraie base (table de la migration 001), via les routes.
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPostgresLikesStore, createPostgresStore } from '../../src/db.js'
import { TEST_DATABASE_URL, useTestDatabase } from './setup.js'

describe.skipIf(!TEST_DATABASE_URL)('routes /likes sur PostgreSQL', () => {
  const { sql, store, likes } = useTestDatabase('pokewish_test_likes')
  const app = createApp(store, likes)
  const call = (method: string, id: number | string) =>
    app.request(`/likes/${id}`, { method })

  it('0 like au départ, +1 à chaque POST, −1 au DELETE', async () => {
    expect(await (await call('GET', 25)).json()).toEqual({ id: 25, likes: 0 })
    await call('POST', 25)
    const res = await call('POST', 25)
    expect(await res.json()).toEqual({ id: 25, likes: 2 })

    expect(await (await call('DELETE', 25)).json()).toEqual({
      id: 25,
      likes: 1,
    })
    expect(await sql`select pokemon_id, count from likes`).toEqual([
      { pokemon_id: 25, count: 1 },
    ])
  })

  it('jamais sous 0', async () => {
    expect(await (await call('DELETE', 7)).json()).toEqual({ id: 7, likes: 0 })
  })

  it('likes simultanés : aucun n’est perdu', async () => {
    await Promise.all(Array.from({ length: 10 }, () => likes.like(150)))
    expect(await likes.get(150)).toBe(10)
  })

  it('persistance : une app neuve relit les likes', async () => {
    await call('POST', 133)
    const restarted = createApp(
      createPostgresStore(sql),
      createPostgresLikesStore(sql),
    )
    expect(await (await restarted.request('/likes/133')).json()).toEqual({
      id: 133,
      likes: 1,
    })
  })

  it('id invalide : 400', async () => {
    expect((await call('POST', 'pikachu')).status).toBe(400)
  })
})
