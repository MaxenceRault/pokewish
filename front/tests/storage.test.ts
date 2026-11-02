// @vitest-environment happy-dom
// happy-dom fournit un vrai `localStorage` de navigateur pour ces tests.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadDexCache,
  loadWishlist,
  readStorage,
  saveDexCache,
  saveWishlist,
  writeStorage,
} from '../app/utils/storage'
import { DEX_CACHE_KEY, STORAGE_KEY } from '../app/utils/wishlist'
import type { WishlistItem } from '../app/types/pokemon'

const team: WishlistItem[] = [
  { id: 25, name: 'Pikachu', caught: true },
  { id: 4, name: 'Salamèche', caught: false },
]

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sauvegarde', () => {
  it('écrit la wishlist en JSON sous la bonne clé', () => {
    expect(saveWishlist(team)).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(team)
  })

  it('écrase la sauvegarde précédente', () => {
    saveWishlist(team)
    saveWishlist([team[1]!])
    expect(loadWishlist()).toEqual([team[1]])
  })

  it('sauvegarde aussi une liste vide', () => {
    saveWishlist(team)
    saveWishlist([])
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })
})

describe('lecture', () => {
  it('relit exactement ce qui a été sauvegardé (accents compris)', () => {
    saveWishlist(team)
    expect(loadWishlist()).toEqual(team)
  })

  it('relit une sauvegarde écrite à la main', () => {
    localStorage.setItem(
      STORAGE_KEY,
      '[{"id":133,"name":"Évoli","caught":false}]',
    )
    expect(loadWishlist()).toEqual([{ id: 133, name: 'Évoli', caught: false }])
  })

  it('ne garde que 6 Pokémon même si la sauvegarde en contient plus', () => {
    const tooMany = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `p${i + 1}`,
      caught: false,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tooMany))
    expect(loadWishlist()).toHaveLength(6)
  })
})

describe('stockage vide', () => {
  it('renvoie une liste vide si rien n’a jamais été sauvegardé', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(loadWishlist()).toEqual([])
  })

  it('renvoie une liste vide pour une valeur vide', () => {
    localStorage.setItem(STORAGE_KEY, '')
    expect(loadWishlist()).toEqual([])
  })

  it('renvoie un Pokédex vide si le cache est absent', () => {
    expect(loadDexCache()).toEqual([])
  })
})

describe('JSON invalide', () => {
  it.each([
    ['JSON tronqué', '[{"id":25,"name":"Pika'],
    ['texte quelconque', 'pas du json'],
    ['accolade seule', '{'],
    ['null', 'null'],
    ['un objet au lieu d’une liste', '{"id":25}'],
    ['une chaîne JSON', '"pikachu"'],
    ['une liste de nombres', '[1,2,3]'],
  ])('%s : renvoie une liste vide sans lever d’erreur', (_, raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    expect(() => loadWishlist()).not.toThrow()
    expect(loadWishlist()).toEqual([])
  })

  it('ignore seulement les entrées invalides et garde les bonnes', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 25, name: 'Pikachu', caught: true },
        { id: '4', name: 'Salamèche', caught: false },
        { id: 7, name: 'Carapuce' },
        null,
      ]),
    )
    expect(loadWishlist()).toEqual([{ id: 25, name: 'Pikachu', caught: true }])
  })

  it('un cache Pokédex corrompu est ignoré (il sera retéléchargé)', () => {
    localStorage.setItem(DEX_CACHE_KEY, '[{"id":1,"name":"Bulbi')
    expect(loadDexCache()).toEqual([])
  })
})

describe('stockage inaccessible (navigation privée, quota plein…)', () => {
  it('lecture impossible : renvoie une liste vide au lieu de planter', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Accès refusé', 'SecurityError')
    })
    expect(readStorage(STORAGE_KEY)).toBeNull()
    expect(loadWishlist()).toEqual([])
  })

  it('écriture impossible : renvoie false au lieu de planter', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota dépassé', 'QuotaExceededError')
    })
    expect(saveWishlist(team)).toBe(false)
    expect(saveDexCache([{ id: 1, name: 'Bulbizarre' }])).toBe(false)
    expect(writeStorage('x', 'y')).toBe(false)
  })
})
