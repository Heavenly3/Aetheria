<script setup>
import { computed } from 'vue'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { modText } from '../i18n/mods.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

const props = defineProps({ set: Object, pieces: { type: Boolean, default: false } })
const worn = computed(() => G.setPieces(props.set))
const isWorn = id => Object.values(state.equipment).includes(id)
</script>

<template>
  <div class="set" :style="{ '--hue': set.tint }">
    <div class="row set-head">
      <GameIcon :name="set.icon" :size="16" class="set-icon" />
      <b class="grow">{{ set.name }}</b>
      <span class="tag" :class="{ gold: worn >= set.bonuses[0].n }">{{ $t('sets.worn', { n: worn, total: set.pieces.length }) }}</span>
    </div>
    <div v-if="pieces" class="row wrap set-pieces">
      <span v-for="id in set.pieces" :key="id" :class="{ off: !isWorn(id) }"><ItemTile :item="id" size="xs" /></span>
    </div>
    <div v-for="b in set.bonuses" :key="b.n" class="set-bonus" :class="{ on: worn >= b.n }">
      <span class="set-n">{{ $t('sets.pieces', { n: b.n }) }}</span>
      <span class="grow">{{ Object.entries(b.mods).map(([k, v]) => modText(k, v)).join(' · ') }}</span>
    </div>
  </div>
</template>

<style scoped>
.set { padding: 10px 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.set-head { gap: 8px; margin-bottom: 6px; }
.set-icon { color: var(--hue); }
.set-pieces { gap: 4px; margin-bottom: 6px; }
.set-pieces .off { opacity: 0.35; filter: grayscale(0.8); }
.set-bonus { display: flex; gap: 10px; font-size: 13px; color: var(--faint); padding: 2px 0; }
.set-bonus.on { color: var(--ok); }
.set-n { flex-shrink: 0; font-weight: 700; min-width: 64px; }
</style>
