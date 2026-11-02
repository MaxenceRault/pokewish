import { describe, expect, it } from 'vitest'
import { app } from '../src/app.js'

describe('GET /health', () => {
  it('répond 200 avec { status: "ok" }', async () => {
    const res = await app.request('/health')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toMatchObject({ status: 'ok' })
  })

  it('renvoie un uptime en secondes', async () => {
    const body = await (await app.request('/health')).json()

    expect(body.uptime).toBeTypeOf('number')
    expect(body.uptime).toBeGreaterThanOrEqual(0)
  })
})

describe('route inconnue', () => {
  it('répond 404', async () => {
    const res = await app.request('/nexiste-pas')

    expect(res.status).toBe(404)
  })
})
