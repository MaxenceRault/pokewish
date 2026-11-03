// Base de test isolée pour les tests « sans mock SQL » de tests/db/.
//
// - Lancés seulement si TEST_DATABASE_URL est défini : PostgreSQL jetable de
//   la CI, ou en local `npm run test:db` (lit TEST_DATABASE_URL dans .env).
// - Chaque fichier de test a SON schéma (Vitest lance les fichiers en
//   parallèle) : créé avant les tests, vidé avant chaque test, supprimé à la
//   fin. La table `wishlist` de l'app (schéma public) n'est jamais touchée.
import { afterAll, beforeAll, beforeEach } from 'vitest'
import {
  connect,
  createPostgresLikesStore,
  createPostgresStore,
} from '../../src/db.js'
import { runMigrations } from '../../src/migrations.js'

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

/** À appeler dans un `describe.skipIf(!TEST_DATABASE_URL)`. */
export function useTestDatabase(schema: `pokewish_test_${string}`) {
  // Une seule connexion : le `set search_path` vaut pour toutes les requêtes
  const sql = connect(TEST_DATABASE_URL!, { max: 1 })

  beforeAll(async () => {
    await sql`drop schema if exists ${sql(schema)} cascade`
    await sql`create schema ${sql(schema)}`
    await sql`set search_path to ${sql(schema)}`
    // Le vrai schéma de l'app : les migrations que db:migrate applique en production
    await runMigrations(sql)
  })

  // 000_init insère 2 Pokémon d'exemple : chaque test repart de tables vides
  beforeEach(async () => {
    await sql`truncate wishlist, likes`
  })

  afterAll(async () => {
    await sql`drop schema if exists ${sql(schema)} cascade`
    await sql.end()
  })

  return {
    sql,
    store: createPostgresStore(sql),
    likes: createPostgresLikesStore(sql),
  }
}
