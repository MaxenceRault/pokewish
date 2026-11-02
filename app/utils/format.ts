/** Numéro de Pokédex sur 4 chiffres : 25 -> « #0025 ». */
export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}
