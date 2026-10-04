<script setup>
import { computed } from 'vue'
import icons from '../game/icons.json'

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: [Number, String], default: 20 },
})
const data = computed(() => icons[props.name] || ['', 512, 512])
</script>

<template>
  <svg class="gi" :width="size" :height="size" :viewBox="`0 0 ${data[1]} ${data[2]}`" fill="currentColor" aria-hidden="true" v-html="data[0]" />
</template>

<style scoped>
.gi { display: inline-block; flex-shrink: 0; vertical-align: middle; }
</style>
