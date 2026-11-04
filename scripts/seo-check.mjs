#!/usr/bin/env node
// SEO : le HTML brut (HTTP, SANS JavaScript) des fiches Pokémon, en SSR
// (Vercel) et en SSG (CloudFront). Une fiche doit déjà contenir son titre,
// son nom, sa description et ses statistiques : pas une coquille vide que le
// JavaScript remplirait ensuite. Les deux versions doivent être équivalentes.
//
//   node scripts/seo-check.mjs
//
// Code de sortie 1 au moindre problème.

const SSR = process.env.SSR_URL ?? 'https://pokewish.vercel.app'
const SSG = process.env.SSG_URL ?? 'https://d1nxawsm2mnxx8.cloudfront.net'

// slug -> nom attendu (anglais, langue par défaut)
const POKEMON = {
  pikachu: 'Pikachu',
  charizard: 'Charizard',
  gengar: 'Gengar',
  eevee: 'Eevee',
  mewtwo: 'Mewtwo',
}

const decode = (s) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
const first = (html, re) => decode(html.match(re)?.[1]?.trim() ?? '')

/** Ce qu'un moteur de recherche lit, sans exécuter de JavaScript. */
function analyse(html) {
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim()
  return {
    title: first(html, /<title>([^<]*)<\/title>/i),
    h1: first(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ''),
    description: first(html, /<meta name="description" content="([^"]*)"/i),
    lang: first(html, /<html[^>]*lang="([^"]*)"/i),
    stats: (html.match(/class="stats__label"/g) ?? []).length,
    textLength: text.length,
    loading: /Scanning|Analyse en cours/.test(text),
  }
}

/** Les problèmes d'une page (tableau vide si tout va bien). */
function problems(page, name) {
  const p = []
  if (page.title !== `${name} · PokéWish`) p.push(`title « ${page.title} »`)
  if (page.h1 !== name) p.push(`h1 « ${page.h1} »`)
  if (page.description.length < 20) p.push('meta description absente')
  if (!page.lang) p.push('<html lang> absent')
  if (page.stats < 6) p.push(`${page.stats}/6 stats dans le HTML`)
  // Mesuré : une coquille vide (200.html) a ~8 caractères, une fiche ~300
  if (page.textLength < 150)
    p.push(`coquille vide (${page.textLength} caractères)`)
  if (page.loading) p.push('écran de chargement au lieu de la fiche')
  return p
}

let errors = 0
console.log('Fiche'.padEnd(12), 'SSR (Vercel)'.padEnd(34), 'SSG (CloudFront)')
for (const [slug, name] of Object.entries(POKEMON)) {
  const pages = {}
  for (const [label, base] of [
    ['SSR', SSR],
    ['SSG', SSG],
  ]) {
    // Comme un robot : simple requête HTTP, aucun JavaScript exécuté
    const res = await fetch(`${base}/pokemon/${slug}`, {
      headers: { 'User-Agent': 'PokeWish-SEO-check (no JavaScript)' },
    })
    const page = analyse(await res.text())
    const issues = res.ok ? problems(page, name) : [`HTTP ${res.status}`]
    pages[label] = { page, issues }
    errors += issues.length
  }
  // SSR et SSG doivent servir le même contenu
  for (const key of ['title', 'h1', 'description']) {
    if (pages.SSR.page[key] !== pages.SSG.page[key]) {
      pages.SSG.issues.push(`${key} différent du SSR`)
      errors++
    }
  }
  const cell = ({ page, issues }) =>
    issues.length
      ? `✗ ${issues.join(', ')}`
      : `✓ ${page.textLength} car., ${page.stats} stats`
  console.log(slug.padEnd(12), cell(pages.SSR).padEnd(34), cell(pages.SSG))
}

console.log(
  errors
    ? `\n${errors} problème(s) : des fiches ne sont pas lisibles sans JavaScript.`
    : '\nToutes les fiches sont complètes dans le HTML (SSR = SSG).',
)
if (errors) process.exitCode = 1
