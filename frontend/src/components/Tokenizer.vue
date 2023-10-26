<script lang="ts" setup>
import { reactive } from "vue";
import Card from "./Card.vue"
import axios from 'axios'
import { PK_KEY, DEV_URL } from "../lib/constants";
import Toast from "./Toast.vue";
import Modal from "./Modal.vue";
import Loading from "./Loading.vue";

axios.defaults.headers['Authorization'] = `Bearer ${localStorage.getItem(PK_KEY)}`

const state = reactive({
  card: {
    email: "",
    card_number: "",
    expiration_month: "",
    expiration_year: "",
    cvv: "",
  },
  restoredCard: {
    email: "",
    card_number: "",
    expiration_month: "",
    expiration_year: "",
  },
  endpoint: "",
  tokens: [] as String[],
  loading: false,
  showModal: false,
  showToast: false,
  toastMessage: ""
})

async function sendCard(event: Event) {
  event.preventDefault();
  state.loading = true;
  const url = state.endpoint === "" ? (DEV_URL + "/tokens") : (state.endpoint + "/restore")
  const copy = { ...state.card }
  copy.expiration_month = String(copy.expiration_month)
  copy.expiration_year = String(copy.expiration_year)
  try {
    const response = await axios.post(url, copy)
    if (response.data.status === "ok") {
      state.tokens.push(response.data.token)
      toast("Datos de la tarjeta enviados correctamente al servidor")
    }
  }
  catch (error: any) {
    if (error.response) {
      toast(error.response.data)
    }
  }
  finally { state.loading = false; }
}

async function restoreCard(event: MouseEvent) {
  const token = (event.target as HTMLElement).textContent
  state.loading = true
  const url = state.endpoint === "" ? (DEV_URL + "/recover") : state.endpoint + "/recover"
  try {
    const response = await axios.post(url, { token })
    if (response.data.status === "ok") {
      state.restoredCard = response.data.card
      state.showModal = true
    }
  }
  catch (error: any) {
    if (error.response) {
      toast(error.response.data)
    }
  }
  finally { state.loading = false; }
}

function toast(message: string = "...") {
  state.toastMessage = message;
  state.showToast = true;
  setTimeout(()=> { state.showToast = false; }, 3000)
}
</script>

<template>
  <div class="container mx-auto text-center flex justify-center gap-2">
    <div class="inline-flex flex-col gap-2">
      <p><input v-model="state.endpoint" class="block w-full border-2 border-culqi-a px-4 py-2 mt-2 rounded-md" type="text" placeholder="Endpoint, por defecto en localhost"></p>
      <Card :card="state.card" />
      <form @submit="sendCard" class="bg-gray-300 rounded-md p-4">
        <input v-model="state.card.email" class="w-full bg-white px-4 py-2 rounded-md mb-3" type="email" placeholder="Correo" required>
        <input v-model="state.card.card_number" class="w-full bg-white px-4 py-2 rounded-md mb-3" type="number" placeholder="Numero de tarjeta" required>
        <div class="flex gap-3">
          <input v-model="state.card.expiration_month" class="bg-white px-4 py-2 rounded-md mb-3" type="number" placeholder="Mes de expiracion" required>
          <input v-model="state.card.expiration_year" class="bg-white px-4 py-2 rounded-md mb-3" type="number" placeholder="Año de expiracion" required>
        </div>
        <div class="flex gap-3">
          <input v-model="state.card.cvv" class="bg-white px-4 py-2 rounded-md mb-3" type="number" placeholder="CCV" required>
          <input class="bg-culqi-b w-full text-white px-4 py-2 rounded-md mb-3 w-ful cursor-pointer hover:bg-culqi-c" type="submit" value="Enviar">
        </div>
      </form>
    </div>

    <div v-if="state.tokens.length" class="bg-culqi-b/90 rounded px-4 py-2 text-left">
      <h3 class="text-xl">Mis Tokens:</h3>
      <p>(Click para recuperar los datos)</p>
      <ul class="text-gray-50 mt-2">
        <li
          @click="restoreCard"
          v-for="(token, i) in state.tokens"
          :data-index="i"
          class="bg-culqi-a/90 rounded px-2 py-1 mb-1 hover:bg-culqi-c cursor-pointer">
          {{ token }}
        </li>
      </ul>
    </div>

    <Toast :message="state.toastMessage" v-show="state.showToast" />
    <Loading v-show="state.loading" />
    <Modal v-show="state.showModal" @close="state.showModal = false">
      <div class="p-4"><Card :card="state.restoredCard" :is-restored="true" /></div>
    </Modal>

  </div>
</template>