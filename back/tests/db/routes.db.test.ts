// Les routes HTTP de l'API, branchées sur une VRAIE base PostgreSQL :
// aucun mock SQL. Après chaque appel, on relit la table en SQL pour vérifier
// ce qui a réellement été écrit (voir setup.ts pour l'isolation).
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createPostgresStore } from '../../src/db.js'
import { TEST_DATABASE_URL, useTestDatabase } from './setup.js'

describe.skipIf(!TEST_DATABASE_URL)('routes /wishlist sur PostgreSQL', () => {
  const { sql, store } = useTestDatabase('pokewish_test_routes')
  const app = createApp(store)

  /** Le contenu réel de la table, lu directement en SQL. */
  const rows = () =>
    sql<{ pokemon_id: number; name: string; caught: boolean }[]>`
      select pokemon_id, name, caught from wishlist order by created_at
    `.then((r) => [...r])

  const post = (body: unknown) =>
    app.request('/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const patch = (id: number, caught: boolean) =>
    app.request(`/wishlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caught }),
    })

  const del = (id: number | string) =>
    app.request(`/wishlist/${id}`, { method: 'DELETE' })

  describe('CRUD', () => {
    it('GET /wishlist : 200 et [] sur une table vide', async () => {
      const res = await app.request('/wishlist')

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual([])
    })

    it('POST /wishlist : 201, et la ligne est en base', async () => {
      const res = await post({ id: 25, name: 'Pikachu' })

      expect(res.status).toBe(201)
      expect(await res.json()).toEqual({
        id: 25,
        name: 'Pikachu',
        caught: false,
      })
      expect(await rows()).toEqual([
        { pokemon_id: 25, name: 'Pikachu', caught: false },
      ])
    })

    it('GET /wishlist : 200, lu depuis la base dans l’ordre d’ajout', async () => {
      await post({ id: 4, name: 'Salamèche' })
      await post({ id: 1, name: 'Bulbizarre' })

      const res = await app.request('/wishlist')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual([
        { id: 4, name: 'Salamèche', caught: false },
        { id: 1, name: 'Bulbizarre', caught: false },
      ])
    })

    it('PATCH /wishlist/:id : 200, et caught est mis à jour en base', async () => {
      await post({ id: 133, name: 'Évoli' })

      const res = await patch(133, true)
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ id: 133, caught: true })
      expect((await rows())[0]?.caught).toBe(true)
    })

    it('DELETE /wishlist/:id : 204, et la ligne disparaît de la base', async () => {
      await post({ id: 7, name: 'Carapuce' })
      await post({ id: 94, name: 'Ectoplasma' })

      const res = await del(7)
      expect(res.status).toBe(204)
      expect((await rows()).map((r) => r.pokemon_id)).toEqual([94])
    })

    it('404 : PATCH et DELETE d’un Pokémon absent, la base est inchangée', async () => {
      await post({ id: 25, name: 'Pikachu' })

      expect((await patch(999, true)).status).toBe(404)
      const res = await del(999)
      expect(res.status).toBe(404)
      expect(await res.json()).toMatchObject({ error: 'NOT_FOUND' })
      expect(await rows()).toHaveLength(1)
    })

    it('400 : corps ou id invalide, rien n’est écrit', async () => {
      expect((await post({ id: 'abc', name: 'X' })).status).toBe(400)
      expect((await del('pikachu')).status).toBe(400)
      expect(await rows()).toEqual([])
    })
  })

  describe('doublons', () => {
    it('409 DUPLICATE : le même Pokémon deux fois, une seule ligne en base', async () => {
      expect((await post({ id: 25, name: 'Pikachu' })).status).toBe(201)

      const res = await post({ id: 25, name: 'Pikachu' })
      expect(res.status).toBe(409)
      expect(await res.json()).toMatchObject({ error: 'DUPLICATE' })
      expect(await rows()).toHaveLength(1)
    })

    it('le doublon se juge sur le numéro, pas sur le nom', async () => {
      await post({ id: 25, name: 'Pikachu' })

      expect((await post({ id: 25, name: 'PIKACHU' })).status).toBe(409)
      expect((await rows())[0]?.name).toBe('Pikachu')
    })
  })

  describe('limite de 6', () => {
    const team = [1, 4, 7, 25, 94, 133]

    it('les 6 premiers passent (201), le 7e est refusé (409 WISHLIST_FULL)', async () => {
      for (const id of team) {
        expect((await post({ id, name: `p${id}` })).status).toBe(201)
      }

      const res = await post({ id: 150, name: 'Mewtwo' })
      expect(res.status).toBe(409)
      expect(await res.json()).toMatchObject({ error: 'WISHLIST_FULL' })
      expect(await rows()).toHaveLength(6)
      expect((await rows()).some((r) => r.pokemon_id === 150)).toBe(false)
    })

    it('après une suppression, un nouvel ajout repasse', async () => {
      for (const id of team) await post({ id, name: `p${id}` })

      expect((await del(1)).status).toBe(204)
      expect((await post({ id: 150, name: 'Mewtwo' })).status).toBe(201)
      expect(await rows()).toHaveLength(6)
    })
  })

  it('persistance : une app neuve (= API redémarrée) relit la base', async () => {
    await post({ id: 133, name: 'Évoli' })
    await patch(133, true)

    const restarted = createApp(createPostgresStore(sql))
    expect(await (await restarted.request('/wishlist')).json()).toEqual([
      { id: 133, name: 'Évoli', caught: true },
    ])
  })
})
