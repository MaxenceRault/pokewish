import { describe, expect, it } from 'vitest'
import { addPokemon, removePokemon, toggleCaught } from '../app/utils/wishlist'

describe('wishlist', () => {
  it('ajoute un Pokémon', () => {
    expect(addPokemon([], ' Pikachu ')).toEqual([{ name: 'Pikachu', caught: false }])
  })

  it('ignore les noms vides et les doublons', () => {
    const list = addPokemon([], 'Evoli')
    expect(addPokemon(list, '   ')).toBe(list)
    expect(addPokemon(list, 'evoli')).toBe(list)
  })

  it('marque un Pokémon comme capturé', () => {
    const list = addPokemon([], 'Salamèche')
    expect(toggleCaught(list, 'Salamèche')[0].caught).toBe(true)
  })

  it('retire un Pokémon', () => {
    const list = addPokemon(addPokemon([], 'Bulbizarre'), 'Carapuce')
    expect(removePokemon(list, 'Bulbizarre')).toEqual([{ name: 'Carapuce', caught: false }])
  })
})
