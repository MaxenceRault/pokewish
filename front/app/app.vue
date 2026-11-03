<script setup lang="ts">
// <html lang> et liens hreflang suivent la langue choisie
useHead(useLocaleHead())
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
</template>
