// Exécute db/init.sql sur la base Supabase (connexion PostgreSQL directe).
// Usage : npm run db:migrate   (lit DATABASE_URL dans back/.env)
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    'DATABASE_URL manquant dans back/.env\n' +
      'Supabase > bouton « Connect » > Session pooler > URI',
  )
  process.exit(1)
}

const sql = postgres(url, { ssl: 'require', max: 1, onnotice: () => {} })

try {
  const file = new URL('../db/init.sql', import.meta.url)
  await sql.unsafe(await readFile(file, 'utf8'))

  const [row] = await sql<{ count: number }[]>`
    select count(*)::int as count from wishlist
  `
  console.info(`✓ db/init.sql exécuté : table wishlist (${row?.count} lignes)`)
} catch (error) {
  console.error('✗ Migration échouée :', (error as Error).message)
  process.exitCode = 1
} finally {
  await sql.end()
}
