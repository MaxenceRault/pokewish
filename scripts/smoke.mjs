#!/usr/bin/env node
// Smoke tests de la PRODUCTION, lancés par la CD après chaque déploiement
// (et à la main) : les URL critiques doivent répondre le bon code HTTP et le
// bon contenu. Code de sortie 1 au moindre échec -> la CD échoue.
//
//   node scripts/smoke.mjs
//
// Adresses surchargeables : API_URL, SSR_URL (Vercel), SSG_URL (CloudFront).

const API =
  process.env.API_URL ??
  'https://3z9imkuxde.execute-api.eu-north-1.amazonaws.com'
const SSR = process.env.SSR_URL ?? 'https://pokewish.vercel.app'
const SSG = process.env.SSG_URL ?? 'https://d1nxawsm2mnxx8.cloudfront.net'
const ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS ?? 3)

const apiHost = new URL(API).host
const html = (text) => (body) => body.includes(text) || `« ${text} » absent`
const json = (check) => (body) => {
  try {
    return check(JSON.parse(body)) || 'JSON inattendu'
  } catch {
    return 'réponse non JSON'
  }
}

const CHECKS = [
  // API (AWS Lambda)
  ['API · /health', `${API}/health`, 200, json((b) => b.status === 'ok')],
  ['API · /wishlist', `${API}/wishlist`, 200, json(Array.isArray)],
  ['API · /likes/25', `${API}/likes/25`, 200, json((b) => b.id === 25)],
  ['API · route inconnue', `${API}/nexiste-pas`, 404],
  // Front SSR (Vercel)
  ['SSR · accueil', `${SSR}/`, 200, html('PokéWish')],
  [
    'SSR · fiche',
    `${SSR}/pokemon/pikachu`,
    200,
    html('<title>Pikachu · PokéWish</title>'),
  ],
  ['SSR · fiche (fr)', `${SSR}/fr/pokemon/25`, 200, html('Pokémon Souris')],
  ['SSR · Pokémon inconnu', `${SSR}/pokemon/missingno`, 404],
  ['SSR · branché sur l’API AWS', `${SSR}/`, 200, html(apiHost)],
  // Front SSG (S3 + CloudFront)
  ['SSG · accueil', `${SSG}/`, 200, html('PokéWish')],
  [
    'SSG · fiche',
    `${SSG}/pokemon/pikachu`,
    200,
    html('<title>Pikachu · PokéWish</title>'),
  ],
  [
    'SSG · fiche (forme)',
    `${SSG}/pokemon/deoxys-normal`,
    200,
    html('<title>Deoxys · PokéWish</title>'),
  ],
  ['SSG · branché sur l’API AWS', `${SSG}/`, 200, html(apiHost)],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Un contrôle, réessayé quelques fois (propagation du CDN, démarrage à froid). */
async function run([name, url, status, check]) {
  let problem = ''
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      })
      const body = await res.text()
      if (res.status !== status)
        problem = `HTTP ${res.status} (attendu ${status})`
      else problem = check ? check(body) : true
      if (problem === true)
        return { name, url, ok: true, detail: `HTTP ${res.status}` }
    } catch (error) {
      problem = error.cause?.code ?? error.message
    }
    if (attempt < ATTEMPTS) await sleep(3000 * attempt)
  }
  return { name, url, ok: false, detail: problem }
}

const results = await Promise.all(CHECKS.map(run))
for (const r of results) {
  console.log(
    `${r.ok ? '✓' : '✗'} ${r.name.padEnd(30)} ${r.detail.padEnd(28)} ${r.url}`,
  )
}
const failed = results.filter((r) => !r.ok)
console.log(
  failed.length
    ? `\n${failed.length} URL critique(s) en échec.`
    : `\nProduction OK (${results.length} contrôles).`,
)
if (failed.length) process.exitCode = 1
