// Faux PokéAPI pour les tests e2e, démarré par Playwright (playwright.config.ts).
// Indispensable depuis le SSR des fiches : c'est le SERVEUR Nuxt qui appelle
// PokéAPI, et Playwright ne peut intercepter que les requêtes du navigateur.
// Seul Pikachu existe (par nom ou numéro) ; tout le reste répond 404.
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 3102)

const PIKACHU = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  types: [{ slot: 1, type: { name: 'electric' } }],
  stats: [
    { base_stat: 35, stat: { name: 'hp' } },
    { base_stat: 55, stat: { name: 'attack' } },
    { base_stat: 90, stat: { name: 'speed' } },
  ],
  sprites: {
    front_default: 'https://raw.githubusercontent.com/sprites/25.png',
    other: {
      'official-artwork': {
        front_default: 'https://raw.githubusercontent.com/art/25.png',
      },
    },
  },
  species: {
    name: 'pikachu',
    url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
  },
}

const PIKACHU_SPECIES = {
  id: 25,
  name: 'pikachu',
  names: [
    { name: 'Pikachu', language: { name: 'en' } },
    { name: 'Pikachu', language: { name: 'fr' } },
  ],
  genera: [
    { genus: 'Mouse Pokémon', language: { name: 'en' } },
    { genus: 'Pokémon Souris', language: { name: 'fr' } },
    { genus: 'Maus-Pokémon', language: { name: 'de' } },
  ],
  flavor_text_entries: [
    {
      flavor_text: 'It stores\nelectricity in its cheeks.',
      language: { name: 'en' },
    },
    {
      flavor_text: 'Il stocke\nde l’électricité dans ses joues.',
      language: { name: 'fr' },
    },
  ],
}

createServer((req, res) => {
  // Appelé aussi par le navigateur (navigation dans l'app) : CORS ouvert
  res.setHeader('Access-Control-Allow-Origin', '*')
  const [, species, key] =
    req.url?.match(/^\/pokemon(-species)?\/([^/?]+)\/?(\?.*)?$/) ?? []

  if (req.url === '/health') {
    res.writeHead(200).end('ok')
  } else if (key === '25' || key === 'pikachu') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(species ? PIKACHU_SPECIES : PIKACHU))
  } else {
    res.writeHead(404).end('Not Found')
  }
}).listen(PORT) // Playwright attend /health avant de lancer les tests
