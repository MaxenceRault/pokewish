import postgres, { type Sql } from 'postgres'
import type { WishlistItem } from './types.js'
import { MAX_WISHLIST, type WishlistStore } from './wishlist.js'

/**
 * Connexion PostgreSQL. Supabase propose deux poolers :
 * - « Session » (port 5432) : serveur Node, tests ;
 * - « Transaction » (port 6543) : recommandé pour Lambda (beaucoup de
 *   connexions courtes). Il ne gère pas les requêtes préparées : on les coupe.
 */
export function connect(url: string, options: { max?: number } = {}): Sql {
  // Simple test sur le texte : ne plante pas sur une URL vide (tests sans
  // base, où la connexion est créée mais jamais ouverte)
  const transactionPooler = /:6543(\/|$)/.test(url)
  return postgres(url, {
    // prefer : SSL si le serveur le propose (Supabase), sinon en clair (CI locale)
    ssl: 'prefer',
    prepare: !transactionPooler,
    onnotice: () => {},
    ...options,
  })
}

interface Row {
  pokemon_id: number
  name: string
  caught: boolean
}

const toItem = (row: Row): WishlistItem => ({
  id: row.pokemon_id,
  name: row.name,
  caught: row.caught,
})

/**
 * La wishlist dans la table `wishlist` (db/init.sql).
 * Toutes les requêtes sont paramétrées : les valeurs passées dans ${…}
 * sont envoyées séparément du SQL, jamais collées dedans (pas d'injection).
 */
export function createPostgresStore(sql: Sql): WishlistStore {
  return {
    async all() {
      const rows = await sql<Row[]>`
        select pokemon_id, name, caught
        from wishlist
        order by created_at, pokemon_id
      `
      return rows.map(toItem)
    },

    async add(pokemon) {
      return sql.begin(async (tx) => {
        // Verrou le temps de la transaction : deux ajouts simultanés
        // ne peuvent pas passer tous les deux la limite des 6.
        await tx`lock table wishlist in share row exclusive mode`

        const [state] = await tx<{ total: number; present: boolean | null }[]>`
          select count(*)::int as total,
                 bool_or(pokemon_id = ${pokemon.id}) as present
          from wishlist
        `
        if (state?.present) return { error: 'DUPLICATE' as const }
        if ((state?.total ?? 0) >= MAX_WISHLIST) {
          return { error: 'WISHLIST_FULL' as const }
        }

        const [row] = await tx<Row[]>`
          insert into wishlist (pokemon_id, name)
          values (${pokemon.id}, ${pokemon.name})
          returning pokemon_id, name, caught
        `
        return { item: toItem(row!) }
      })
    },

    async remove(id) {
      const rows = await sql`
        delete from wishlist where pokemon_id = ${id} returning pokemon_id
      `
      return rows.count > 0
    },

    async setCaught(id, caught) {
      const [row] = await sql<Row[]>`
        update wishlist set caught = ${caught}
        where pokemon_id = ${id}
        returning pokemon_id, name, caught
      `
      return row ? toItem(row) : null
    },
  }
}
