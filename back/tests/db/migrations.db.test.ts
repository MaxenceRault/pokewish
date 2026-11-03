// Le runner de migrations contre une vraie base, dans un schéma jetable.
// Ce fichier gère lui-même son schéma : il doit partir d'une base VIDE.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { connect } from '../../src/db.js'
import { listMigrations, runMigrations } from '../../src/migrations.js'
import { TEST_DATABASE_URL } from './setup.js'

const SCHEMA = 'pokewish_test_migrations'

describe.skipIf(!TEST_DATABASE_URL)('runner de migrations SQL', () => {
  const sql = connect(TEST_DATABASE_URL!, { max: 1 })

  const tables = async () =>
    (
      await sql<{ table_name: string }[]>`
        select table_name from information_schema.tables
        where table_schema = ${SCHEMA} order by table_name
      `
    ).map((r) => r.table_name)

  beforeAll(async () => {
    await sql`drop schema if exists ${sql(SCHEMA)} cascade`
    await sql`create schema ${sql(SCHEMA)}`
    await sql`set search_path to ${sql(SCHEMA)}`
  })

  afterAll(async () => {
    await sql`drop schema if exists ${sql(SCHEMA)} cascade`
    await sql.end()
  })

  it('base vide : applique toutes les migrations, dans l’ordre', async () => {
    const files = await listMigrations()
    expect(files).toEqual(['000_init.sql', '001_likes.sql'])

    const result = await runMigrations(sql)

    expect(result).toEqual({ applied: ['000_init', '001_likes'], skipped: [] })
    expect(await tables()).toEqual(['likes', 'schema_migrations', 'wishlist'])
  })

  it('relancé : ne réapplique rien (chaque migration une seule fois)', async () => {
    const result = await runMigrations(sql)

    expect(result).toEqual({ applied: [], skipped: ['000_init', '001_likes'] })
    const versions = await sql`select version from schema_migrations`
    expect(versions).toHaveLength(2)
  })

  it('préserve les données : une base « d’avant les likes » garde sa wishlist', async () => {
    // État d'une base créée avant 001 : wishlist remplie, likes absente
    await sql`drop table likes`
    await sql`delete from schema_migrations where version = '001_likes'`
    await sql`truncate wishlist`
    await sql`
      insert into wishlist (pokemon_id, name, caught)
      values (25, 'Pikachu', true), (133, 'Évoli', false)
    `

    const result = await runMigrations(sql)

    expect(result.applied).toEqual(['001_likes'])
    expect(
      await sql`select pokemon_id, name, caught from wishlist order by pokemon_id`,
    ).toEqual([
      { pokemon_id: 25, name: 'Pikachu', caught: true },
      { pokemon_id: 133, name: 'Évoli', caught: false },
    ])
    expect(await sql`select * from likes`).toEqual([])
  })

  it('une migration en échec ne laisse rien à moitié', async () => {
    const dir = new URL('./fixtures/broken-migrations/', import.meta.url)

    await expect(runMigrations(sql, dir)).rejects.toThrow()
    // ni la table créée avant l'erreur, ni l'inscription dans le registre
    expect(await tables()).not.toContain('half_done')
    const [row] = await sql`
      select count(*)::int as n from schema_migrations where version = '900_broken'
    `
    expect(row?.n).toBe(0)
  })
})
