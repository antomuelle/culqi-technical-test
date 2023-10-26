<script lang="ts" setup>
const props = defineProps(['logged'])
</script>

<template>
  <header class="container mx-auto flex justify-between py-5">
    <div><img src="../assets/culqi-logo.png" alt="culqi logo"></div>
    <button @click="$emit('open-login')" v-if="!props.logged" class="bg-culqi-a text-white rounded-md px-4 hover:bg-purple-500">Iniciar Sesion</button>
  </header>
</template>