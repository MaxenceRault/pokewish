import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { LANGUAGES, pickLanguage, translate } from '../src/i18n.js'
import { createWishlistStore } from '../src/wishlist.js'

describe('pickLanguage (Accept-Language)', () => {
  it.each([
    [undefined, 'en'],
    ['', 'en'],
    ['fr', 'fr'],
    ['de-DE', 'de'],
    ['es-419,es;q=0.9', 'es'],
    ['it,de;q=0.8,fr;q=0.9', 'fr'], // italien non géré : meilleure suivante
    ['ja', 'en'], // aucune langue gérée : anglais
    ['fr;q=0, de', 'de'], // q=0 veut dire « surtout pas »
    ['*', 'en'],
  ])('%s -> %s', (header, expected) => {
    expect(pickLanguage(header)).toBe(expected)
  })
})

describe('translate', () => {
  it('remplace les paramètres', () => {
    expect(translate('fr', 'NOT_FOUND', { id: 25 })).toBe(
      "Le Pokémon n°25 n'est pas dans la wishlist.",
    )
  })

  it('chaque message existe dans les 4 langues, et diffère de l’anglais', () => {
    for (const lang of LANGUAGES.filter((l) => l !== 'en')) {
      expect(translate(lang, 'WISHLIST_FULL')).not.toBe(
        translate('en', 'WISHLIST_FULL'),
      )
    }
  })
})

describe('messages de l’API selon la langue', () => {
  const full = createWishlistStore(
    [1, 4, 7, 25, 94, 133].map((id) => ({ id, name: `p${id}`, caught: false })),
  )
  const app = createApp(full)

  const addMewtwo = (lang?: string) =>
    app.request('/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(lang && { 'Accept-Language': lang }),
      },
      body: JSON.stringify({ id: 150, name: 'Mewtwo' }),
    })

  it.each([
    [undefined, 'en', 'The wishlist is full (6 Pokémon maximum).'],
    ['fr-FR,fr;q=0.9', 'fr', 'La wishlist est pleine (6 Pokémon maximum).'],
    ['es', 'es', 'La lista de deseos está llena (6 Pokémon como máximo).'],
    ['de', 'de', 'Die Wunschliste ist voll (maximal 6 Pokémon).'],
  ])('Accept-Language %s -> message en %s', async (header, lang, message) => {
    const res = await addMewtwo(header)

    expect(res.status).toBe(409)
    // le code ne change jamais : seul le message est traduit
    expect(await res.json()).toEqual({ error: 'WISHLIST_FULL', message })
    expect(res.headers.get('content-language')).toBe(lang)
    expect(res.headers.get('vary')).toContain('Accept-Language')
  })

  it('404 traduit avec le numéro', async () => {
    const res = await app.request('/wishlist/999', {
      method: 'DELETE',
      headers: { 'Accept-Language': 'de' },
    })

    expect(await res.json()).toEqual({
      error: 'NOT_FOUND',
      message: 'Pokémon Nr. 999 ist nicht auf der Wunschliste.',
    })
  })
})
