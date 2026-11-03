import { Hono } from 'hono'
import type { LikesStore } from '../likes.js'
import { idParam } from './wishlist.js'

export interface LikesResponse {
  id: number
  likes: number
}

export function likesRoutes(store: LikesStore) {
  return (
    new Hono()
      // Nombre de likes d'un Pokémon (0 s'il n'a jamais été liké)
      .get('/:id', idParam, async (c) => {
        const { id } = c.req.valid('param')
        return c.json<LikesResponse>({ id, likes: await store.get(id) }, 200)
      })
      // +1 like
      .post('/:id', idParam, async (c) => {
        const { id } = c.req.valid('param')
        return c.json<LikesResponse>({ id, likes: await store.like(id) }, 200)
      })
      // −1 like (jamais sous 0)
      .delete('/:id', idParam, async (c) => {
        const { id } = c.req.valid('param')
        return c.json<LikesResponse>({ id, likes: await store.unlike(id) }, 200)
      })
  )
}
