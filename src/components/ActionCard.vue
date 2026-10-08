<script setup>
import { computed } from 'vue'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { TOOL_TYPES } from '../game/data/character.js'
import { fmt, pct } from '../game/format.js'
import { chanceNote } from '../ui/tips.js'
import ItemTile from './ItemTile.vue'
import QueueButton from './QueueButton.vue'

const props = defineProps({ skill: String, action: Object })
const a = computed(() => props.action)
const lvl = computed(() => G.level(props.skill))
const locked = computed(() => lvl.value < a.value.lvl)
const noTool = computed(() => !G.hasTool(a.value))
const mLvl = computed(() => G.masteryLevel(props.skill, a.value.id))
const dbl = computed(() => G.doubleChance(props.skill, a.value.id))
const keep = computed(() => G.preserveChance(props.skill, a.value.id))
const missing = computed(() => !G.hasItems(a.value.in))
const active = computed(() => {
  const x = state.activity
  return x && x.type === 'skill' && x.skill === props.skill && x.action === a.value.id
})
const time = computed(() => G.actionTime(props.skill, a.value))
const xp = computed(() => a.value.xp * G.xpMult(props.skill))
const xph = computed(() => (xp.value * 3600) / time.value)
const progress = computed(() => (active.value ? Math.max(0, state.activity.progress) / time.value : 0))
const outQty = q => (a.value.runeMult ? q * G.runeMult(props.skill, a.value) : q)
</script>

<template>
  <button class="card action" :data-tut="'action:' + a.id" :class="{ locked: locked || noTool, active, missing }" :style="{ '--c': SKILLS[skill].color }" @click="G.startSkill(skill, a.id)">
    <div class="row">
      <ItemTile :icon="a.icon" :tint="a.tint" size="md" :tip="false" />
      <div class="grow">
        <div class="row" style="gap:4px"><div class="card-name grow">{{ a.name }}</div><QueueButton v-if="!locked" :skill="skill" :action="a" /></div>
        <div class="card-sub">
          <template v-if="locked"><i class="pi pi-lock" style="font-size:11px" /> {{ $t('skill.requiresLevel', { n: a.lvl }) }}</template>
          <template v-else-if="noTool"><i class="pi pi-wrench" style="font-size:11px" /> {{ $t('skill.requiresTool', { tool: TOOL_TYPES[a.tool.type].name, tier: a.tool.tier }) }}</template>
          <template v-else>{{ $t('common.levelN', { n: a.lvl }) }}</template>
        </div>
      </div>
    </div>

    <div class="row wrap tags">
      <span class="tag gold">+{{ fmt(xp) }} XP</span>
      <span class="tag"><i class="pi pi-clock" style="font-size:10px" /> {{ $t('common.seconds', { n: time.toFixed(1) }) }}</span>
      <span class="tag">{{ fmt(xph) }} {{ $t('skill.xpPerHour') }}</span>
      <span v-if="a.burn && !locked" class="tag bad">{{ $t('skill.burnChance', { v: pct(G.burnChance(skill, a)) }) }}</span>
      <span v-if="a.fail && !locked" class="tag bad">{{ $t('skill.failChance', { v: pct(G.failChance(skill, a)) }) }}</span>
      <span v-if="a.gold" class="tag gold">{{ a.gold[0] }}–{{ a.gold[1] }} {{ $t('common.gold') }}</span>
      <span v-if="dbl >= 0.005 && !locked" class="tag ok" v-tooltip.top="$t('skill.doubleTip')">×2 {{ pct(dbl, 1) }}</span>
      <span v-if="keep > 0 && !locked" class="tag arcane" v-tooltip.top="$t('skill.keepTip')">{{ $t('skill.keep', { v: pct(keep) }) }}</span>
    </div>

    <div v-if="Object.keys(a.in).length || Object.keys(a.out).length" class="io">
      <div v-for="(q, k) in a.in" :key="'in' + k" class="io-row">
        <ItemTile :item="k" size="xs" /><span class="grow">{{ ITEMS[k].name }}</span>
        <b :class="{ 'bad-text': G.qty(k) < q }">{{ fmt(G.qty(k)) }} / {{ q }}</b>
      </div>
      <div v-for="(q, k) in a.out" :key="'out' + k" class="io-row out">
        <i class="pi pi-arrow-right" style="font-size:10px;color:var(--faint)" />
        <ItemTile :item="k" size="xs" /><span class="grow">{{ outQty(q) }}× {{ ITEMS[k].name }}</span>
        <b class="muted">{{ fmt(G.qty(k)) }}</b>
      </div>
    </div>
    <div v-if="a.extra?.length" class="row wrap extra">
      <span class="faint small">{{ $t('skill.possible') }}</span>
      <ItemTile v-for="e in a.extra" :key="e.item" :item="e.item" size="xs" :note="chanceNote(e.chance)" />
    </div>
    <div v-if="!locked" class="mastery" v-tooltip.top="$t('skill.masteryTip')">
      <span class="small faint">{{ $t('skill.mastery') }}</span>
      <span class="bar thin grow" style="--c:#b38cff"><i :style="{ width: G.masteryProgress(skill, a.id) * 100 + '%' }" /></span>
      <b class="small tnum" style="color:#c9b0ff">{{ mLvl }}</b>
    </div>
    <div class="card-progress" :style="{ width: progress * 100 + '%' }" />
  </button>
</template>

<style scoped>
.tags { margin-top: 12px; gap: 6px; }
.io { margin-top: 12px; display: flex; flex-direction: column; gap: 5px; font-size: 13.5px; }
.io-row { display: flex; align-items: center; gap: 8px; color: var(--muted); }
.io-row b { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--ink-2); }
.extra { margin-top: 10px; gap: 5px; }
.mastery { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.card.missing:not(.locked) { border-style: dashed; }
</style>
