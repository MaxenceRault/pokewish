<script setup lang="ts">
// Change de langue en gardant la page courante (/pokemon/25 -> /de/pokemon/25)
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
</script>

<template>
  <nav class="lang" :aria-label="t('lang.label')">
    <NuxtLink
      v-for="l in locales"
      :key="l.code"
      :to="switchLocalePath(l.code)"
      :lang="l.code"
      :title="l.name"
      :aria-current="l.code === locale ? 'true' : undefined"
      class="lang__link"
    >
      {{ l.code.toUpperCase() }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.lang {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.18);
}
.lang__link {
  padding: 4px 8px;
  border-radius: 999px;
  color: rgb(255 255 255 / 0.75);
  font-family: var(--pixel);
  font-size: 9px;
  text-decoration: none;
}
.lang__link:hover,
.lang__link:focus-visible {
  color: #fff;
  outline: none;
}
.lang__link[aria-current='true'] {
  background: #fff;
  color: var(--red-lo);
}
</style>
