// Les règles de la wishlist (6 max, doublons…) sont dans l'API : voir back/tests.
// Ici : la recherche et les utilitaires d'affichage du front.
import { describe, expect, it } from 'vitest'
import {
  idFromUrl,
  isWishlistFull,
  MAX_WISHLIST,
  normalizeName,
  parsePokemonList,
  searchPokemon,
} from '../app/utils/wishlist'
import type { Pokemon, WishlistItem } from '../app/types/pokemon'

const pikachu: Pokemon = { id: 25, name: 'pikachu' }
const eevee: Pokemon = { id: 133, name: 'eevee' }

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

  it('ignore les accents (noms français)', () => {
    const fr: Pokemon[] = [
      { id: 4, name: 'Salamèche' },
      { id: 7, name: 'Carapuce' },
      { id: 29, name: 'Nidoran♀' },
    ]
    expect(searchPokemon(fr, 'salameche')).toEqual([fr[0]])
    expect(searchPokemon(fr, 'SALAMÈ')).toEqual([fr[0]])
    expect(searchPokemon(fr, 'nidoran')).toEqual([fr[2]])
  })

  it('limite le nombre de résultats', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `poke${i}`,
    }))
    expect(searchPokemon(many, 'poke')).toHaveLength(10)
  })

  it('normalizeName : minuscules, sans accents ni espaces autour', () => {
    expect(normalizeName('  Évoli ')).toBe('evoli')
    expect(normalizeName('Héricendre')).toBe('hericendre')
  })

  it("extrait l'id depuis une URL PokéAPI", () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25)
  })
})

describe('affichage de la limite', () => {
  const team = (n: number): WishlistItem[] =>
    Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: `p${i}`,
      caught: false,
    }))

  it('MAX_WISHLIST vaut 6, comme dans l’API', () => {
    expect(MAX_WISHLIST).toBe(6)
  })

  it("isWishlistFull n'est vrai qu'à partir de 6", () => {
    expect(isWishlistFull(team(5))).toBe(false)
    expect(isWishlistFull(team(6))).toBe(true)
  })
})

describe('parsePokemonList', () => {
  it('relit le cache et ignore un contenu invalide', () => {
    const dex: Pokemon[] = [{ id: 1, name: 'Bulbizarre' }]
    expect(parsePokemonList(JSON.stringify(dex))).toEqual(dex)
    expect(parsePokemonList(null)).toEqual([])
    expect(parsePokemonList('{oups')).toEqual([])
    expect(parsePokemonList('[{"id":"1"}]')).toEqual([])
  })
})
