import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { connect, createPostgresLikesStore, createPostgresStore } from './db.js'
import { createLikesStore } from './likes.js'
import { createWishlistStore } from './wishlist.js'

const port = Number(process.env.PORT ?? 3001)
const databaseUrl = process.env.DATABASE_URL

// PostgreSQL si DATABASE_URL est défini (back/.env), sinon tableau en mémoire
// (c'est le cas dans la CI : smoke test et e2e n'ont pas besoin de la base).
const sql = databaseUrl ? connect(databaseUrl) : null
const store = sql ? createPostgresStore(sql) : createWishlistStore()
const likes = sql ? createPostgresLikesStore(sql) : createLikesStore()

serve({ fetch: createApp(store, likes).fetch, port }, (info) => {
  console.info(`API PokéWish sur http://localhost:${info.port}`)
  console.info(
    databaseUrl
      ? 'Wishlist : PostgreSQL (DATABASE_URL)'
      : 'Wishlist : en mémoire (DATABASE_URL absent, perdue au redémarrage)',
  )
})
