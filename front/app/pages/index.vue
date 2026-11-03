<script setup lang="ts">
import type { Pokemon } from '~/types/pokemon'
import { formatDexNumber } from '~/utils/format'

const {
  list,
  status: listStatus,
  error: apiError,
  add,
  toggle,
  remove,
  reload,
} = useWishlist()
const { query, results, status, nameOf } = usePokemonSearch()
const { t } = useI18n()
const localePath = useLocalePath()

/** Nom dans la langue choisie ; sinon celui enregistré à l'ajout. */
const displayName = (p: Pokemon) => nameOf(p.id) ?? p.name

const inList = computed(() => new Set(list.value.map((p) => p.id)))
const isFull = computed(() => isWishlistFull(list.value))
const caughtCount = computed(() => list.value.filter((p) => p.caught).length)
const progress = computed(() =>
  list.value.length ? (caughtCount.value / list.value.length) * 100 : 0,
)

async function pick(pokemon: Pokemon): Promise<void> {
  await add(pokemon)
  if (!apiError.value) query.value = ''
}

function dexNumber(id: number): string {
  return formatDexNumber(id)
}
</script>

<template>
  <div class="dex">
    <!-- Partie haute : recherche -->
    <section class="shell shell--top">
      <header class="top-bar">
        <span class="lens" aria-hidden="true" />
        <span class="leds" aria-hidden="true"><i /><i /><i /></span>
        <LangSwitcher class="lang-switch" />
        <h1 class="brand">PokéWish</h1>
      </header>

      <div class="bezel">
        <span class="bezel__dots" aria-hidden="true"><i /><i /></span>
        <div class="screen">
          <div class="screen__label">
            <span>{{ t('search.label') }}</span>
            <span class="status" :class="`status--${status}`">
              {{
                t(
                  `search.status.${status === 'pending' || status === 'error' ? status : 'success'}`,
                )
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
              :placeholder="t('search.placeholder')"
              :aria-label="t('search.ariaLabel')"
              autocomplete="off"
              :disabled="status === 'pending'"
            />
          </label>

          <p v-if="apiError" class="full" role="alert">
            {{ apiError }}
            <button type="button" class="retry" @click="reload">
              {{ t('errors.retry') }}
            </button>
          </p>
          <p v-else-if="isFull" class="full">
            {{ t('wishlist.full', { max: MAX_WISHLIST }) }}
          </p>

          <p v-if="status === 'error'" class="hint">
            {{ t('search.pokeApiDown') }}
          </p>
          <p v-else-if="status === 'pending'" class="hint">
            {{ t('search.loading') }}<span class="blink">_</span>
          </p>
          <p v-else-if="!query" class="hint">{{ t('search.hint') }}</p>
          <p v-else-if="!results.length" class="hint">
            {{ t('search.noResult') }}
          </p>

          <ul v-else class="results" :aria-label="t('search.results')">
            <li v-for="p in results" :key="p.id">
              <button
                type="button"
                class="tile"
                :disabled="
                  inList.has(p.id) || isFull || listStatus !== 'success'
                "
                @click="pick(p)"
              >
                <img :src="spriteUrl(p.id)" alt="" width="72" height="72" />
                <span class="tile__name">{{ p.name }}</span>
                <span class="tile__meta">{{
                  inList.has(p.id)
                    ? t('search.added')
                    : isFull
                      ? t('search.listFull')
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
            <span
              >{{ t('wishlist.title') }} · {{ list.length }}/{{
                MAX_WISHLIST
              }}</span
            >
            <span>{{
              t('wishlist.caughtCount', {
                caught: caughtCount,
                total: list.length,
              })
            }}</span>
          </div>

          <div
            class="progress"
            role="progressbar"
            :aria-valuenow="caughtCount"
            aria-valuemin="0"
            :aria-valuemax="list.length"
            :aria-label="t('wishlist.progress')"
          >
            <span :style="{ width: `${progress}%` }" />
          </div>

          <p v-if="listStatus === 'pending'" class="hint">
            {{ t('wishlist.connecting') }}<span class="blink">_</span>
          </p>

          <div v-else-if="!list.length" class="empty">
            <span class="empty__ball" aria-hidden="true" />
            <p v-if="listStatus === 'error'">{{ t('wishlist.loadError') }}</p>
            <p v-else>
              {{ t('wishlist.empty') }}<br />{{ t('wishlist.emptyHint') }}
            </p>
          </div>

          <ul v-else class="wishlist" :aria-label="t('wishlist.title')">
            <li
              v-for="p in list"
              :key="p.id"
              class="card"
              :class="{ 'card--caught': p.caught }"
            >
              <div class="card__sprite">
                <img
                  :src="spriteUrl(p.id)"
                  :alt="displayName(p)"
                  width="80"
                  height="80"
                />
              </div>
              <div class="card__body">
                <span class="card__num">{{ dexNumber(p.id) }}</span>
                <NuxtLink
                  class="card__name"
                  :to="localePath(`/pokemon/${p.id}`)"
                  :title="t('wishlist.viewSheet', { name: displayName(p) })"
                  >{{ displayName(p) }}</NuxtLink
                >
                <button
                  type="button"
                  class="catch"
                  :aria-pressed="p.caught"
                  @click="toggle(p.id)"
                >
                  <span class="catch__ball" aria-hidden="true" />
                  {{ p.caught ? t('wishlist.caught') : t('wishlist.toCatch') }}
                </button>
              </div>
              <button
                type="button"
                class="remove"
                :aria-label="t('wishlist.remove', { name: displayName(p) })"
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
