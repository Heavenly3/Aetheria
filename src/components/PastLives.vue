<script setup>
import { ref, computed } from 'vue'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { TRIAL_MAP } from '../game/data/trials.js'
import { fmt, fmtTime } from '../game/format.js'
import { throttled } from '../ui/throttled.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

// Every life finished, newest first, under the one being lived now
const SHOWN = 8
const showAll = ref(false)
const now = throttled(() => G.lifeSummary(), 2000)
const lives = computed(() => [...(state.ascension.lives || [])].reverse())
const shown = computed(() => (showAll.value ? lives.value : lives.value.slice(0, SHOWN)))
// Lives lived before the record began (a save that had already ascended)
const unrecorded = computed(() => Math.max(0, state.ascension.count - lives.value.length))
const when = ts => new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' })
// How much quicker this life reached its end than the one before it
function faster(life, i) {
  const prev = lives.value[i + 1]
  if (life.played == null || prev?.played == null || life.played >= prev.played) return null
  return fmtTime(prev.played - life.played)
}
</script>

<template>
  <div class="lives">
    <div class="panel pad life now">
      <div class="row wrap life-head">
        <b class="grow">{{ $t('ascension.lives.current', { n: now.n }) }}</b>
        <span v-if="now.played != null" class="small muted tnum">{{ $t('ascension.lives.played', { time: fmtTime(now.played) }) }}</span>
      </div>
      <div class="life-stats small">
        <span>{{ $t('ascension.lives.total', { n: fmt(now.total) }) }}</span>
        <span>{{ $t('ascension.lives.hero', { n: now.hero }) }}</span>
        <span>{{ $t('ascension.lives.bosses', { n: now.bosses }) }}</span>
        <span>{{ $t('ascension.lives.kills', { n: fmt(now.kills) }) }}</span>
        <span class="life-best"><GameIcon :name="SKILLS[now.best.skill].icon" :size="13" :style="{ color: SKILLS[now.best.skill].color }" /> {{ SKILLS[now.best.skill].name }} {{ now.best.lvl }}</span>
      </div>
      <div v-if="now.trial" class="small arcane-text">{{ $t('ascension.lives.trial', { name: $t(`trials.list.${now.trial}.name`) }) }}</div>
    </div>

    <p v-if="!lives.length && !unrecorded" class="small muted">{{ $t('ascension.lives.empty') }}</p>
    <div v-for="(l, i) in shown" :key="l.n" class="panel pad life">
      <div class="row wrap life-head">
        <b class="grow">{{ $t('ascension.lives.life', { n: l.n }) }}</b>
        <span class="small faint">{{ l.start && when(l.start) !== when(l.end) ? $t('ascension.lives.period', { from: when(l.start), to: when(l.end) }) : when(l.end) }}</span>
      </div>
      <div class="life-stats small">
        <span v-if="l.played != null" class="tnum">{{ $t('ascension.lives.played', { time: fmtTime(l.played) }) }}</span>
        <span>{{ $t('ascension.lives.total', { n: fmt(l.total) }) }}</span>
        <span>{{ $t('ascension.lives.hero', { n: l.hero }) }}</span>
        <span>{{ $t('ascension.lives.bosses', { n: l.bosses }) }}</span>
        <span>{{ $t('ascension.lives.kills', { n: fmt(l.kills) }) }}</span>
        <span v-if="SKILLS[l.best.skill]" class="life-best"><GameIcon :name="SKILLS[l.best.skill].icon" :size="13" :style="{ color: SKILLS[l.best.skill].color }" /> {{ SKILLS[l.best.skill].name }} {{ l.best.lvl }}</span>
        <span class="arcane-text">{{ $t('ascension.lives.shards', { n: fmt(l.shards) }) }}</span>
      </div>
      <div v-if="l.trial && TRIAL_MAP[l.trial]" class="small ok-text"><i class="pi pi-check" aria-hidden="true" /> {{ $t('ascension.lives.trialDone', { name: $t(`trials.list.${l.trial}.name`) }) }}</div>
      <div v-if="faster(l, i)" class="small ok-text"><i class="pi pi-bolt" aria-hidden="true" /> {{ $t('ascension.lives.faster', { time: faster(l, i) }) }}</div>
      <div v-if="l.finds.length" class="row wrap life-finds">
        <span class="small muted">{{ $t('ascension.lives.finds') }}</span>
        <ItemTile v-for="id in l.finds.filter(id => ITEMS[id])" :key="id" :item="id" size="xs" />
      </div>
    </div>
    <button v-if="lives.length > SHOWN" class="lives-more small" @click="showAll = !showAll">
      {{ showAll ? $t('ascension.lives.showLess') : $t('ascension.lives.showAll', { n: lives.length }) }}
    </button>
    <p v-if="unrecorded" class="small faint">{{ $t(unrecorded === 1 ? 'ascension.lives.unrecordedOne' : 'ascension.lives.unrecorded', { n: unrecorded }) }}</p>
  </div>
</template>

<style scoped>
.lives { display: flex; flex-direction: column; gap: 10px; }
.life { padding: 12px 14px; }
.life.now { border-color: color-mix(in srgb, var(--sky) 45%, var(--line)); }
.life-head { gap: 8px; margin-bottom: 6px; }
.life-stats { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--ink-2); }
.life-best { display: inline-flex; align-items: center; gap: 4px; }
.life-finds { gap: 6px; margin-top: 8px; }
.arcane-text { color: var(--sky); }
.lives-more { align-self: flex-start; border: 0; background: none; color: var(--gold); cursor: pointer; font: inherit; padding: 4px 0; }
</style>
