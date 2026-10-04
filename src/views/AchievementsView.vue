<script setup>
import { computed } from 'vue'
import ProgressBar from 'primevue/progressbar'
import { state } from '../game/engine.js'
import { ACHIEVEMENTS } from '../game/data/progression.js'
import { fmt, fmtDate } from '../game/format.js'
import ItemTile from '../components/ItemTile.vue'

const unlocked = computed(() => ACHIEVEMENTS.filter(a => state.achievements[a.id]).length)
const sorted = computed(() => [...ACHIEVEMENTS].sort((a, b) => (state.achievements[b.id] ? 1 : 0) - (state.achievements[a.id] ? 1 : 0)))
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:20px">
      <div class="row" style="margin-bottom:10px">
        <b class="grow">{{ $t('achievements.progress') }}</b>
        <span class="gold-text tnum">{{ unlocked }} / {{ ACHIEVEMENTS.length }}</span>
      </div>
      <ProgressBar :value="Math.round((unlocked / ACHIEVEMENTS.length) * 100)" style="height:10px" />
    </div>
    <div class="grid-cards">
      <div v-for="a in sorted" :key="a.id" class="card ach" :class="{ got: state.achievements[a.id] }">
        <div class="row">
          <ItemTile :icon="a.icon" :tint="state.achievements[a.id] ? '#c9a04a' : '#3a384a'" size="md" :tip="false" />
          <div class="grow">
            <div class="card-name">{{ a.name }}</div>
            <div class="card-sub">{{ a.desc }}</div>
          </div>
        </div>
        <div class="row small" style="margin-top:10px">
          <span v-if="a.gold" class="tag gold">+{{ $t('inventory.goldAmount', { n: fmt(a.gold) }) }}</span>
          <span class="grow" />
          <span v-if="state.achievements[a.id]" class="ok-text"><i class="pi pi-check" /> {{ fmtDate(state.achievements[a.id]) }}</span>
          <span v-else class="faint"><i class="pi pi-lock" /> {{ $t('common.locked') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ach:not(.got) { opacity: 0.6; }
.ach.got { border-color: rgba(226, 182, 90, 0.3); }
</style>
