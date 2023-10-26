<script setup lang="ts">
</script>

<template>
  <header class="container mx-auto flex justify-between py-5">
    <div><img src="./assets/culqi-logo.png" alt="culqi logo"></div>
    <button class="bg-culqi-a text-white rounded-md px-4 hover:bg-purple-500">Iniciar Sesion</button>
  </header>

  <div class="bg-gray-100 flex justify-center">
    <div class="py-8">
      <span class="text-2xl pr-4"><span class="text-culqi-b">Acepta</span> pagos con</span>
      <img src="./assets/cards_banner.png" alt="card banner" class="inline-block max-h-16">
    </div>
  </div>

  <div class="flex justify-center my-20">
    <div class="text-6xl flex-1 max-w-[70%]">
      <div class="flex gap-8">
        <img src="./assets/foco.svg" alt="culqi foco">
        <div class="flex flex-col justify-center">
          Encuentra la solución de <span class="text-culqi-b inline-block">pago</span> ideal para tu <span class="text-culqi-a">negocio</span></div>
      </div>
    </div>
  </div>

  <div class="container mx-auto flex justify-center items-center py-16 gap-10">
    <span class="text-3xl pr-4"><span class="text-culqi-b">¡Ellos</span> ya <span class="text-culqi-c">confían</span> en nosotros</span>
    <img src="./assets/centenario.png" alt="card banner" class="inline-block">
    <img src="./assets/satelital.png" alt="card banner" class="inline-block">
    <img src="./assets/mesa.png" alt="card banner" class="inline-block">
  </div>

  <footer class="bg-black">
    <div class="container mx-auto flex justify-between p-8">
      <div class="whitespace-nowrap">
        <img src="./assets/brand.svg" alt="culqi logo" class="inline-block">
        <span class="text-white text-3xl align-bottom pl-1">Culqi</span>
      </div>
      <div class="text-white text-right text-sm">
        © 2023 Culqi | Todos los derechos reservados. Avenida Javier Prado Este No. 496, oficina No. 2501 - San Isidro | Términos y condiciones
        <p>Con el respaldo de credicorp</p>
      </div>
    </div>
  </footer>
</template>