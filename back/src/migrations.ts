import { readdir, readFile } from 'node:fs/promises'
import type { Sql } from 'postgres'

/** Dossier des migrations : db/migrations/NNN_nom.sql, appliquées dans l'ordre. */
export const MIGRATIONS_DIR = new URL('../db/migrations/', import.meta.url)

// Numéro arbitraire mais fixe : verrou partagé par tous les runners
const LOCK_ID = 7_250_001

export interface MigrationResult {
  /** Migrations exécutées par cet appel, dans l'ordre */
  applied: string[]
  /** Migrations déjà présentes dans schema_migrations, ignorées */
  skipped: string[]
}

/** Fichiers .sql du dossier, triés par nom (000_…, 001_…). */
export async function listMigrations(
  dir: URL = MIGRATIONS_DIR,
): Promise<string[]> {
  return (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
}

/**
 * Applique les migrations qui ne l'ont pas encore été.
 * - schema_migrations garde la liste de celles déjà appliquées : une
 *   migration ne s'exécute qu'une fois, même si on relance le runner ;
 * - chaque migration tourne dans une transaction, avec son inscription
 *   dans schema_migrations : si elle échoue, rien n'est appliqué à moitié ;
 * - un verrou (advisory lock) empêche deux runners de migrer en même temps.
 */
export async function runMigrations(
  sql: Sql,
  dir: URL = MIGRATIONS_DIR,
): Promise<MigrationResult> {
  await sql`
    create table if not exists schema_migrations (
      version     text        primary key,
      applied_at  timestamptz not null default now()
    )
  `
  const result: MigrationResult = { applied: [], skipped: [] }

  for (const file of await listMigrations(dir)) {
    const version = file.replace(/\.sql$/, '')
    const done = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${LOCK_ID})`
      const [already] = await tx`
        select 1 from schema_migrations where version = ${version}
      `
      if (already) return false
      await tx.unsafe(await readFile(new URL(file, dir), 'utf8'))
      await tx`insert into schema_migrations (version) values (${version})`
      return true
    })
    ;(done ? result.applied : result.skipped).push(version)
  }
  return result
}
