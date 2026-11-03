<script setup lang="ts">
import { formatDexNumber } from '~/utils/format'

// /pokemon/pikachu ou /pokemon/25 (nom anglais ou numéro, comme PokéAPI),
// préfixé par la langue sauf en anglais : /fr/pokemon/25
const route = useRoute()
const param = computed(() => String(route.params.name))
const { t, locale } = useI18n()
const localePath = useLocalePath()

// Rendue côté serveur (SSR) : le HTML renvoyé contient déjà la fiche
// (nom, types, stats…). Le navigateur réutilise ces données sans rappeler
// PokéAPI ; il ne la rappelle que lors d'une navigation dans l'app.
const pokeapiUrl = useRuntimeConfig().public.pokeapiUrl
const {
  data: pokemon,
  status,
  refresh,
} = await useAsyncData(
  () => `pokemon-${param.value}-${locale.value}`,
  () => fetchPokemonDetails(param.value, locale.value, pokeapiUrl),
)

const notFound = computed(
  () => status.value === 'success' && pokemon.value === null,
)

// Pokémon inexistant : vrai code HTTP 404 dans la réponse du serveur
if (import.meta.server && notFound.value) {
  setResponseStatus(useRequestEvent()!, 404)
}

useHead(() => ({
  title: pokemon.value
    ? `${pokemon.value.name} · PokéWish`
    : notFound.value
      ? `${t('pokemon.notFoundTitle')} · PokéWish`
      : 'PokéWish',
}))

/** Couleurs officielles (approximatives) des types, pour les pastilles. */
const TYPE_COLORS: Record<string, string> = {
  normal: '#9fa19f',
  fire: '#e62829',
  water: '#2980ef',
  grass: '#3fa129',
  electric: '#fac000',
  ice: '#3dcef3',
  fighting: '#ff8000',
  poison: '#9141cb',
  ground: '#915121',
  flying: '#81b9ef',
  psychic: '#ef4179',
  bug: '#91a119',
  rock: '#afa981',
  ghost: '#704170',
  dragon: '#5060e1',
  dark: '#624d4e',
  steel: '#60a1b8',
  fairy: '#ef70ef',
}

// Plus haute statistique de base possible (255), pour la longueur des barres
const MAX_STAT = 255

const total = computed(
  () => pokemon.value?.stats.reduce((sum, s) => sum + s.value, 0) ?? 0,
)

const format = (n: number) => n.toLocaleString(locale.value)
</script>

