// Le store PostgreSQL seul, contre une vraie base (voir setup.ts).
import { describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL, useTestDatabase } from './setup.js'

describe.skipIf(!TEST_DATABASE_URL)('store PostgreSQL', () => {
  const { store } = useTestDatabase('pokewish_test_store')

  it('ajoute, liste dans l’ordre d’ajout, marque capturé, retire', async () => {
    expect(await store.add({ id: 25, name: 'Pikachu' })).toEqual({
      item: { id: 25, name: 'Pikachu', caught: false },
    })
    await store.add({ id: 4, name: 'Salamèche' })

    expect((await store.all()).map((p) => p.name)).toEqual([
      'Pikachu',
      'Salamèche',
    ])
    expect(await store.setCaught(4, true)).toEqual({
      id: 4,
      name: 'Salamèche',
      caught: true,
    })
    expect(await store.remove(25)).toBe(true)
    expect(await store.all()).toEqual([
      { id: 4, name: 'Salamèche', caught: true },
    ])
  })

  it('refuse un doublon et un 7e Pokémon', async () => {
    for (const id of [1, 2, 3, 4, 5, 6]) {
      await store.add({ id, name: `p${id}` })
    }
    expect(await store.add({ id: 1, name: 'p1' })).toEqual({
      error: 'DUPLICATE',
    })
    expect(await store.add({ id: 25, name: 'Pikachu' })).toEqual({
      error: 'WISHLIST_FULL',
    })
    expect(await store.all()).toHaveLength(6)
  })

  it('signale un Pokémon absent', async () => {
    expect(await store.remove(999)).toBe(false)
    expect(await store.setCaught(999, true)).toBeNull()
  })

  it('requêtes paramétrées : un nom piégé est stocké tel quel', async () => {
    const name = "Robert'); drop table wishlist; --"
    await store.add({ id: 7, name })

    expect(await store.all()).toEqual([{ id: 7, name, caught: false }])
  })
})
