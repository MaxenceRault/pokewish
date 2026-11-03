import { describe, expect, it } from 'vitest'
import type { Pokemon, WishlistItem } from '../src/types.js'
import {
  addPokemon,
  checkAdd,
  createWishlistStore,
  isWishlistFull,
  MAX_WISHLIST,
  removePokemon,
  setCaught,
} from '../src/wishlist.js'

const pikachu: Pokemon = { id: 25, name: 'Pikachu' }

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
        { id: 25, name: 'Pikachu', caught: false },
      ])
    })

    it("ajoute en fin de liste sans modifier l'originale", () => {
      const list = makeList(2)
      const result = addPokemon(list, pikachu)
      expect(result.map((p) => p.id)).toEqual([1, 2, 25])
      expect(list).toHaveLength(2)
    })

    it('accepte le 6e Pokémon', () => {
      expect(addPokemon(makeList(5), pikachu)).toHaveLength(6)
    })
  })

  describe('doublon', () => {
    it('refuse un Pokémon déjà présent (même référence renvoyée)', () => {
      const list = addPokemon([], pikachu)
      expect(addPokemon(list, pikachu)).toBe(list)
      expect(checkAdd(list, 25)).toBe('DUPLICATE')
    })

    it('se base sur le numéro, pas sur le nom', () => {
      const list = addPokemon([], pikachu)
      expect(addPokemon(list, { id: 25, name: 'PIKACHU' })).toBe(list)
    })
  })

  describe('liste pleine', () => {
    it('refuse un 7e Pokémon', () => {
      const full = makeList(6)
      expect(addPokemon(full, pikachu)).toBe(full)
      expect(checkAdd(full, 25)).toBe('WISHLIST_FULL')
    })

    it("isWishlistFull n'est vrai qu'à partir de 6", () => {
      expect(isWishlistFull(makeList(5))).toBe(false)
      expect(isWishlistFull(makeList(6))).toBe(true)
    })

    it('accepte de nouveau un ajout après une suppression', () => {
      const list = removePokemon(makeList(6), 1)
      expect(checkAdd(list, 25)).toBeNull()
    })
  })
})

describe('setCaught / removePokemon', () => {
  it('marque un Pokémon comme capturé puis non capturé', () => {
    const list = addPokemon([], pikachu)
    expect(setCaught(list, 25, true)[0]!.caught).toBe(true)
    expect(setCaught(setCaught(list, 25, true), 25, false)[0]!.caught).toBe(
      false,
    )
  })

  it('retire un Pokémon', () => {
    expect(removePokemon(makeList(2), 1)).toEqual([
      { id: 2, name: 'pokemon-2', caught: false },
    ])
  })
})

describe('createWishlistStore (tableau en mémoire)', () => {
  it('part vide par défaut', async () => {
    expect(await createWishlistStore().all()).toEqual([])
  })

  it('add renvoie le nouvel élément ou la raison du refus', async () => {
    const store = createWishlistStore()
    expect(await store.add(pikachu)).toEqual({
      item: { id: 25, name: 'Pikachu', caught: false },
    })
    expect(await store.add(pikachu)).toEqual({ error: 'DUPLICATE' })
    expect(await createWishlistStore(makeList(6)).add(pikachu)).toEqual({
      error: 'WISHLIST_FULL',
    })
  })

  it('remove et setCaught signalent un Pokémon absent', async () => {
    const store = createWishlistStore([{ ...pikachu, caught: false }])
    expect(await store.setCaught(25, true)).toEqual({
      ...pikachu,
      caught: true,
    })
    expect(await store.setCaught(999, true)).toBeNull()
    expect(await store.remove(999)).toBe(false)
    expect(await store.remove(25)).toBe(true)
    expect(await store.all()).toEqual([])
  })

  it('deux stores sont indépendants', async () => {
    const a = createWishlistStore()
    await a.add(pikachu)
    expect(await createWishlistStore().all()).toEqual([])
  })
})
