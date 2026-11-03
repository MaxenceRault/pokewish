# PokéWish

Wishlist de Pokémon à capturer (6 maximum).

| Dossier  | Contenu                           | Port par défaut |
| -------- | --------------------------------- | --------------- |
| `front/` | App Nuxt (Vue + TypeScript)       | 3000            |
| `back/`  | API Hono + TypeScript (sans base) | 3001            |

## Lancer en local

Le front a besoin de l'API pour la wishlist : lance les deux, dans deux terminaux.

```bash
cd back  && npm install && npm run dev   # http://localhost:3001/health
cd front && npm install && npm run dev   # http://localhost:3000
```

Pour pointer le front vers une autre API (tests e2e, autre port) :
`NUXT_PUBLIC_API_BASE=http://localhost:4000 npm run dev`.

## API

La wishlist est stockée dans **PostgreSQL (Supabase)**, table `wishlist`
([back/db/init.sql](back/db/init.sql)). Sans `DATABASE_URL`, l'API retombe
sur un tableau en mémoire (perdu au redémarrage) : c'est le cas dans la CI.

```bash
cd back
cp .env.example .env    # puis remplir DATABASE_URL (Supabase > Connect > Session pooler)
npm run db:migrate      # crée la table (rejouable sans risque)
npm run dev             # « Wishlist : PostgreSQL (DATABASE_URL) »
```

Tests des routes sur une **vraie base**, sans mock SQL (`back/tests/db/`) :
CRUD, doublons, limite de 6, persistance. Chaque fichier travaille dans un
schéma jetable `pokewish_test_*`, vidé entre chaque test puis supprimé.

```bash
cd back && npm run test:db   # utilise TEST_DATABASE_URL de back/.env
```

Dans la CI, ils tournent contre un PostgreSQL 17 jetable (service GitHub Actions).

| Route                  | Corps                  | Réponses                                    |
| ---------------------- | ---------------------- | ------------------------------------------- |
| `GET /health`          |                        | 200                                         |
| `GET /wishlist`        |                        | 200 liste                                   |
| `POST /wishlist`       | `{ "id": 25, "name" }` | 201, 400, 409 `DUPLICATE` / `WISHLIST_FULL` |
| `PATCH /wishlist/:id`  | `{ "caught": true }`   | 200, 400, 404                               |
| `DELETE /wishlist/:id` |                        | 204, 400, 404                               |

Les erreurs ont toutes la forme `{ "error": "CODE", "message": "…" }`.

## Déploiement de l'API (AWS Lambda)

L'API tourne sur **AWS Lambda** derrière **API Gateway** (HTTP API), région
`eu-north-1` comme la base Supabase. Même app Hono que le serveur Node : seul
le point d'entrée change ([back/src/lambda.ts](back/src/lambda.ts)).

Le déploiement est **manuel** (la CI vérifie seulement que le paquet Lambda
se construit) :

```bash
cd back && npm run deploy:lambda
```

Le script est rejouable : il construit le paquet, crée ou met à jour le rôle
IAM, la Lambda et l'API Gateway, puis vérifie `/health` et `/wishlist`. Il lit
`back/.env` et passe à la Lambda :

- `DATABASE_URL` : pooler Supabase « Transaction » (port 6543), déduit de
  `DATABASE_URL` ou fourni via `LAMBDA_DATABASE_URL` ;
- `CORS_ORIGINS` : origines du front autorisées (`LAMBDA_CORS_ORIGINS`,
  défaut `http://localhost:3000`).

Front branché sur l'API AWS :
`NUXT_PUBLIC_API_BASE=https://<id>.execute-api.eu-north-1.amazonaws.com npm run dev`

## Front en ligne

| Hébergement                       | Adresse                               | Rendu              |
| --------------------------------- | ------------------------------------- | ------------------ |
| Vercel                            | https://pokewish.vercel.app           | SSR (serveur Nuxt) |
| S3 + CloudFront (CDN, eu-north-1) | https://d1nxawsm2mnxx8.cloudfront.net | statique (SSG)     |

Les deux appellent la même API AWS. Ils sont déployés par la CI sur `main`,
une fois tous les contrôles verts (jobs « Deploy (Vercel) » et
« Deploy (S3 + CloudFront) »).

**Site statique** : `npm run generate` récupère les 1025 noms de Pokémon sur
PokéAPI et génère une page HTML par fiche (`/pokemon/pikachu`), plus
l'accueil dans chaque langue. Les autres langues et les liens par numéro
sont rendus dans le navigateur (repli sur `200.html`).

```bash
cd front
bash scripts/setup-static-site.sh          # une fois : bucket S3 + CloudFront
bash scripts/setup-github-static-deploy.sh # une fois : droits OIDC de la CI
NUXT_PUBLIC_API_BASE=https://3z9imkuxde.execute-api.eu-north-1.amazonaws.com npm run generate
bash scripts/publish-static.sh             # envoi S3 + invalidation CloudFront
```

## Tests e2e (Playwright)

```bash
cd front && npm run test:e2e      # ou test:e2e:ui pour l'interface visuelle
```

Playwright build et démarre lui-même l'API (port 3101) et le front (port 3100),
sans gêner les serveurs de dev. PokéAPI est simulée : pas besoin de réseau.
Premier lancement : `npx playwright install chromium`.

## Contrôles (identiques en local et dans la CI)

Dans `front/` comme dans `back/` :

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run typecheck     # TypeScript
npm test              # Vitest
npm run build         # Build
```

À la racine, les traductions du front et du back (chaque langue comparée à
`en.json` : clés manquantes ou en trop, textes vides, paramètres `{…}`) :

```bash
node scripts/check-locales.mjs
```

La CI (`.github/workflows/ci.yml`) lance ces 5 contrôles pour chaque projet à
chaque push, plus la vérification des traductions. Pour le back, elle démarre
aussi l'API et vérifie que `GET /health` répond 200.
