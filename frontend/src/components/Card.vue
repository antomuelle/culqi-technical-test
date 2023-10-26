<script lang="ts" setup>
const props = defineProps(['card', 'isRestored'])
</script>

<template>
  <div class="flex flex-col justify-between text-white text-2xl p-8 min-w-[400px] min-h-[280px] bg-culqi-a rounded-lg">
    <p class="text-right">{{ props.isRestored && 'RESTORED '}} CREDIT CARD</p>
    <div class="">
      <p class="pb-8">{{ props.card.card_number }}</p>
      <div class="flex justify-between">
        <p class="text-xl">{{ props.card.email }}</p>
        <p>{{ (props.card.expiration_month) + '/' + (props.card.expiration_year) }}</p>
      </div>
    </div>
  </div>
</template>