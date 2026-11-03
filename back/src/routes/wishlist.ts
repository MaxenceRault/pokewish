import { Hono } from 'hono'
import { validator } from 'hono/validator'
import type { ApiError } from '../types.js'
import type { WishlistStore } from '../wishlist.js'

const ADD_ERRORS = {
  DUPLICATE: 'Ce Pokémon est déjà dans la wishlist.',
  WISHLIST_FULL: 'La wishlist est pleine (6 Pokémon maximum).',
} as const

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** `:id` doit être un entier positif (numéro de Pokédex). */
const idParam = validator('param', (value: Record<string, string>, c) => {
  const id = Number(value.id)
  if (!Number.isInteger(id) || id <= 0) {
    return c.json<ApiError>(
      { error: 'INVALID_ID', message: "L'id doit être un entier positif." },
      400,
    )
  }
  return { id }
})

/** Corps de POST : { id: entier > 0, name: texte non vide } */
const pokemonBody = validator('json', (value: unknown, c) => {
  if (
    !isObject(value) ||
    !Number.isInteger(value.id) ||
    (value.id as number) <= 0 ||
    typeof value.name !== 'string' ||
    !value.name.trim()
  ) {
    return c.json<ApiError>(
      {
        error: 'INVALID_BODY',
        message: 'Attendu : { "id": entier positif, "name": texte }.',
      },
      400,
    )
  }
  return { id: value.id as number, name: value.name.trim() }
})

/** Corps de PATCH : { caught: booléen } */
const caughtBody = validator('json', (value: unknown, c) => {
  if (!isObject(value) || typeof value.caught !== 'boolean') {
    return c.json<ApiError>(
      { error: 'INVALID_BODY', message: 'Attendu : { "caught": booléen }.' },
      400,
    )
  }
  return { caught: value.caught }
})

const notFound = (id: number): ApiError => ({
  error: 'NOT_FOUND',
  message: `Le Pokémon n°${id} n'est pas dans la wishlist.`,
})

export function wishlistRoutes(store: WishlistStore) {
  return (
    new Hono()
      // Toute la wishlist
      .get('/', (c) => c.json(store.all(), 200))

      // Ajoute un Pokémon : 201, ou 409 si doublon / liste pleine
      .post('/', pokemonBody, (c) => {
        const result = store.add(c.req.valid('json'))
        if ('error' in result) {
          return c.json<ApiError>(
            { error: result.error, message: ADD_ERRORS[result.error] },
            409,
          )
        }
        return c.json(result.item, 201)
      })

      // Marque capturé / à capturer
      .patch('/:id', idParam, caughtBody, (c) => {
        const { id } = c.req.valid('param')
        const item = store.setCaught(id, c.req.valid('json').caught)
        if (!item) return c.json<ApiError>(notFound(id), 404)
        return c.json(item, 200)
      })

      // Retire un Pokémon : 204, ou 404 s'il n'y était pas
      .delete('/:id', idParam, (c) => {
        const { id } = c.req.valid('param')
        if (!store.remove(id)) return c.json<ApiError>(notFound(id), 404)
        return c.body(null, 204)
      })
  )
}
