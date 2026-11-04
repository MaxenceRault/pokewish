#!/usr/bin/env node
// Rapport de couverture Vitest (front + API), à partir des coverage-summary.json.
//   - affiche un tableau Markdown (la CI l'écrit dans le résumé du run) ;
//   - écrit dans <dossier> les badges SVG et COVERAGE.md (branche « badges »).
//
//   node scripts/coverage-report.mjs [dossier-de-sortie]

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const OUT = process.argv[2]
const PROJECTS = [
  { key: 'api', label: 'API (Hono)', dir: 'back' },
  { key: 'front', label: 'Front (Nuxt)', dir: 'front' },
]
const METRICS = ['lines', 'statements', 'functions', 'branches']

const color = (pct) =>
  pct >= 90
    ? '#4c1'
    : pct >= 75
      ? '#97ca00'
      : pct >= 60
        ? '#dfb317'
        : pct >= 40
          ? '#fe7d37'
          : '#e05d44'

/** Badge au format « shields » : [libellé | valeur]. */
function badge(label, pct) {
  const value = `${pct.toFixed(1)}%`
  const w = (text) => Math.round(text.length * 6.6) + 12
  const lw = w(label)
  const vw = w(value)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${lw + vw}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${vw}" height="20" fill="${color(pct)}"/>
    <rect width="${lw + vw}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="14">${label}</text>
    <text x="${lw + vw / 2}" y="14">${value}</text>
  </g>
</svg>
`
}

const rows = []
for (const project of PROJECTS) {
  const file = join(ROOT, project.dir, 'coverage', 'coverage-summary.json')
  try {
    const { total } = JSON.parse(await readFile(file, 'utf8'))
    rows.push({ ...project, total })
  } catch {
    console.error(`Résumé introuvable : ${file} (npm run test:coverage ?)`)
    process.exitCode = 1
  }
}

const icon = (pct) => (pct >= 80 ? '🟢' : pct >= 50 ? '🟡' : '🔴')
const markdown = [
  '## Couverture des tests (Vitest)',
  '',
  `| Projet | ${METRICS.map((m) => m[0].toUpperCase() + m.slice(1)).join(' | ')} |`,
  `| --- | ${METRICS.map(() => '---:').join(' | ')} |`,
  ...rows.map(
    ({ label, total }) =>
      `| ${label} | ${METRICS.map((m) => `${icon(total[m].pct)} ${total[m].pct.toFixed(1)} % (${total[m].covered}/${total[m].total})`).join(' | ')} |`,
  ),
  '',
  '_Front : logique TypeScript (`app/**/*.ts`) ; les pages `.vue` sont couvertes par les tests e2e Playwright._',
].join('\n')

console.log(markdown)

if (OUT) {
  await mkdir(OUT, { recursive: true })
  for (const { key, total } of rows) {
    await writeFile(
      join(OUT, `coverage-${key}.svg`),
      badge(`coverage ${key}`, total.lines.pct),
    )
  }
  await writeFile(
    join(OUT, 'COVERAGE.md'),
    `${markdown}\n\nMis à jour : ${new Date().toISOString()} (${process.env.GITHUB_SHA ?? 'local'})\n`,
  )
}
