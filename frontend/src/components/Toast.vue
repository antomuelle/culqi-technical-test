<script lang="ts" setup>
const props = defineProps(['message'])
</script>

<template>
  <div class="absolute text-white bg-black/80 px-6 py-4 left-[5%] bottom-[5%] shadow-md">
    <p>
      {{ props.message }}
    </p>
  </div>
</template>