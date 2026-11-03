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

La wishlist est gardée dans un tableau en mémoire : elle repart à vide à
chaque redémarrage de l'API.

| Route                  | Corps                  | Réponses                                    |
| ---------------------- | ---------------------- | ------------------------------------------- |
| `GET /health`          |                        | 200                                         |
| `GET /wishlist`        |                        | 200 liste                                   |
| `POST /wishlist`       | `{ "id": 25, "name" }` | 201, 400, 409 `DUPLICATE` / `WISHLIST_FULL` |
| `PATCH /wishlist/:id`  | `{ "caught": true }`   | 200, 400, 404                               |
| `DELETE /wishlist/:id` |                        | 204, 400, 404                               |

Les erreurs ont toutes la forme `{ "error": "CODE", "message": "…" }`.

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

La CI (`.github/workflows/ci.yml`) lance ces 5 contrôles pour chaque projet à
chaque push. Pour le back, elle démarre aussi l'API et vérifie que
`GET /health` répond 200.
