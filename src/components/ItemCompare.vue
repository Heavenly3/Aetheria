<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { fmt, fmtDec, pct } from '../game/format.js'
import { ITEMS, SLOTS, STAT_LABELS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { TOOL_TYPES, TOOL_SPEED_PER_TIER } from '../game/data/character.js'
import ItemTile from './ItemTile.vue'

// preview: the item is a new copy (from the forge), so compare it even with an identical worn one
const props = defineProps({ id: String, preview: Boolean })
const { t } = useI18n()
const it = computed(() => ITEMS[props.id])
const isTool = computed(() => it.value.type === 'tool')

// What would be taken off: the item in the same slot, plus the shield or the two-handed weapon it displaces
const replaced = computed(() => {
  if (isTool.value) return [state.tools[it.value.toolType]].filter(Boolean)
  const eq = state.equipment, out = [eq[it.value.slot]]
  if (it.value.twoHanded && eq.shield) out.push(eq.shield)
  if (it.value.slot === 'shield' && eq.weapon && ITEMS[eq.weapon].twoHanded) out.push(eq.weapon)
  return out.filter(x => x && (props.preview || x !== props.id))
})
const worn = computed(() => !props.preview && (isTool.value ? state.tools[it.value.toolType] : state.equipment[it.value.slot]) === props.id)

const sum = ids => ids.reduce((acc, id) => { for (const [k, v] of Object.entries(ITEMS[id].stats || {})) acc[k] = (acc[k] || 0) + v; return acc }, {})
const rows = computed(() => {
  if (isTool.value) {
    const cur = replaced.value[0] ? ITEMS[replaced.value[0]].tier : 0
    const pct = n => Math.round(n * TOOL_SPEED_PER_TIER * 100)
    return [
      { label: t('inventory.compare.tier'), now: cur, next: it.value.tier, fmt: v => v },
      { label: t('inventory.compare.speed', { skill: SKILLS[TOOL_TYPES[it.value.toolType].skill].name }), now: pct(cur), next: pct(it.value.tier), fmt: v => `+${v}%` },
    ]
  }
  const now = sum(replaced.value), next = it.value.stats || {}
  return Object.keys(STAT_LABELS).filter(k => now[k] || next[k]).map(k => ({
    label: STAT_LABELS[k], now: now[k] || 0, next: next[k] || 0,
    fmt: v => (k === 'mDmg' ? `+${Math.round(v * 100)}%` : `+${v}`),
  }))
})
// What the swap does in a fight: power, damage per second, max hit, accuracy and how often you get hit
const combat = computed(() => {
  if (isTool.value || worn.value) return []
  void state.equipment, void state.combatStyle
  const now = G.combatProfile(), next = G.withGear(props.id, () => G.combatProfile())
  const one = v => fmtDec(v)
  return [
    { label: t('power.label'), now: now.power, next: next.power, fmt: v => fmt(v), rel: true, key: true },
    { label: t('power.dps'), now: now.dps, next: next.dps, fmt: one, rel: true },
    { label: t('power.maxHit'), now: now.maxHit, next: next.maxHit, fmt: v => fmt(v) },
    { label: t('power.accuracy'), now: now.accuracy, next: next.accuracy, fmt: pct },
    { label: t('power.hitTaken'), now: now.hitTaken, next: next.hitTaken, fmt: pct, lower: true },
    { label: t('power.maxHp'), now: now.maxHp, next: next.maxHp, fmt: v => fmt(v) },
  ].filter(r => r.key || r.fmt(r.next) !== r.fmt(r.now))
})
const better = r => (r.lower ? r.next < r.now : r.next > r.now)
const worse = r => (r.lower ? r.next > r.now : r.next < r.now)
const combatDelta = r => {
  if (r.fmt(r.next) === r.fmt(r.now)) return '='
  if (r.rel && r.now > 0) { const p = Math.round(((r.next - r.now) / r.now) * 100); return (p > 0 ? '+' : '−') + Math.abs(p) + '%' }
  return (r.next > r.now ? '+' : '−') + String(r.fmt(Math.abs(r.next - r.now))).replace('+', '')
}
const verdict = computed(() => {
  // Combat power decides for gear; raw stats decide for tools
  const pw = combat.value[0]
  if (pw) return pw.next > pw.now ? 'better' : pw.next < pw.now ? 'worse' : rows.value.some(r => r.next !== r.now) ? 'mixed' : 'same'
  const up = rows.value.filter(r => r.next > r.now).length, down = rows.value.filter(r => r.next < r.now).length
  return up && !down ? 'better' : down && !up ? 'worse' : up || down ? 'mixed' : 'same'
})
const deltaText = r => {
  const d = r.next - r.now
  if (!d) return '='
  const v = Math.abs(d)
  return (d > 0 ? '+' : '−') + String(r.fmt(v)).replace('+', '')
}
</script>

<template>
  <div class="compare">
    <div class="cmp-head">
      <span class="grow">{{ $t('inventory.compare.title') }}</span>
      <span v-if="!worn" class="tag" :class="{ ok: verdict === 'better', bad: verdict === 'worse', gold: verdict === 'mixed' }">{{ $t(`inventory.compare.${verdict}`) }}</span>
    </div>
    <p v-if="worn" class="small muted" style="margin:0">{{ $t('inventory.compare.wearing') }}</p>
    <template v-else>
      <div class="cmp-items">
        <span v-if="replaced.length" class="row" style="gap:6px">
          <ItemTile v-for="r in replaced" :key="r" :item="r" size="xs" />
          <span class="small muted">{{ replaced.map(r => ITEMS[r].name).join(' + ') }}</span>
        </span>
        <span v-else class="small muted">{{ isTool ? $t('inventory.compare.noTool') : $t('inventory.compare.emptySlot', { slot: SLOTS[it.slot].name }) }}</span>
        <i class="pi pi-arrow-right faint" />
        <ItemTile :item="id" size="xs" />
      </div>
      <div class="cmp-table">
        <template v-for="r in rows" :key="r.label">
          <span class="muted">{{ r.label }}</span>
          <span class="tnum faint">{{ r.fmt(r.now) }}</span>
          <span class="tnum">{{ r.fmt(r.next) }}</span>
          <b class="tnum" :class="r.next > r.now ? 'ok-text' : r.next < r.now ? 'bad-text' : 'faint'">{{ deltaText(r) }}</b>
        </template>
      </div>
      <template v-if="combat.length">
        <div class="cmp-sub">{{ $t('power.inCombat') }}</div>
        <div class="cmp-table">
          <template v-for="r in combat" :key="r.label">
            <span class="muted" :class="{ key: r.key }">{{ r.label }}</span>
            <span class="tnum faint">{{ r.fmt(r.now) }}</span>
            <span class="tnum">{{ r.fmt(r.next) }}</span>
            <b class="tnum" :class="better(r) ? 'ok-text' : worse(r) ? 'bad-text' : 'faint'">{{ combatDelta(r) }}</b>
          </template>
        </div>
      </template>
      <p v-if="replaced.length > 1" class="small muted" style="margin:8px 0 0"><i class="pi pi-info-circle" /> {{ $t('inventory.compare.twoHandedNote') }}</p>
    </template>
  </div>
</template>

<style scoped>
.compare { margin-top: 12px; padding: 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
.cmp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.cmp-items { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.cmp-table { display: grid; grid-template-columns: 1fr auto auto auto; gap: 4px 14px; font-size: 13.5px; align-items: center; }
.cmp-sub { margin: 10px 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.cmp-table .key { color: var(--gold); font-weight: 700; }
.cmp-table > :nth-child(4n + 2), .cmp-table > :nth-child(4n + 3), .cmp-table > :nth-child(4n) { text-align: end; }
</style>
