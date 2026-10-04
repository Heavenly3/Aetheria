<script setup>
import { computed } from 'vue'
import { ITEMS } from '../game/data/items.js'
import { fmt } from '../game/format.js'
import GameIcon from './GameIcon.vue'

const SIZES = { xs: 22, sm: 30, md: 46, lg: 64, xl: 92 }
const p = defineProps({
  item: { type: String, default: null },
  icon: { type: String, default: null },
  tint: { type: String, default: null },
  size: { type: String, default: 'md' },
  qty: { type: Number, default: null },
  empty: Boolean,
  tip: { type: Boolean, default: true },
})
const it = computed(() => (p.item ? ITEMS[p.item] : null))
const px = computed(() => SIZES[p.size] || 46)
const style = computed(() => ({
  '--t': p.tint || it.value?.tint || '#8a8a8a',
  width: px.value + 'px',
  height: px.value + 'px',
  borderRadius: Math.max(6, Math.round(px.value * 0.27)) + 'px',
}))
</script>

<template>
  <div class="tile" :class="{ empty }" :style="style" v-tooltip.top="tip && it ? it.name : null">
    <GameIcon :name="icon || it?.icon" :size="Math.round(px * 0.62)" />
    <span v-if="qty !== null" class="qty">{{ fmt(qty) }}</span>
  </div>
</template>
