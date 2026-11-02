import { describe, expect, it } from 'vitest'
import {
  addPokemon,
  idFromUrl,
  isWishlistFull,
  MAX_WISHLIST,
  parseWishlist,
  removePokemon,
  searchPokemon,
  toggleCaught,
} from '../app/utils/wishlist'
import type { Pokemon, WishlistItem } from '../app/types/pokemon'

const pikachu: Pokemon = { id: 25, name: 'pikachu' }
const eevee: Pokemon = { id: 133, name: 'eevee' }

/** Construit une wishlist de `n` Pokémon (ids 1 à n). */
function makeList(n: number): WishlistItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    caught: false,
  }))
}

describe('addPokemon : règle des 6 Pokémon', () => {
  it('la limite est de 6', () => {
    expect(MAX_WISHLIST).toBe(6)
  })

  describe('ajout', () => {
    it('ajoute un Pokémon à une liste vide, non capturé', () => {
      expect(addPokemon([], pikachu)).toEqual([
        { id: 25, name: 'pikachu', caught: false },
      ])
    })

    it("ajoute en fin de liste sans modifier l'originale", () => {
      const list = makeList(2)
      const result = addPokemon(list, pikachu)
      expect(result.map((p) => p.id)).toEqual([1, 2, 25])
      expect(list).toHaveLength(2)
    })

    it('accepte le 6e Pokémon', () => {
      const result = addPokemon(makeList(5), pikachu)
      expect(result).toHaveLength(6)
      expect(result.at(-1)?.id).toBe(25)
    })
  })

  describe('doublon', () => {
    it('refuse un Pokémon déjà présent (même référence renvoyée)', () => {
      const list = addPokemon([], pikachu)
      expect(addPokemon(list, pikachu)).toBe(list)
    })

    it('se base sur le numéro, pas sur le nom', () => {
      const list = addPokemon([], pikachu)
      expect(addPokemon(list, { id: 25, name: 'PIKACHU' })).toBe(list)
    })

    it('conserve le statut "capturé" du Pokémon déjà présent', () => {
      const list = toggleCaught(addPokemon([], pikachu), 25)
      expect(addPokemon(list, pikachu)[0]!.caught).toBe(true)
    })
  })

  describe('liste pleine', () => {
    it('refuse un 7e Pokémon', () => {
      const full = makeList(6)
      const result = addPokemon(full, pikachu)
      expect(result).toBe(full)
      expect(result).toHaveLength(6)
      expect(result.some((p) => p.id === 25)).toBe(false)
    })

    it("isWishlistFull n'est vrai qu'à partir de 6", () => {
      expect(isWishlistFull(makeList(5))).toBe(false)
      expect(isWishlistFull(makeList(6))).toBe(true)
    })

    it('accepte de nouveau un ajout après une suppression', () => {
      const list = removePokemon(makeList(6), 1)
      expect(addPokemon(list, pikachu)).toHaveLength(6)
    })
  })
})

describe('wishlist', () => {
  it('marque un Pokémon comme capturé', () => {
    const list = addPokemon([], pikachu)
    expect(toggleCaught(list, 25)[0]!.caught).toBe(true)
  })

  it('retire un Pokémon', () => {
    const list = addPokemon(addPokemon([], pikachu), eevee)
    expect(removePokemon(list, 25)).toEqual([
      { id: 133, name: 'eevee', caught: false },
    ])
  })
})

describe('recherche', () => {
  const all: Pokemon[] = [pikachu, eevee, { id: 26, name: 'raichu' }]

  it('filtre par nom (partiel, insensible à la casse)', () => {
    expect(searchPokemon(all, 'CHU').map((p) => p.name)).toEqual([
      'pikachu',
      'raichu',
    ])
  })

  it('filtre par numéro', () => {
    expect(searchPokemon(all, '133')).toEqual([eevee])
  })

  it('renvoie rien pour une recherche vide', () => {
    expect(searchPokemon(all, '  ')).toEqual([])
  })

  it("extrait l'id depuis une URL PokéAPI", () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25)
  })
})

describe('sauvegarde', () => {
  it('relit une liste sauvegardée', () => {
    const list: WishlistItem[] = toggleCaught(addPokemon([], pikachu), 25)
    expect(parseWishlist(JSON.stringify(list))).toEqual(list)
  })

  it('résiste à un contenu vide ou corrompu', () => {
    expect(parseWishlist(null)).toEqual([])
    expect(parseWishlist('pas du json')).toEqual([])
    expect(parseWishlist('{"a":1}')).toEqual([])
    expect(parseWishlist('[{"name":"x"}]')).toEqual([])
  })

  it('tronque à 6 une sauvegarde trop longue', () => {
    expect(parseWishlist(JSON.stringify(makeList(9)))).toHaveLength(6)
  })
})
