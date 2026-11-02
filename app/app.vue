<script setup lang="ts">
import type { Pokemon } from '~/types/pokemon'

const { list, add, toggle, remove } = useWishlist()
const { query, results, status } = usePokemonSearch()

const inList = computed(() => new Set(list.value.map((p) => p.id)))
const isFull = computed(() => isWishlistFull(list.value))
const caughtCount = computed(() => list.value.filter((p) => p.caught).length)
const progress = computed(() =>
  list.value.length ? (caughtCount.value / list.value.length) * 100 : 0,
)

function pick(pokemon: Pokemon): void {
  add(pokemon)
  query.value = ''
}

function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}
</script>

<template>
  <div class="dex">
    <NuxtRouteAnnouncer />

    <!-- Partie haute : recherche -->
    <section class="shell shell--top">
      <header class="top-bar">
        <span class="lens" aria-hidden="true" />
        <span class="leds" aria-hidden="true"><i /><i /><i /></span>
        <h1 class="brand">PokéWish</h1>
      </header>

      <div class="bezel">
        <span class="bezel__dots" aria-hidden="true"><i /><i /></span>
        <div class="screen">
          <div class="screen__label">
            <span>Recherche</span>
            <span class="status" :class="`status--${status}`">
              {{
                status === 'pending'
                  ? 'Synchro…'
                  : status === 'error'
                    ? 'Hors ligne'
                    : 'En ligne'
              }}
            </span>
          </div>

          <label class="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              v-model="query"
              type="search"
              placeholder="Nom ou numéro…"
              aria-label="Rechercher un Pokémon par nom ou numéro"
              autocomplete="off"
              :disabled="status === 'pending'"
            />
          </label>

          <p v-if="isFull" class="full">
            Wishlist pleine ({{ MAX_WISHLIST }}/{{ MAX_WISHLIST }}) : retire un
            Pokémon pour en ajouter un autre.
          </p>

          <p v-if="status === 'error'" class="hint">
            PokéAPI est injoignable pour le moment.
          </p>
          <p v-else-if="status === 'pending'" class="hint">
            Chargement du Pokédex<span class="blink">_</span>
          </p>
          <p v-else-if="!query" class="hint">
            Essaie « pika », « char » ou « 25 ».
          </p>
          <p v-else-if="!results.length" class="hint">Aucun Pokémon trouvé.</p>

          <ul v-else class="results">
            <li v-for="p in results" :key="p.id">
              <button
                type="button"
                class="tile"
                :disabled="inList.has(p.id) || isFull"
                @click="pick(p)"
              >
                <img :src="spriteUrl(p.id)" alt="" width="72" height="72" />
                <span class="tile__name">{{ p.name }}</span>
                <span class="tile__meta">{{
                  inList.has(p.id)
                    ? 'Ajouté ✓'
                    : isFull
                      ? 'Liste pleine'
                      : dexNumber(p.id)
                }}</span>
              </button>
            </li>
          </ul>
        </div>
        <span class="bezel__speaker" aria-hidden="true" />
      </div>
    </section>

    <div class="hinge" aria-hidden="true"><i /><i /></div>

    <!-- Partie basse : la wishlist -->
    <section class="shell shell--bottom">
      <div class="bezel">
        <div class="screen">
          <div class="screen__label">
            <span>Ma wishlist · {{ list.length }}/{{ MAX_WISHLIST }}</span>
            <span>{{ caughtCount }} / {{ list.length }} capturés</span>
          </div>

          <div
            class="progress"
            role="progressbar"
            :aria-valuenow="caughtCount"
            aria-valuemin="0"
            :aria-valuemax="list.length"
            aria-label="Progression des captures"
          >
            <span :style="{ width: `${progress}%` }" />
          </div>

          <div v-if="!list.length" class="empty">
            <span class="empty__ball" aria-hidden="true" />
            <p>
              Ta wishlist est vide.<br />Cherche un Pokémon au-dessus pour
              l'ajouter.
            </p>
          </div>

          <ul v-else class="wishlist">
            <li
              v-for="p in list"
              :key="p.id"
              class="card"
              :class="{ 'card--caught': p.caught }"
            >
              <div class="card__sprite">
                <img
                  :src="spriteUrl(p.id)"
                  :alt="p.name"
                  width="80"
                  height="80"
                />
              </div>
              <div class="card__body">
                <span class="card__num">{{ dexNumber(p.id) }}</span>
                <span class="card__name">{{ p.name }}</span>
                <button
                  type="button"
                  class="catch"
                  :aria-pressed="p.caught"
                  @click="toggle(p.id)"
                >
                  <span class="catch__ball" aria-hidden="true" />
                  {{ p.caught ? 'Capturé' : 'À capturer' }}
                </button>
              </div>
              <button
                type="button"
                class="remove"
                :aria-label="`Retirer ${p.name}`"
                @click="remove(p.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <footer class="controls" aria-hidden="true">
        <span class="dpad" />
        <span class="slots"><i /><i /></span>
        <span class="buttons"><i /><i /></span>
      </footer>
    </section>
  </div>
</template>
