#!/usr/bin/env node
// Vérifie les fichiers de traduction du front et du back.
// Chaque <langue>.json est comparé à en.json (la référence) :
//   - clé manquante ou en trop,
//   - traduction vide,
//   - paramètres différents ({name}, {id}… doivent être les mêmes).
// Sort avec le code 1 au moindre problème : c'est ce qui fait échouer la CI.
//
// Usage : node scripts/check-locales.mjs [dossier…]
//         (par défaut : front/i18n/locales et back/src/locales)

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const DEFAULT_DIRS = ['front/i18n/locales', 'back/src/locales']
const REFERENCE = 'en.json'

/** { a: { b: 'x' } } -> Map { 'a.b' => 'x' } */
function flatten(value, prefix = '', out = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
  } else {
    out.set(prefix, value)
  }
  return out
}

/** Paramètres d'un message : « Retirer {name} » -> ['name'] */
const params = (text) =>
  [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

/** Les problèmes d'un fichier par rapport à la référence. */
function compare(reference, translation) {
  const problems = []
  for (const [key, english] of reference) {
    if (!translation.has(key)) {
      problems.push(`clé manquante : ${key}`)
      continue
    }
    const text = translation.get(key)
    if (typeof text !== 'string' || !text.trim()) {
      problems.push(`traduction vide : ${key}`)
    } else if (params(text).join() !== params(english).join()) {
      problems.push(
        `paramètres différents : ${key} (attendu {${params(english).join('}, {')}})`,
      )
    }
  }
  for (const key of translation.keys()) {
    if (!reference.has(key)) problems.push(`clé en trop : ${key}`)
  }
  return problems
}

async function checkDir(dir) {
  const absolute = resolve(ROOT, dir)
  const files = (await readdir(absolute)).filter((f) => f.endsWith('.json'))
  if (!files.includes(REFERENCE)) {
    return [`${dir} : ${REFERENCE} introuvable`]
  }

  const reference = flatten(await readJson(join(absolute, REFERENCE)))
  const errors = []

  for (const file of files.sort()) {
    const label = relative(ROOT, join(absolute, file))
    let problems
    try {
      problems =
        file === REFERENCE
          ? compare(reference, reference)
          : compare(reference, flatten(await readJson(join(absolute, file))))
    } catch (error) {
      problems = [`JSON invalide : ${error.message}`]
    }

    if (problems.length) {
      console.error(`✗ ${label}`)
      for (const problem of problems) console.error(`    ${problem}`)
      errors.push(...problems.map((p) => `${label} : ${p}`))
    } else {
      console.log(`✓ ${label} (${reference.size} clés)`)
    }
  }
  return errors
}

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS
const errors = []
// Un dossier après l'autre : sortie lisible dans les logs de la CI
for (const dir of dirs) errors.push(...(await checkDir(dir)))

if (errors.length) {
  console.error(`\n${errors.length} problème(s) dans les traductions.`)
  process.exitCode = 1
} else {
  console.log('\nToutes les traductions sont complètes.')
}
