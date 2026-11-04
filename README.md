# PokéWish

[![coverage api](https://github.com/MaxenceRault/pokewish/blob/badges/coverage-api.svg?raw=true)](https://github.com/MaxenceRault/pokewish/blob/badges/COVERAGE.md)
[![coverage front](https://github.com/MaxenceRault/pokewish/blob/badges/coverage-front.svg?raw=true)](https://github.com/MaxenceRault/pokewish/blob/badges/COVERAGE.md)

Wishlist de Pokémon à capturer, dans un Pokédex rétro façon console portable.
On cherche un Pokémon, on l'ajoute à sa wishlist (6 maximum, comme une
équipe), on le marque capturé, on ouvre sa fiche et on la like. L'app existe
en 4 langues et tourne en production sur AWS et Vercel.

| En ligne                     | Adresse                                                 |
| ---------------------------- | ------------------------------------------------------- |
| Front SSR (Vercel)           | https://pokewish.vercel.app                             |
| Front statique SSG (AWS CDN) | https://d1nxawsm2mnxx8.cloudfront.net                   |
| API (AWS Lambda)             | https://3z9imkuxde.execute-api.eu-north-1.amazonaws.com |

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Organisation du dépôt](#organisation-du-dépôt)
4. [Lancer le projet en local](#lancer-le-projet-en-local)
5. [API](#api)
6. [Base de données et migrations](#base-de-données-et-migrations)
7. [Front : SSR, SSG et langues](#front--ssr-ssg-et-langues)
8. [Tests](#tests)
9. [Déploiements](#déploiements)
10. [Production : smoke tests, SEO, rollback](#production--smoke-tests-seo-rollback)
11. [Sécurité](#sécurité)
12. [Référence des commandes](#référence-des-commandes)
13. [Historique des étapes](#historique-des-étapes)

---

## Fonctionnalités

- **Recherche** dans les 1025 Pokémon (PokéAPI), par nom ou numéro, sans
  tenir compte des accents ni des majuscules (« salameche » trouve Salamèche).
- **Wishlist** stockée dans l'API (PostgreSQL) : ajout, « capturé », retrait.
  **6 Pokémon maximum** et **pas de doublon**, règles appliquées par l'API.
- **Fiche Pokémon** `/pokemon/[name]` (nom anglais ou numéro) : artwork,
  catégorie, types, taille, poids, description, statistiques. Rendue côté
  serveur (SSR) ou générée au build (SSG), avec un vrai **404** pour un
  Pokémon inconnu.
- **Likes** sur chaque fiche : compteur partagé par tous (API), « j'ai liké »
  mémorisé dans le navigateur pour pouvoir annuler.
- **4 langues** : anglais (par défaut), français, espagnol, allemand. Les
  noms de Pokémon, les types, les statistiques, les textes de l'interface **et
  les messages d'erreur de l'API** suivent la langue choisie.
- **Design** Pokédex rouge à deux écrans LCD, adapté au mobile.
- Gestion des pannes : API ou PokéAPI injoignable, message clair et bouton
  « Réessayer », sans erreur JavaScript.

## Stack technique

| Domaine          | Outils                                                          |
| ---------------- | --------------------------------------------------------------- |
| Front            | Nuxt 4 (Vue 3, TypeScript), @nuxtjs/i18n                        |
| API              | Hono, TypeScript, postgres.js                                   |
| Base             | PostgreSQL (Supabase), migrations SQL avec un runner maison     |
| Données Pokémon  | PokéAPI (REST + GraphQL)                                        |
| Qualité          | ESLint, Prettier, TypeScript strict                             |
| Tests            | Vitest (+ @nuxt/test-utils, happy-dom), Playwright, coverage v8 |
| CI/CD            | GitHub Actions                                                  |
| Hébergement      | AWS Lambda + API Gateway, S3 + CloudFront, Vercel               |
| Authentification | OIDC GitHub → AWS (aucune clé AWS stockée dans GitHub)          |

## Organisation du dépôt

```
pokewish/
├── .github/workflows/
│   ├── ci.yml              CI + CD (contrôles, tests, déploiements, smoke)
│   └── rollback.yml        retour à une version stable (manuel)
├── scripts/                scripts Node sans dépendance (racine)
│   ├── check-locales.mjs   clés des traductions front + back
│   ├── smoke.mjs           smoke tests de la production
│   ├── seo-check.mjs       HTML des fiches sans JavaScript (SSR = SSG)
│   └── coverage-report.mjs rapport + badges de couverture
├── back/                   API Hono
│   ├── src/                app, routes, stores, i18n, migrations, lambda
│   ├── db/migrations/      000_init.sql, 001_likes.sql
│   ├── scripts/            migrate.ts, deploy-lambda.sh
│   └── tests/              unitaires + tests/db (vraie base)
└── front/                  app Nuxt
    ├── app/                pages, composants, composables, utils
    ├── i18n/locales/       en, fr, es, de
    ├── scripts/            hébergement statique S3 + CloudFront
    ├── tests/              unitaires + tests/nuxt (composables)
    └── e2e/                tests Playwright + faux PokéAPI
```

## Lancer le projet en local

Prérequis : Node 24, npm 11.

```bash
# API (terminal 1)
cd back
npm install
cp .env.example .env     # remplir DATABASE_URL (sinon : wishlist en mémoire)
npm run db:migrate       # si une base est configurée
npm run dev              # http://localhost:3001/health

# Front (terminal 2)
cd front
npm install
npm run dev              # http://localhost:3000
```

Au démarrage, l'API affiche `Wishlist : PostgreSQL (DATABASE_URL)` ou
`Wishlist : en mémoire`.

### Variables d'environnement

| Fichier     | Variable                              | Rôle                                                |
| ----------- | ------------------------------------- | --------------------------------------------------- |
| `back/.env` | `DATABASE_URL`                        | Supabase, pooler **Session** (port 5432)            |
|             | `TEST_DATABASE_URL`                   | base des tests `npm run test:db` (schémas jetables) |
|             | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | accès REST Supabase (vérifications)                 |
|             | `LAMBDA_CORS_ORIGINS`                 | origines autorisées par l'API déployée              |
| front (env) | `NUXT_PUBLIC_API_BASE`                | adresse de l'API (défaut `http://localhost:3001`)   |
|             | `NUXT_PUBLIC_POKEAPI_URL`             | PokéAPI (remplacée par un faux PokéAPI dans l'e2e)  |

`back/.env` est ignoré par git ; le modèle est `back/.env.example`.

## API

| Route                  | Corps                  | Réponses                                    |
| ---------------------- | ---------------------- | ------------------------------------------- |
| `GET /health`          |                        | 200 `{ status, uptime }`                    |
| `GET /wishlist`        |                        | 200 liste                                   |
| `POST /wishlist`       | `{ "id": 25, "name" }` | 201, 400, 409 `DUPLICATE` / `WISHLIST_FULL` |
| `PATCH /wishlist/:id`  | `{ "caught": true }`   | 200, 400, 404                               |
| `DELETE /wishlist/:id` |                        | 204, 400, 404                               |
| `GET /likes/:id`       |                        | 200 `{ id, likes }`, 400                    |
| `POST /likes/:id`      |                        | 200 (+1), 400                               |
| `DELETE /likes/:id`    |                        | 200 (−1, jamais sous 0), 400                |

- Erreurs toujours au format `{ "error": "CODE", "message": "…" }`. Le **code**
  ne change jamais, le **message** est traduit selon `Accept-Language`
  (`back/src/locales/{en,fr,es,de}.json`, anglais par défaut).
- Erreur inattendue (base injoignable…) : `500 { "error": "INTERNAL" }`.
- **CORS** : `localhost` en développement, sinon `CORS_ORIGINS` (les deux
  fronts de production).
- Les stores ont deux implémentations au même comportement : **en mémoire**
  (tests, CI) et **PostgreSQL** (production), choisies selon `DATABASE_URL`.

## Base de données et migrations

PostgreSQL sur Supabase. Toutes les requêtes sont **paramétrées** (pas
d'injection SQL possible ; un test le vérifie avec un nom piégé).

- `back/db/migrations/000_init.sql` : table `wishlist` (clé primaire sur le
  numéro de Pokédex = pas de doublon), sécurité RLS.
- `back/db/migrations/001_likes.sql` : table `likes`.
- **Runner maison** ([back/src/migrations.ts](back/src/migrations.ts)) :
  - la table `schema_migrations` retient les migrations appliquées : chacune
    ne s'exécute **qu'une fois** ;
  - chaque migration tourne dans une **transaction** : une erreur n'en laisse
    rien à moitié ;
  - un **verrou** empêche deux runners de migrer en même temps.

```bash
cd back && npm run db:migrate
# ✓ 000_init appliquée / ✓ 001_likes appliquée   (1re fois)
# · 000_init (déjà appliquée) …                   (ensuite)
```

La limite de 6 est garantie par une transaction verrouillée : deux ajouts
simultanés ne peuvent pas la dépasser. Les likes s'incrémentent en une seule
requête atomique.

## Front : SSR, SSG et langues

- **SSR (Vercel)** : les fiches sont rendues par le serveur Nuxt ; le HTML
  contient déjà le Pokémon (titre, description, stats, meta SEO).
- **SSG (S3 + CloudFront)** : `npm run generate` récupère les 1025 noms sur
  PokéAPI au build et génère **une page HTML par fiche** (`/pokemon/pikachu`),
  plus l'accueil dans chaque langue. Les autres langues et les liens par
  numéro sont rendus par le navigateur (repli sur `200.html`).
- **Langues** : `/` en anglais, `/fr`, `/es`, `/de`. Le sélecteur garde la page
  courante. Les noms de Pokémon viennent de PokéAPI (GraphQL) dans la langue
  choisie, mis en cache dans le navigateur.
- **SEO** : `<title>`, `<html lang>`, meta description et Open Graph sur
  chaque fiche, présents sans JavaScript.

## Tests

| Type                   | Où                  | Nombre | Ce qui est couvert                                             |
| ---------------------- | ------------------- | -----: | -------------------------------------------------------------- |
| Unitaires API          | `back/tests/`       |     66 | règles, routes (`app.request()`), i18n, Lambda, CORS           |
| API sur **vraie base** | `back/tests/db/`    |     25 | CRUD, doublons, limite de 6, likes, migrations, sans mock SQL  |
| Unitaires front        | `front/tests/`      |     56 | recherche, client API, PokéAPI simulée, localStorage           |
| Composables (app Nuxt) | `front/tests/nuxt/` |     21 | useWishlist, useLikes, usePokemonSearch                        |
| E2E Playwright         | `front/e2e/`        |     26 | parcours navigateur → API : fiche, langues, persistance, likes |

- **Vraie base isolée** : chaque fichier de `tests/db` travaille dans un
  schéma jetable `pokewish_test_*`, créé par les migrations, vidé entre
  chaque test puis supprimé. En CI : PostgreSQL 17 jetable.
- **E2E** : Playwright démarre la vraie API (port 3101), un faux PokéAPI
  (3102) et le front buildé (3100). Aucun appel réseau externe ; chaque étape
  est vérifiée à l'écran puis dans l'API.
- **Couverture** (Vitest, v8) : API ~98 %, front ~99 % de la logique
  TypeScript (`app/**/*.ts` ; les pages `.vue` sont couvertes par l'e2e).
- Les tests ont été validés en **cassant volontairement** le code (limite de
  6, likes, CORS, double clic…) : ils échouent à chaque fois.

```bash
cd back  && npm test && npm run test:db && npm run test:coverage
cd front && npm test && npm run test:coverage && npm run test:e2e
```

## Déploiements

| Cible                | Comment                             | Quand          |
| -------------------- | ----------------------------------- | -------------- |
| API (Lambda)         | `cd back && npm run deploy:lambda`  | **à la main**  |
| Front SSR (Vercel)   | job « Deploy (Vercel) », CLI Vercel | CI, sur `main` |
| Front SSG (S3 + CDN) | job « Deploy (S3 + CloudFront) »    | CI, sur `main` |

- **API** : le script est rejouable (rôle IAM, Lambda arm64, API Gateway), il
  passe à la Lambda `DATABASE_URL` (pooler **Transaction**, port 6543, adapté
  à Lambda) et `CORS_ORIGINS`, puis vérifie `/health` et `/wishlist`.
- **Vercel** : déploiement automatique de Vercel désactivé
  (`front/vercel.json`) ; c'est la CI qui déploie, après réussite. Secrets
  dans l'environnement GitHub `prod` : `VERCEL_TOKEN`, `VERCEL_ORG_ID`
  (`team_…`), `VERCEL_PROJECT_ID`, variable `FRONT_URL`.
- **S3 + CloudFront** : bucket privé lisible seulement par CloudFront,
  fonction CloudFront (`/x` → `/x/index.html`), invalidation du cache à chaque
  publication. Mise en place unique :

```bash
cd front
bash scripts/setup-static-site.sh          # bucket, CDN, fonction
bash scripts/setup-github-static-deploy.sh # rôle OIDC de la CI
```

## Production : smoke tests, SEO, rollback

- **Smoke tests** ([scripts/smoke.mjs](scripts/smoke.mjs)) : 13 contrôles
  (API, SSR, SSG, codes HTTP dont les 404 attendus, branchement sur l'API
  AWS), code **et** contenu. Une URL critique en échec fait **échouer la CD**.
- **SEO** ([scripts/seo-check.mjs](scripts/seo-check.mjs)) : HTML brut, sans
  JavaScript, de 5 fiches en SSR et SSG : title, h1, meta description, 6
  stats, pas de coquille vide, **SSR = SSG**.
- **Version stable** : si la production est verte, la CD pose un tag
  `stable-<date>`.
- **Rollback** ([.github/workflows/rollback.yml](.github/workflows/rollback.yml)) :
  Actions → Rollback → Run workflow. Sans version donnée, le dernier tag
  stable différent de `main` est reconstruit et redéployé (Vercel + S3), puis
  les smoke tests vérifient la production. L'API se restaure à la main :
  `git checkout stable-… && cd back && npm run deploy:lambda`.

```bash
node scripts/smoke.mjs
node scripts/seo-check.mjs
```

## Sécurité

- **Aucun secret dans le dépôt** : `back/.env` ignoré par git, secrets Vercel
  dans GitHub, mot de passe de la base dans les variables (chiffrées) de la
  Lambda.
- **GitHub → AWS par OIDC** : pas de clé AWS stockée ; le rôle ne peut être
  pris que par ce dépôt sur `main`, et ne peut qu'écrire dans le bucket du
  site et vider son cache.
- **Base** : requêtes paramétrées, RLS activée (la clé publique Supabase ne
  lit rien), accès par l'API uniquement.
- **Bucket S3 privé** : seul CloudFront peut le lire.
- **CORS** limité aux deux fronts de production et à `localhost`.
- À savoir : l'API est **publique et sans authentification** (projet
  d'apprentissage) ; n'importe qui connaissant l'URL peut modifier la
  wishlist.

## Référence des commandes

| Où       | Commande                                                                         | Rôle                                |
| -------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| racine   | `node scripts/check-locales.mjs`                                                 | clés des traductions (front + back) |
|          | `node scripts/smoke.mjs`                                                         | smoke tests de la production        |
|          | `node scripts/seo-check.mjs`                                                     | HTML des fiches sans JavaScript     |
| `back`   | `npm run dev` / `npm start`                                                      | serveur (lit `.env`)                |
|          | `npm test` / `npm run test:db` / `npm run test:coverage`                         | tests                               |
|          | `npm run db:migrate`                                                             | migrations SQL                      |
|          | `npm run build:lambda` / `npm run package:lambda`                                | paquet Lambda                       |
|          | `npm run deploy:lambda`                                                          | déploiement de l'API sur AWS        |
| `front`  | `npm run dev` / `npm run build` / `npm run generate`                             | dev, SSR, SSG                       |
|          | `npm test` / `npm run test:coverage`                                             | tests unitaires                     |
|          | `npm run test:e2e` / `npm run test:e2e:ui`                                       | tests Playwright                    |
| les deux | `npm run lint` / `npm run format` / `npm run format:check` / `npm run typecheck` | qualité                             |

## Historique des étapes

| #   | Étape                   | Résultat                                                             |
| --- | ----------------------- | -------------------------------------------------------------------- |
| 1   | Nuxt + GitHub Actions   | projet Nuxt, première CI                                             |
| 2   | Wishlist                | recherche PokéAPI, ajout/retrait, sauvegarde (localStorage puis API) |
| 3   | Design                  | Pokédex rétro à deux écrans, responsive                              |
| 4   | ESLint                  | `console.log` et `debugger` interdits                                |
| 5   | Prettier                | `singleQuote`, sans point-virgule                                    |
| 6   | TypeScript              | types `Pokemon` / `WishlistItem`, typecheck des tests                |
| 7   | Règle des 6             | testée (ajout, doublon, liste pleine)                                |
| 8   | Tests PokéAPI           | `fetch` simulé (200, 404), passent sans réseau                       |
| 9   | Tests localStorage      | vide, JSON invalide, stockage bloqué : pas de plantage               |
| 10  | Build dans la pipeline  | un import inexistant casse le build ; jobs séparés dans les PR       |
| 11  | API Hono                | `/health`, séparation `front/` et `back/`                            |
| 12  | Routes wishlist         | GET / POST / PATCH / DELETE, testées avec `app.request()`            |
| 13  | Nuxt ↔ Hono             | le front appelle l'API                                               |
| 14  | Playwright              | e2e du front avec la vraie API, puis dans la CI (CORS cassé → rouge) |
| 15  | Supabase                | `init.sql`, connexion PostgreSQL, requêtes paramétrées, persistance  |
| 16  | Tests sur vraie base    | CRUD, doublons, limite de 6 sans mock SQL                            |
| 17  | Fiche `/pokemon/[name]` | PokéAPI, cas 404                                                     |
| 18  | Langues                 | en/fr/es/de (front + erreurs API), script de vérification des clés   |
| 19  | AWS Lambda              | API déployée derrière API Gateway                                    |
| 20  | Vercel SSR              | front en SSR, déployé par la CI après réussite                       |
| 21  | SSG + S3 + CloudFront   | une page par Pokémon générée au build, publiée par la CI             |
| 22  | Likes + migrations SQL  | `schema_migrations`, runner maison, `001_likes.sql`                  |
| 23  | Playwright étendu       | fiche, langues, persistance, likes, du navigateur jusqu'à l'API      |
| 24  | Smoke tests             | la CD échoue si une URL critique ne répond pas                       |
| 25  | SEO                     | SSR et SSG comparés sans JavaScript                                  |
| 26  | Rollback                | tag `stable-*`, workflow de retour à la version précédente           |
| 27  | Couverture              | rapport + badges dans GitHub, composables testés dans une app Nuxt   |
