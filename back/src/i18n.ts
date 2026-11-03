import type { Context } from 'hono'

// Langues de l'API, les mêmes que le front. Anglais par défaut.
export const LANGUAGES = ['en', 'fr', 'es', 'de'] as const
export type Lang = (typeof LANGUAGES)[number]
export const DEFAULT_LANG: Lang = 'en'

const MESSAGES = {
  en: {
    INVALID_ID: 'The id must be a positive integer.',
    INVALID_POKEMON_BODY: 'Expected: { "id": positive integer, "name": text }.',
    INVALID_CAUGHT_BODY: 'Expected: { "caught": boolean }.',
    DUPLICATE: 'This Pokémon is already in the wishlist.',
    WISHLIST_FULL: 'The wishlist is full (6 Pokémon maximum).',
    NOT_FOUND: 'Pokémon #{id} is not in the wishlist.',
    INTERNAL: 'Internal API error.',
  },
  fr: {
    INVALID_ID: "L'id doit être un entier positif.",
    INVALID_POKEMON_BODY: 'Attendu : { "id": entier positif, "name": texte }.',
    INVALID_CAUGHT_BODY: 'Attendu : { "caught": booléen }.',
    DUPLICATE: 'Ce Pokémon est déjà dans la wishlist.',
    WISHLIST_FULL: 'La wishlist est pleine (6 Pokémon maximum).',
    NOT_FOUND: "Le Pokémon n°{id} n'est pas dans la wishlist.",
    INTERNAL: "Erreur interne de l'API.",
  },
  es: {
    INVALID_ID: 'El id debe ser un número entero positivo.',
    INVALID_POKEMON_BODY:
      'Se esperaba: { "id": entero positivo, "name": texto }.',
    INVALID_CAUGHT_BODY: 'Se esperaba: { "caught": booleano }.',
    DUPLICATE: 'Este Pokémon ya está en la lista de deseos.',
    WISHLIST_FULL: 'La lista de deseos está llena (6 Pokémon como máximo).',
    NOT_FOUND: 'El Pokémon n.º {id} no está en la lista de deseos.',
    INTERNAL: 'Error interno de la API.',
  },
  de: {
    INVALID_ID: 'Die ID muss eine positive ganze Zahl sein.',
    INVALID_POKEMON_BODY:
      'Erwartet: { "id": positive ganze Zahl, "name": Text }.',
    INVALID_CAUGHT_BODY: 'Erwartet: { "caught": Boolean }.',
    DUPLICATE: 'Dieses Pokémon ist bereits auf der Wunschliste.',
    WISHLIST_FULL: 'Die Wunschliste ist voll (maximal 6 Pokémon).',
    NOT_FOUND: 'Pokémon Nr. {id} ist nicht auf der Wunschliste.',
    INTERNAL: 'Interner API-Fehler.',
  },
} satisfies Record<Lang, Record<string, string>>

export type MessageKey = keyof (typeof MESSAGES)['en']

const isLang = (code: string): code is Lang =>
  (LANGUAGES as readonly string[]).includes(code)

/**
 * Choisit la langue d'après l'en-tête Accept-Language, en respectant les
 * préférences (q) : « de-DE,de;q=0.9,en;q=0.8 » -> 'de'. Anglais sinon.
 */
export function pickLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const weight = q ? Number(q.slice(2)) : 1
      return {
        lang: tag.trim().toLowerCase().split('-')[0] ?? '',
        weight: Number.isNaN(weight) ? 0 : weight,
        index,
      }
    })
    .filter((r) => r.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
  return (
    (ranked.find((r) => isLang(r.lang))?.lang as Lang | undefined) ??
    DEFAULT_LANG
  )
}

/** Message traduit, avec ses paramètres : translate('fr', 'NOT_FOUND', { id: 25 }). */
export function translate(
  lang: Lang,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** Message dans la langue de la requête Hono en cours. */
export function t(
  c: Context,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  return translate(pickLanguage(c.req.header('Accept-Language')), key, params)
}
