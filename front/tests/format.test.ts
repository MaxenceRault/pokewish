import { describe, expect, it } from 'vitest'
import { formatDexNumber } from '../app/utils/format'

describe('formatDexNumber', () => {
  it('complète à 4 chiffres', () => {
    expect(formatDexNumber(1)).toBe('#0001')
    expect(formatDexNumber(25)).toBe('#0025')
    expect(formatDexNumber(1025)).toBe('#1025')
  })
})
