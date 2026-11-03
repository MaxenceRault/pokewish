// Store PostgreSQL contre une vraie base, dans un schéma jetable `pokewish_test`
// (la table `wishlist` de l'app n'est jamais touchée).
// Lancés seulement si TEST_DATABASE_URL est défini : PostgreSQL de la CI,
// ou en local : TEST_DATABASE_URL=… npm test
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { connect, createPostgresStore } from '../src/db.js'

const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('store PostgreSQL', () => {
  // Une seule connexion : le `set search_path` vaut pour toutes les requêtes
  const sql = connect(url!, { max: 1 })
  const store = createPostgresStore(sql)

  beforeAll(async () => {
    await sql`drop schema if exists pokewish_test cascade`
    await sql`create schema pokewish_test`
    await sql`set search_path to pokewish_test`
    const init = await readFile(
      new URL('../db/init.sql', import.meta.url),
      'utf8',
    )
    await sql.unsafe(init)
  })

  beforeEach(async () => {
    await sql`truncate wishlist`
  })

  afterAll(async () => {
    await sql`drop schema if exists pokewish_test cascade`
    await sql.end()
  })

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

  it('les données survivent à une nouvelle app (= redémarrage de l’API)', async () => {
    const first = createApp(store)
    const res = await first.request('/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 133, name: 'Évoli' }),
    })
    expect(res.status).toBe(201)

    // Une app toute neuve, branchée sur la même base
    const restarted = createApp(createPostgresStore(sql))
    const list = await (await restarted.request('/wishlist')).json()
    expect(list).toEqual([{ id: 133, name: 'Évoli', caught: false }])
  })
})