<template>
  <div class="dex">
    <!-- Partie haute : identité du Pokémon -->
    <section class="shell shell--top">
      <header class="top-bar">
        <span class="lens" aria-hidden="true" />
        <span class="leds" aria-hidden="true"><i /><i /><i /></span>
        <LangSwitcher class="lang-switch" />
        <NuxtLink :to="localePath('/')" class="back">{{
          t('pokemon.back')
        }}</NuxtLink>
      </header>

      <div class="bezel">
        <span class="bezel__dots" aria-hidden="true"><i /><i /></span>
        <div class="screen">
          <div class="screen__label">
            <span>{{ t('pokemon.sheet') }}</span>
            <span v-if="pokemon">{{ formatDexNumber(pokemon.id) }}</span>
          </div>

          <p v-if="status === 'pending' || status === 'idle'" class="hint">
            {{ t('pokemon.loading') }}<span class="blink">_</span>
          </p>

          <div v-else-if="status === 'error'" class="full" role="alert">
            {{ t('pokemon.pokeApiDown') }}
            <button type="button" class="retry" @click="() => refresh()">
              {{ t('errors.retry') }}
            </button>
          </div>

          <div v-else-if="notFound" class="empty" role="alert">
            <span class="empty__ball" aria-hidden="true" />
            <h1 class="sheet__title">{{ t('pokemon.notFoundTitle') }}</h1>
            <p>
              {{ t('pokemon.notFoundText', { name: param }) }}<br />
              {{ t('pokemon.notFoundHint') }}
            </p>
            <NuxtLink :to="localePath('/')" class="retry">{{
              t('pokemon.backHome')
            }}</NuxtLink>
          </div>

          <div v-else-if="pokemon" class="sheet">
            <img
              v-if="pokemon.image"
              class="sheet__art"
              :src="pokemon.image"
              :alt="pokemon.name"
              width="220"
              height="220"
            />
            <div class="sheet__id">
              <h1 class="sheet__title">{{ pokemon.name }}</h1>
              <p v-if="pokemon.genus" class="sheet__genus">
                {{ pokemon.genus }}
              </p>
              <ul class="types" :aria-label="t('pokemon.types')">
                <li
                  v-for="type in pokemon.types"
                  :key="type"
                  :style="{ background: TYPE_COLORS[type] }"
                >
                  {{ t(`types.${type}`) }}
                </li>
              </ul>
              <dl class="measures">
                <div>
                  <dt>{{ t('pokemon.height') }}</dt>
                  <dd>{{ format(pokemon.height) }} m</dd>
                </div>
                <div>
                  <dt>{{ t('pokemon.weight') }}</dt>
                  <dd>{{ format(pokemon.weight) }} kg</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <span class="bezel__speaker" aria-hidden="true" />
      </div>
    </section>

    <div class="hinge" aria-hidden="true"><i /><i /></div>

    <!-- Partie basse : description et statistiques -->
    <section class="shell shell--bottom">
      <div class="bezel">
        <div class="screen">
          <div class="screen__label">
            <span>{{ t('pokemon.data') }}</span>
            <span v-if="pokemon">{{ t('pokemon.total', { total }) }}</span>
          </div>

          <template v-if="pokemon">
            <p v-if="pokemon.description" class="description">
              {{ pokemon.description }}
            </p>

            <ul class="stats" :aria-label="t('pokemon.stats')">
              <li v-for="stat in pokemon.stats" :key="stat.key">
                <span class="stats__label">{{ t(`stats.${stat.key}`) }}</span>
                <span class="stats__value">{{ stat.value }}</span>
                <span class="stats__bar" aria-hidden="true">
                  <span
                    :style="{ width: `${(stat.value / MAX_STAT) * 100}%` }"
                  />
                </span>
              </li>
            </ul>
          </template>
          <p v-else class="hint">{{ t('pokemon.noData') }}</p>
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

<style scoped>
.lang-switch {
  margin-left: auto;
}

.back {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.18);
  color: #fff;
  font-family: var(--pixel);
  font-size: 10px;
  text-decoration: none;
}
.back:hover,
.back:focus-visible {
  background: rgb(0 0 0 / 0.32);
  outline: none;
}

.sheet {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.sheet__art {
  flex: none;
  width: 220px;
  height: 220px;
  image-rendering: auto;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 52%, rgb(255 255 255 / 0) 72%);
}

.sheet__id {
  flex: 1;
  min-width: 200px;
  display: grid;
  gap: 10px;
}

.sheet__title {
  margin: 0;
  font-size: 44px;
  font-weight: normal;
  line-height: 1;
}

.sheet__genus {
  margin: 0;
  color: var(--ink-soft);
}

.types {
  display: flex;
  gap: 8px;
}
.types li {
  padding: 4px 14px;
  border-radius: 999px;
  color: #fff;
  font-size: 18px;
  text-shadow: 0 1px 1px rgb(0 0 0 / 0.35);
}

.measures {
  display: flex;
  gap: 28px;
  margin: 4px 0 0;
}
.measures dt {
  font-family: var(--pixel);
  font-size: 8px;
  color: var(--ink-soft);
  text-transform: uppercase;
}
.measures dd {
  margin: 4px 0 0;
  font-size: 24px;
}

.description {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgb(255 255 255 / 0.55);
  font-size: 22px;
}

.stats {
  display: grid;
  gap: 8px;
}
.stats li {
  display: grid;
  grid-template-columns: 110px 44px 1fr;
  align-items: center;
  gap: 10px;
}
.stats__label {
  color: var(--ink-soft);
}
.stats__value {
  text-align: right;
}
.stats__bar {
  height: 10px;
  border-radius: 5px;
  background: var(--lcd-line);
  overflow: hidden;
}
.stats__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), #48b07f);
}

.empty .retry {
  text-decoration: none;
  padding: 4px 14px;
}

@media (max-width: 600px) {
  .sheet {
    justify-content: center;
    text-align: center;
  }
  .sheet__art {
    width: 180px;
    height: 180px;
  }
  .types,
  .measures {
    justify-content: center;
  }
  .stats li {
    grid-template-columns: 84px 36px 1fr;
  }
}
</style>
