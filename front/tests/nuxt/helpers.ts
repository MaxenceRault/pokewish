import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'

/**
 * Exécute un composable dans un vrai composant Nuxt monté : onMounted,
 * useI18n, useRuntimeConfig… fonctionnent comme dans l'app.
 */
export async function withSetup<T>(composable: () => T): Promise<T> {
  let result!: T
  await mountSuspended(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
  )
  return result
}

/** Réponse JSON, comme celle d'un serveur. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
