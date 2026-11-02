import { Hono } from 'hono'

export interface HealthResponse {
  status: 'ok'
  uptime: number
}

// L'app est séparée du serveur (index.ts) pour pouvoir la tester
// avec app.request(), sans ouvrir de port.
export const app = new Hono()

app.get('/health', (c) =>
  c.json<HealthResponse>({ status: 'ok', uptime: process.uptime() }),
)
