<script setup lang="ts">
const list = ref<WishItem[]>([])
const newName = ref('')

function add() {
  list.value = addPokemon(list.value, newName.value)
  newName.value = ''
}
</script>

<template>
  <main>
    <NuxtRouteAnnouncer />
    <h1>PokéWishlist</h1>
    <form @submit.prevent="add">
      <input v-model="newName" placeholder="Nom du Pokémon" aria-label="Nom du Pokémon">
      <button type="submit">Ajouter</button>
    </form>
    <p v-if="!list.length">Aucun Pokémon dans la liste.</p>
    <ul>
      <li v-for="p in list" :key="p.name">
        <label :class="{ caught: p.caught }">
          <input type="checkbox" :checked="p.caught" @change="list = toggleCaught(list, p.name)">
          {{ p.name }}
        </label>
        <button @click="list = removePokemon(list, p.name)">✕</button>
      </li>
    </ul>
  </main>
</template>

<style>
main { max-width: 480px; margin: 2rem auto; font-family: system-ui, sans-serif; }
.caught { text-decoration: line-through; opacity: 0.6; }
</style>
