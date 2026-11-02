# PokéWish

Wishlist de Pokémon à capturer (6 maximum).

| Dossier  | Contenu                           | Port par défaut |
| -------- | --------------------------------- | --------------- |
| `front/` | App Nuxt (Vue + TypeScript)       | 3000            |
| `back/`  | API Hono + TypeScript (sans base) | 3001            |

## Lancer en local

```bash
cd front && npm install && npm run dev   # http://localhost:3000
cd back  && npm install && npm run dev   # http://localhost:3001/health
```

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
