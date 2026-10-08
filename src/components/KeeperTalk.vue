<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { rumorsFor } from '../game/data/journal.js'
import ItemTile from './ItemTile.vue'

// The tavern keeper comments on the story so far; the newest fitting line comes first
const pool = computed(() => rumorsFor(G))
const current = ref(pool.value[pool.value.length - 1]?.id)
const params = computed(() => ({ ...G.journalNames(), boss: G.weeklyUnlocked() ? G.weeklyBoss().name : '' }))
function another() {
  const ids = pool.value.map(r => r.id).filter(id => id !== current.value)
  if (ids.length) current.value = ids[Math.floor(Math.random() * ids.length)]
}
</script>

<template>
  <div class="panel pad keeper">
    <ItemTile icon="beer-horn" tint="#e2b65a" size="md" :tip="false" />
    <div class="grow">
      <div class="small muted keeper-name">{{ $t('journal.keeper.says', G.journalNames()) }}</div>
      <p class="keeper-line">“{{ $t(`journal.rumors.${current}`, params) }}”</p>
    </div>
    <Button :label="$t('journal.keeper.ask')" icon="pi pi-comments" size="small" severity="secondary" outlined @click="another" />
  </div>
</template>

<style scoped>
.keeper { display: flex; align-items: center; gap: 14px; margin-top: 14px; }
.keeper-name { letter-spacing: 0.04em; }
.keeper-line { margin: 4px 0 0; font-style: italic; color: var(--ink-2); line-height: 1.55; max-width: 80ch; }
@media (max-width: 560px) { .keeper { flex-wrap: wrap; } .keeper .p-button { width: 100%; } }
</style>
