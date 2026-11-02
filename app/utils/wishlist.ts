export interface WishItem {
  name: string
  caught: boolean
}

export function addPokemon(list: WishItem[], rawName: string): WishItem[] {
  const name = rawName.trim()
  if (!name) return list
  if (list.some(p => p.name.toLowerCase() === name.toLowerCase())) return list
  return [...list, { name, caught: false }]
}

export function toggleCaught(list: WishItem[], name: string): WishItem[] {
  return list.map(p => (p.name === name ? { ...p, caught: !p.caught } : p))
}

export function removePokemon(list: WishItem[], name: string): WishItem[] {
  return list.filter(p => p.name !== name)
}
