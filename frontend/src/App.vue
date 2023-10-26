<script setup lang="ts">
import Footer from './components/Footer.vue';
import Header from './components/Header.vue';
import Confidence from './components/Confidence.vue';
import Pays from './components/Pays.vue';
import Modal from './components/Modal.vue';
import Landing from './components/Landing.vue';
import Tokenizer from './components/Tokenizer.vue';
import Login from './components/Login.vue';
import { reactive } from 'vue';

const state = reactive({
  logged: false,
  showLogin: false,
})

function onLogged() {
  state.logged = true;
  state.showLogin = false;
}
</script>

<template>

  <Header @open-login="state.showLogin = true" :logged="state.logged" />
  <Pays />

  <Landing v-if="!state.logged" />
  <Tokenizer v-else />

  <Confidence />
  <Footer />

  <Modal @close="state.showLogin = false" v-show="state.showLogin">
    <Login @logged="onLogged" />
  </Modal>

</template>