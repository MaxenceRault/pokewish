// Applique les migrations db/migrations/*.sql qui ne l'ont pas encore été.
// Usage : npm run db:migrate   (lit DATABASE_URL dans back/.env)
import { connect } from '../src/db.js'
import { runMigrations } from '../src/migrations.js'

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    'DATABASE_URL manquant dans back/.env\n' +
      'Supabase > bouton « Connect » > Session pooler > URI',
  )
  process.exit(1)
}

const sql = connect(url, { max: 1 })

try {
  const { applied, skipped } = await runMigrations(sql)
  for (const version of skipped) console.info(`· ${version} (déjà appliquée)`)
  for (const version of applied) console.info(`✓ ${version} appliquée`)
  console.info(
    applied.length
      ? `${applied.length} migration(s) appliquée(s).`
      : 'Base à jour, rien à appliquer.',
  )
} catch (error) {
  console.error('✗ Migration échouée :', (error as Error).message)
  process.exitCode = 1
} finally {
  await sql.end()
}
