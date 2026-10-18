<script setup>
import { ref, computed, watch } from 'vue'
import { sourceRows } from '../ui/itemSources.js'
import ItemTile from './ItemTile.vue'

// Where an item comes from, each row a link to the screen where it is found
const props = defineProps({ id: { type: String, required: true } })
const SHOWN = 6
const all = ref(false)
watch(() => props.id, () => { all.value = false })

const rows = computed(() => sourceRows(props.id))
const shown = computed(() => (all.value ? rows.value : rows.value.slice(0, SHOWN)))
</script>

<template>
  <div v-if="rows.length" class="sources">
    <div class="sources-title">{{ $t('inventory.from.title') }}</div>
    <component :is="r.to ? 'router-link' : 'div'" v-for="(r, i) in shown" :key="i" :to="r.to || undefined" class="src-row" :class="{ link: r.to }">
      <ItemTile :item="r.item || null" :icon="r.item ? null : r.icon" :tint="r.tint || null" size="xs" :tip="false" />
      <span class="grow src-name">{{ r.name }}<small v-if="r.tag" class="faint"> · {{ r.tag }}</small></span>
      <span v-if="r.odds" class="small faint tnum">{{ r.odds }}</span>
      <span v-if="r.price" class="small gold-text tnum">{{ r.price }}</span>
      <span v-if="r.req" class="small src-req" :class="{ 'bad-text': !r.req.ok }" :style="r.req.ok ? { color: r.req.color } : null">{{ r.req.text }}</span>
    </component>
    <button v-if="rows.length > SHOWN" class="src-more small" @click="all = !all">
      {{ all ? $t('inventory.from.less') : $t('inventory.moreUses', { n: rows.length - SHOWN }) }}
    </button>
  </div>
</template>

<style scoped>
.sources { margin-top: 12px; }
.sources-title { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.src-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 8px; color: var(--ink-2); text-decoration: none; font-size: 13.5px; }
.src-row.link:hover { background: var(--tint-2); }
.src-name { min-width: 0; }
.src-req { white-space: nowrap; }
.src-more { border: 0; background: none; color: var(--gold); padding: 4px 6px; cursor: pointer; font: inherit; }
</style>
