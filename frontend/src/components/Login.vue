<script lang="ts" setup>
import { customAlphabet } from 'nanoid';
import { reactive } from 'vue';
import { DEF_USER, DEF_PASS, PK_PREFIX, PK_KEY } from '../lib/constants';

const emit = defineEmits(['logged'])

const state = reactive({
  user: "",
  pass: "",
  default: false,
  error: false
})

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 16)

function setDefaultUser(event: Event) {
  if ((event.target as HTMLInputElement).checked) {
    state.user = DEF_USER;
    state.pass = DEF_PASS;
  }
  else {
    state.user = "";
    state.pass = "";
  }
}

function submit(event: Event) {
  event.preventDefault();
  if (state.user === DEF_USER && state.pass === DEF_PASS) {
    const pk = PK_PREFIX + nanoid();
    localStorage.setItem(PK_KEY, pk);
    state.error = false;
    emit('logged')
  }
  else { state.error = true }
}
</script>

<template>
  <div class="rounded-md p-8 min-w-[380px]">
    <div class="text-center">
      <img src="../assets/culqi-logo.png" alt="culqi-logo" class="inline">
      <p class="text-xl pt-4">¡Bienvenido a Culqi Card!</p>
    </div>
    <form @submit="submit">
      <label class="py-4 block">
        <span class="text-xs">Correo</span>
        <input v-model="state.user" required class="block w-full bg-gray-100 px-4 py-2 rounded-md" type="email" placeholder="ejemplo@culqi.com">
      </label>
      <label class="pb-4 block">
        <span class="text-xs">Contraseña</span>
        <input v-model="state.pass" required class="block w-full bg-gray-100 px-4 py-2 rounded-md" type="password" placeholder="***************">
      </label>
      <label class="pb-8 block">
        <input type="checkbox" v-model="state.default" @change="setDefaultUser"> Establecer usuario por defecto
      </label>
      <p v-show="state.error" class="text-red-400 pb-4">Correo o contraseña incorrectos</p>
      <input class="bg-culqi-a text-white rounded-md w-full py-2 hover:bg-culqi-a/80 cursor-pointer" type="submit" value="Iniciar Sesion">
    </form>
  </div>
</template>