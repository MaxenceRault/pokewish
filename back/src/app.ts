import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { wishlistRoutes } from './routes/wishlist.js'
import type { ApiError } from './types.js'
import { createWishlistStore, type WishlistStore } from './wishlist.js'

export interface HealthResponse {
  status: 'ok'
  uptime: number
}

/** Origines autorisées : CORS_ORIGINS (séparées par des virgules), sinon localhost. */
function isAllowedOrigin(origin: string): boolean {
  const allowed = process.env.CORS_ORIGINS
  if (allowed) return allowed.split(',').some((o) => o.trim() === origin)
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

// L'app est séparée du serveur (index.ts) pour pouvoir la tester
// avec app.request(), sans ouvrir de port. Chaque test peut lui passer
// son propre store pour partir d'une wishlist connue.
export function createApp(store: WishlistStore = createWishlistStore()) {
  return (
    new Hono()
      .use(
        '*',
        cors({ origin: (origin) => (isAllowedOrigin(origin) ? origin : null) }),
      )
      .get('/health', (c) =>
        c.json<HealthResponse>({ status: 'ok', uptime: process.uptime() }),
      )
      .route('/wishlist', wishlistRoutes(store))
      // Erreur inattendue (ex. base injoignable) : 500 en JSON, détail dans les logs
      .onError((error, c) => {
        // Erreurs HTTP voulues (ex. 400 JSON mal formé) : renvoyées telles quelles
        if (error instanceof HTTPException) return error.getResponse()
        console.error(error)
        return c.json<ApiError>(
          { error: 'INTERNAL', message: "Erreur interne de l'API." },
          500,
        )
      })
  )
}

export const app = createApp()
