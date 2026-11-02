// @vitest-environment happy-dom
// happy-dom fournit un vrai `localStorage` de navigateur pour ces tests.
// La wishlist est dans l'API ; le localStorage ne garde plus que le cache
// du Pokédex (noms français), pour ne pas rappeler PokéAPI à chaque visite.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadDexCache,
  readStorage,
  saveDexCache,
  writeStorage,
} from '../app/utils/storage'
import { DEX_CACHE_KEY } from '../app/utils/wishlist'
import type { Pokemon } from '../app/types/pokemon'

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
    expect(saveDexCache(dex)).toBe(true)
    expect(JSON.parse(localStorage.getItem(DEX_CACHE_KEY)!)).toEqual(dex)
  })

  it('écrase la sauvegarde précédente', () => {
    saveDexCache(dex)
    saveDexCache([dex[1]!])
    expect(loadDexCache()).toEqual([dex[1]])
  })
})

describe('lecture', () => {
  it('relit exactement ce qui a été sauvegardé (accents compris)', () => {
    saveDexCache(dex)
    expect(loadDexCache()).toEqual(dex)
  })

  it('relit un cache écrit à la main', () => {
    localStorage.setItem(DEX_CACHE_KEY, '[{"id":133,"name":"Évoli"}]')
    expect(loadDexCache()).toEqual([{ id: 133, name: 'Évoli' }])
  })
})

describe('stockage vide', () => {
  it('renvoie [] si rien n’a jamais été sauvegardé', () => {
    expect(localStorage.getItem(DEX_CACHE_KEY)).toBeNull()
    expect(loadDexCache()).toEqual([])
  })

  it('renvoie [] pour une valeur vide', () => {
    localStorage.setItem(DEX_CACHE_KEY, '')
    expect(loadDexCache()).toEqual([])
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
    localStorage.setItem(DEX_CACHE_KEY, raw)
    expect(() => loadDexCache()).not.toThrow()
    expect(loadDexCache()).toEqual([])
  })

  it('ignore seulement les entrées invalides et garde les bonnes', () => {
    localStorage.setItem(
      DEX_CACHE_KEY,
      JSON.stringify([{ id: 1, name: 'Bulbizarre' }, { id: '4' }, null]),
    )
    expect(loadDexCache()).toEqual([{ id: 1, name: 'Bulbizarre' }])
  })
})

describe('stockage inaccessible (navigation privée, quota plein…)', () => {
  it('lecture impossible : renvoie [] au lieu de planter', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Accès refusé', 'SecurityError')
    })
    expect(readStorage(DEX_CACHE_KEY)).toBeNull()
    expect(loadDexCache()).toEqual([])
  })

  it('écriture impossible : renvoie false au lieu de planter', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota dépassé', 'QuotaExceededError')
    })
    expect(saveDexCache(dex)).toBe(false)
    expect(writeStorage('x', 'y')).toBe(false)
  })
})
