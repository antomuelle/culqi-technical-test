<script lang="ts" setup>
const emit = defineEmits(['close'])

function closeModal(event: MouseEvent) {
  if (event.target === event.currentTarget)
    emit('close')
}
</script>

<template>
  <div @click="closeModal" class="absolute flex justify-center items-center top-0 left-0 w-full h-full bg-black/90">
    <div class="bg-white">
      <slot></slot>
    </div>
  </div>
</template>