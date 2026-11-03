import type { Context } from 'hono'
import de from './locales/de.json' with { type: 'json' }
import en from './locales/en.json' with { type: 'json' }
import es from './locales/es.json' with { type: 'json' }
import fr from './locales/fr.json' with { type: 'json' }

// Langues de l'API, les mêmes que le front. Anglais par défaut.
export const LANGUAGES = ['en', 'fr', 'es', 'de'] as const
export type Lang = (typeof LANGUAGES)[number]
export const DEFAULT_LANG: Lang = 'en'

// Un fichier de messages par langue : src/locales/{en,fr,es,de}.json.
// Le typage impose à chaque langue toutes les clés de l'anglais.
const MESSAGES: Record<Lang, typeof en> = { en, fr, es, de }

export type MessageKey = keyof typeof en

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
