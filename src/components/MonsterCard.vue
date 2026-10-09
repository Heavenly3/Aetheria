<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { monsterLevel } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'
import { fmt, fmtDec, pct } from '../game/format.js'
import { chanceNote, tip } from '../ui/tips.js'
import { useI18n } from 'vue-i18n'
import ItemTile from './ItemTile.vue'

const props = defineProps({ monster: Object, kind: { type: String, default: 'area' }, locked: Boolean, lockText: String })
const emit = defineEmits(['fight'])
const m = computed(() => props.monster)
const ml = computed(() => monsterLevel(m.value))
const cl = computed(() => G.combatLevel())
const danger = computed(() => (ml.value <= cl.value ? 'ok' : ml.value <= cl.value + 12 ? '' : 'bad'))
const fighting = computed(() => state.activity?.type === 'combat' && state.activity.kind === props.kind && state.activity.target === m.value.id)
const slayerLocked = computed(() => m.value.slayer && G.level('slayer') < m.value.slayer)
const kills = computed(() => state.killsBy[m.value.id] || 0)
// How the hero would fare: time per kill and the share of health lost per kill
const { t } = useI18n()
const fight = computed(() => (void state.equipment, void state.combatStyle, G.combatProfile(G.scaleMonster(m.value))))
const risk = computed(() => { const r = fight.value.risk; return r < 0.3 ? 'low' : r < 0.8 ? 'mid' : 'high' })
const killText = computed(() => (fight.value.killTime === Infinity ? '∞' : fight.value.killTime < 60 ? `${Math.max(1, Math.round(fight.value.killTime))} s` : `${fmtDec(fight.value.killTime / 60)} min`))
const fightTip = computed(() => tip(t(`power.risk.${risk.value}`), t('power.riskHint'), [
  { text: t('power.killTime', { t: killText.value }), kind: 'muted' },
  { text: `${t('power.dps')}: ${fmtDec(fight.value.dps)}`, kind: 'muted' },
  { text: `${t('power.accuracy')}: ${pct(fight.value.accuracy)}`, kind: 'muted' },
  { text: `${t('power.hitTaken')}: ${pct(fight.value.hitTaken)}`, kind: 'muted' },
]))
</script>

<template>
  <div class="card" :data-tut="'monster:' + m.id" :class="{ active: fighting, locked: locked || slayerLocked }" style="--c:#e0554b">
    <div class="row">
      <ItemTile :icon="m.icon" :tint="m.boss ? '#c0392b' : '#7a2a32'" size="lg" :tip="false" />
      <div class="grow">
        <div class="card-name">{{ m.name }}</div>
        <div class="row wrap" style="gap:6px;margin-top:4px">
          <span class="tag" :class="danger">{{ $t('common.lvlShort', { n: ml }) }}</span>
          <span class="tag" :class="{ ok: risk === 'low', gold: risk === 'mid', bad: risk === 'high' }" v-tooltip.top="fightTip"><i class="pi pi-stopwatch" /> {{ killText }}</span>
          <span v-if="G.onTask(m)" class="tag arcane">{{ $t('combat.task') }}</span>
          <span v-if="m.slayer" class="tag" :class="slayerLocked ? 'bad' : 'arcane'">{{ $t('skills.slayer.name') }} {{ m.slayer }}</span>
        </div>
      </div>
    </div>
    <div class="row wrap small muted tnum" style="margin-top:12px;gap:12px">
      <span v-tooltip.top="$t('stats.hitpoints')"><i class="pi pi-heart" /> {{ fmt(m.hp) }}</span>
      <span v-tooltip.top="$t('combat.maxHitLabel')"><i class="pi pi-bolt" /> {{ m.maxHit }}</span>
      <span v-tooltip.top="$t('common.gold')"><i class="pi pi-wallet" /> {{ fmt(m.gold[0]) }}–{{ fmt(m.gold[1]) }}</span>
      <span v-if="m.weak" v-tooltip.top="$t('combat.weakness')"><i class="pi pi-bullseye" /> {{ $t(`combat.types.${m.weak}`) }}</span>
      <span v-if="kills" v-tooltip.top="$t('combat.defeated')"><i class="pi pi-flag" /> {{ fmt(kills) }}</span>
    </div>
    <div class="row wrap" style="gap:5px;margin-top:10px">
      <span v-for="d in m.drops" :key="d.item" class="drop" :class="{ rare: d.chance < 0.05 }">
        <ItemTile :item="d.item" size="sm" :note="chanceNote(d.chance)" />
      </span>
    </div>
    <slot />
    <Button class="fight" :label="fighting ? $t('combat.retreat') : locked ? lockText || $t('common.locked') : $t('combat.fight')" :icon="fighting ? 'pi pi-flag' : locked ? 'pi pi-lock' : 'pi pi-bolt'"
      :severity="fighting ? 'danger' : undefined" :disabled="(locked || slayerLocked) && !fighting" fluid @click="emit('fight')" />
  </div>
</template>

<style scoped>
.fight { margin-top: 14px; }
.drop.rare :deep(.tile) { box-shadow: 0 0 0 1px #b48cff inset, 0 0 12px -2px #8a5cff; }
</style>
