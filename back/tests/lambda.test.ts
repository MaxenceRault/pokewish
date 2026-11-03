// Le point d'entrée Lambda, appelé comme le fait API Gateway (HTTP API, v2).
// Sans DATABASE_URL, il utilise le tableau en mémoire.
import { describe, expect, it } from 'vitest'
import { handler } from '../src/lambda.js'

/** L’événement qu’API Gateway passe à la Lambda (type déduit du handler ; nos événements de test n’en remplissent que la partie utile). */
type APIGatewayProxyEventV2 = Parameters<typeof handler>[0]

function event(
  method: string,
  path: string,
  {
    body,
    headers = {},
  }: { body?: unknown; headers?: Record<string, string> } = {},
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    headers: { host: 'abc.execute-api.eu-north-1.amazonaws.com', ...headers },
    requestContext: {
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '1.2.3.4',
        userAgent: 'vitest',
      },
      domainName: 'abc.execute-api.eu-north-1.amazonaws.com',
      stage: '$default',
      requestId: 'test',
      routeKey: '$default',
      accountId: '123',
      apiId: 'abc',
      time: '',
      timeEpoch: 0,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2
}

const invoke = async (ev: APIGatewayProxyEventV2) => {
  const res = await handler(ev, {} as never)
  return { ...res, json: res.body ? JSON.parse(res.body) : undefined }
}

describe('handler Lambda (API Gateway)', () => {
  it('GET /health -> 200', async () => {
    const res = await invoke(event('GET', '/health'))

    expect(res.statusCode).toBe(200)
    expect(res.json).toMatchObject({ status: 'ok' })
  })

  it('/wishlist : GET, POST 201, doublon 409 traduit, DELETE 204', async () => {
    expect((await invoke(event('GET', '/wishlist'))).json).toEqual([])

    const json = { 'content-type': 'application/json' }
    const created = await invoke(
      event('POST', '/wishlist', {
        body: { id: 150, name: 'Mewtwo' },
        headers: json,
      }),
    )
    expect(created.statusCode).toBe(201)

    const duplicate = await invoke(
      event('POST', '/wishlist', {
        body: { id: 150, name: 'Mewtwo' },
        headers: { ...json, 'accept-language': 'de' },
      }),
    )
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json.message).toBe(
      'Dieses Pokémon ist bereits auf der Wunschliste.',
    )

    expect((await invoke(event('DELETE', '/wishlist/150'))).statusCode).toBe(
      204,
    )
  })

  it('CORS : en-tête renvoyé pour le front autorisé', async () => {
    const res = await invoke(
      event('GET', '/wishlist', {
        headers: { origin: 'http://localhost:3000' },
      }),
    )

    expect(res.headers?.['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    )
  })
})
