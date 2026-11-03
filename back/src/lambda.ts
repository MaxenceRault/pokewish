// Point d'entrée AWS Lambda (derrière API Gateway HTTP API).
// Même app Hono que le serveur Node (index.ts) : seules l'entrée et la sortie
// changent, via l'adaptateur hono/aws-lambda.
//
// Variables d'environnement de la Lambda :
//   DATABASE_URL  Supabase, pooler « Transaction » (port 6543) conseillé
//   CORS_ORIGINS  origines du front autorisées, séparées par des virgules
import { handle } from 'hono/aws-lambda'
import { createApp } from './app.js'
import { connect, createPostgresLikesStore, createPostgresStore } from './db.js'
import { createLikesStore } from './likes.js'
import { createWishlistStore } from './wishlist.js'

const databaseUrl = process.env.DATABASE_URL

// Créé une fois par conteneur Lambda, puis réutilisé d'un appel à l'autre.
// Une seule connexion : une Lambda ne traite qu'une requête à la fois.
const sql = databaseUrl ? connect(databaseUrl, { max: 1 }) : null
const store = sql ? createPostgresStore(sql) : createWishlistStore()
const likes = sql ? createPostgresLikesStore(sql) : createLikesStore()

export const handler = handle(createApp(store, likes))
