<script setup>
import { computed } from 'vue'
import { ITEMS } from '../game/data/items.js'
import { fmt } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import { itemTip } from '../ui/tips.js'
import { QUALITIES } from '../game/data/actions.js'
import { MYTHIC_TIERS } from '../game/data/mythics.js'

const SIZES = { xs: 22, sm: 30, md: 46, lg: 64, xl: 92 }
const p = defineProps({
  item: { type: String, default: null },
  icon: { type: String, default: null },
  tint: { type: String, default: null },
  size: { type: String, default: 'md' },
  qty: { type: Number, default: null },
  empty: Boolean,
  tip: { type: Boolean, default: true },
  note: { type: String, default: null }, // an extra line on the item card, such as a drop chance
})
const it = computed(() => (p.item ? ITEMS[p.item] : null))
const px = computed(() => SIZES[p.size] || 46)
// Finer crafted gear wears coloured gems in its corner
const grade = computed(() => (it.value?.grade ? QUALITIES[it.value.grade] : null))
// The full item card on hover (kind, stats, effects, needs and value), built only when hovered
const tipValue = computed(() => (p.tip && p.item ? () => itemTip(p.item, p.note) : null))
const style = computed(() => ({
  '--t': p.tint || it.value?.tint || '#8a8a8a',
  // Ultra rare finds glow in their tier's colour
  ...(it.value?.myth ? { '--m': MYTHIC_TIERS[it.value.myth].color } : {}),
  width: px.value + 'px',
  height: px.value + 'px',
  borderRadius: Math.max(6, Math.round(px.value * 0.27)) + 'px',
}))
</script>

<template>
  <div class="tile" :class="{ empty, myth: it?.myth }" :style="style" v-tooltip.top="tipValue">
    <GameIcon :name="icon || it?.icon" :size="Math.round(px * 0.62)" />
    <span v-if="qty !== null" class="qty">{{ fmt(qty) }}</span>
    <span v-if="grade" class="grade" :style="{ '--g': grade.color }">{{ '◆'.repeat(it.grade) }}</span>
  </div>
</template>
