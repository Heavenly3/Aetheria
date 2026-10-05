<script setup>
import { computed } from 'vue'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { TOOL_TYPES } from '../game/data/character.js'
import { fmt } from '../game/format.js'
import ItemTile from './ItemTile.vue'
import QueueButton from './QueueButton.vue'

// Compact version of ActionCard used by the list view
const props = defineProps({ skill: String, action: Object })
const a = computed(() => props.action)
const locked = computed(() => G.level(props.skill) < a.value.lvl)
const noTool = computed(() => !G.hasTool(a.value))
const active = computed(() => {
  const x = state.activity
  return x && x.type === 'skill' && x.skill === props.skill && x.action === a.value.id
})
const time = computed(() => G.actionTime(props.skill, a.value))
const progress = computed(() => (active.value ? Math.max(0, state.activity.progress) / time.value : 0))
const out = computed(() => Object.entries(a.value.out)[0])
</script>

<template>
  <button class="arow" :data-tut="'action:' + a.id" :class="{ locked: locked || noTool, active }" :style="{ '--c': SKILLS[skill].color }" @click="G.startSkill(skill, a.id)">
    <ItemTile :icon="a.icon" :tint="a.tint" size="sm" :tip="false" />
    <div class="name">
      <b>{{ a.name }}</b>
      <span class="small" :class="locked || noTool ? 'bad-text' : 'faint'">
        <template v-if="locked">{{ $t('common.levelN', { n: a.lvl }) }}</template>
        <template v-else-if="noTool">{{ TOOL_TYPES[a.tool.type].name }} {{ a.tool.tier }}</template>
        <template v-else>{{ $t('common.lvlShort', { n: a.lvl }) }} · {{ $t('skill.masteryN', { n: G.masteryLevel(skill, a.id) }) }}</template>
      </span>
    </div>
    <div class="ins">
      <span v-for="(q, k) in a.in" :key="k" class="in" :class="{ miss: G.qty(k) < q }" v-tooltip.top="ITEMS[k].name">
        <ItemTile :item="k" size="xs" :tip="false" /><span class="tnum">{{ fmt(G.qty(k)) }}/{{ q }}</span>
      </span>
      <span v-if="out" class="in out" v-tooltip.top="ITEMS[out[0]].name">
        <i class="pi pi-arrow-right" /><ItemTile :item="out[0]" size="xs" :tip="false" /><span class="tnum">{{ fmt(G.qty(out[0])) }}</span>
      </span>
    </div>
    <span class="tag gold">+{{ fmt(a.xp * G.xpMult(skill)) }}</span>
    <span class="tag tnum">{{ $t('common.seconds', { n: time.toFixed(1) }) }}</span>
    <QueueButton v-if="!locked" :skill="skill" :action="a" />
    <i class="bar-line" :style="{ width: progress * 100 + '%' }" />
  </button>
</template>

<style scoped>
.arow { position: relative; overflow: hidden; display: grid; grid-template-columns: auto minmax(140px, 1.2fr) minmax(0, 2fr) auto auto auto; align-items: center; gap: 12px;
  width: 100%; padding: 9px 12px; border-radius: 12px; text-align: start; color: var(--ink); font: inherit; cursor: pointer;
  background: var(--panel); border: 1px solid var(--line); transition: border-color 0.18s, background 0.18s; }
.arow:hover:not(.locked) { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.arow.active { border-color: color-mix(in srgb, var(--c) 70%, transparent); background: linear-gradient(90deg, color-mix(in srgb, var(--c) 14%, transparent), var(--panel) 70%); }
.arow.locked { opacity: 0.45; cursor: not-allowed; }
.name { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.name b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ins { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; color: var(--muted); }
.in { display: inline-flex; align-items: center; gap: 5px; }
.in.miss { color: var(--danger); }
.in.out .pi { font-size: 10px; color: var(--faint); }
.bar-line { position: absolute; inset-inline-start: 0; bottom: 0; height: 2px; background: var(--c); box-shadow: 0 0 8px var(--c); }
@media (max-width: 700px) {
  .arow { grid-template-columns: auto 1fr auto; }
  .ins { grid-column: 1 / -1; }
  .arow > .tag:last-of-type { display: none; }
}
</style>
