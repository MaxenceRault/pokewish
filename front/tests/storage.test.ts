// @vitest-environment happy-dom
// happy-dom fournit un vrai `localStorage` de navigateur pour ces tests.
// La wishlist est dans l'API ; le localStorage ne garde plus que le cache
// du Pokédex (noms dans chaque langue), pour ne pas rappeler PokéAPI à chaque visite.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LIKED_KEY,
  loadDexCache,
  loadLiked,
  readStorage,
  saveDexCache,
  saveLiked,
  writeStorage,
} from '../app/utils/storage'
import { dexCacheKey } from '../app/utils/wishlist'
import type { Pokemon } from '../app/types/pokemon'

// Le cache existe par langue ; ces tests utilisent celui du français
const KEY = dexCacheKey('fr')

const dex: Pokemon[] = [
  { id: 1, name: 'Bulbizarre' },
  { id: 4, name: 'Salamèche' },
]

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sauvegarde', () => {
  it('écrit le Pokédex en JSON sous la bonne clé', () => {
    expect(saveDexCache('fr', dex)).toBe(true)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(dex)
    // une autre langue a son propre cache
    expect(loadDexCache('de')).toEqual([])
  })

  it('écrase la sauvegarde précédente', () => {
    saveDexCache('fr', dex)
    saveDexCache('fr', [dex[1]!])
    expect(loadDexCache('fr')).toEqual([dex[1]])
  })
})

describe('lecture', () => {
  it('relit exactement ce qui a été sauvegardé (accents compris)', () => {
    saveDexCache('fr', dex)
    expect(loadDexCache('fr')).toEqual(dex)
  })

  it('relit un cache écrit à la main', () => {
    localStorage.setItem(KEY, '[{"id":133,"name":"Évoli"}]')
    expect(loadDexCache('fr')).toEqual([{ id: 133, name: 'Évoli' }])
  })
})

describe('stockage vide', () => {
  it('renvoie [] si rien n’a jamais été sauvegardé', () => {
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(loadDexCache('fr')).toEqual([])
  })

  it('renvoie [] pour une valeur vide', () => {
    localStorage.setItem(KEY, '')
    expect(loadDexCache('fr')).toEqual([])
  })
})

describe('JSON invalide', () => {
  it.each([
    ['JSON tronqué', '[{"id":1,"name":"Bulbi'],
    ['texte quelconque', 'pas du json'],
    ['accolade seule', '{'],
    ['null', 'null'],
    ['un objet au lieu d’une liste', '{"id":1}'],
    ['une liste de nombres', '[1,2,3]'],
  ])('%s : renvoie [] sans lever d’erreur', (_, raw) => {
    localStorage.setItem(KEY, raw)
    expect(() => loadDexCache('fr')).not.toThrow()
    expect(loadDexCache('fr')).toEqual([])
  })

  it('ignore seulement les entrées invalides et garde les bonnes', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([{ id: 1, name: 'Bulbizarre' }, { id: '4' }, null]),
    )
    expect(loadDexCache('fr')).toEqual([{ id: 1, name: 'Bulbizarre' }])
  })
})

describe('stockage inaccessible (navigation privée, quota plein…)', () => {
  it('lecture impossible : renvoie [] au lieu de planter', () => {
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Accès refusé', 'SecurityError')
    })
    expect(readStorage(KEY)).toBeNull()
    expect(loadDexCache('fr')).toEqual([])
    // restoreAllMocks ne suffit pas avec le localStorage de happy-dom
    spy.mockRestore()
  })

  it('écriture impossible : renvoie false au lieu de planter', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota dépassé', 'QuotaExceededError')
    })
    expect(saveDexCache('fr', dex)).toBe(false)
    expect(writeStorage('x', 'y')).toBe(false)
    spy.mockRestore()
  })
})

describe('Pokémon likés par ce navigateur', () => {
  it('sauvegarde et relit la liste', () => {
    saveLiked([25, 133])
    expect(loadLiked()).toEqual([25, 133])
  })

  it('vide ou corrompu : liste vide, sans erreur', () => {
    expect(loadLiked()).toEqual([])
    localStorage.setItem(LIKED_KEY, '{oups')
    expect(loadLiked()).toEqual([])
    localStorage.setItem(LIKED_KEY, '[25, "x", null]')
    expect(loadLiked()).toEqual([25])
  })
})
