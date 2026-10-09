<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { MERCENARIES, COMBAT_STYLES, DUNGEONS } from '../game/data/combat.js'
import { STATUSES, TRAITS, ELITES, ELITE_LOOT } from '../game/data/fighting.js'
import { pct, fmt } from '../game/format.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'
import { help, tip } from '../ui/tips.js'

const { t } = useI18n()
const act = computed(() => state.activity)
const m = computed(() => G.getMonster(act.value))
const alive = computed(() => act.value.respawn <= 0)
const ps = computed(() => G.playerStats(m.value))
const mr = computed(() => G.monsterRolls(m.value))
const dungeon = computed(() => (act.value?.kind === 'dungeon' ? DUNGEONS.find(d => d.id === act.value.target) : null))
const elite = computed(() => (act.value?.elite ? ELITES[act.value.elite] : null))
const monsterName = computed(() => (elite.value ? t('fighting.eliteName', { kind: t(`fighting.elites.${act.value.elite}`), name: m.value.name }) : m.value.name))
const traits = computed(() => G.monsterTraits(m.value))
// Statuses on each side, with the seconds left
const statuses = side => Object.entries(act.value?.fx?.[side] || {}).map(([id, s]) => ({ id, ...STATUSES[id], left: Math.ceil(s.t), n: s.n }))
const statusTip = s => tip(t(`fighting.statuses.${s.id}.name`), t(`fighting.statuses.${s.id}.desc`), [{ text: `${s.left} s`, kind: 'muted' }])
const traitTip = id => tip(t(`fighting.traits.${id}.name`), t(`fighting.traits.${id}.desc`))

const splats = ref([])
const shake = ref({ player: 0, monster: 0 })
let id = 0
let off

onMounted(() => {
  off = G.on('hit', d => {
    const target = d.who === 'monster' ? 'player' : d.who === 'monster-merc' ? null : 'monster'
    if (!target) return
    // What the number says: damage, a crit, a dodge, a block or a status ticking
    const text = d.dodged ? t('fighting.dodged') : d.evaded ? t('fighting.evaded') : d.crit ? `${d.dmg}!` : d.blocked ? `${d.dmg} · ${t('fighting.blocked')}` : String(d.dmg)
    const s = { id: ++id, target, text, miss: !d.dmg && !d.fx, merc: d.who === 'merc', crit: d.crit, fx: d.fx, color: d.fx ? STATUSES[d.fx].color : null, soft: d.dodged || d.evaded || d.blocked }
    splats.value.push(s)
    setTimeout(() => (splats.value = splats.value.filter(x => x.id !== s.id)), 900)
    if (d.dmg > 0 && !d.fx) shake.value[target]++
  })
})
onUnmounted(() => off && off())
</script>

<template>
  <div v-if="act && m" class="arena" :class="{ 'is-elite': elite }" :style="elite ? { '--elite': elite.color } : null">
    <div class="fighter">
      <div :key="'p' + shake.player" :class="{ shake: shake.player }"><ItemTile :icon="state.avatar" :tint="state.tint" size="xl" :tip="false" /></div>
      <div class="fighter-name">{{ state.name }}</div>
      <div class="bar thick hp-ok"><i :style="{ width: (Math.max(0, state.hp) / G.maxHp()) * 100 + '%' }" /></div>
      <div class="small muted tnum" style="margin-top:5px">{{ Math.max(0, state.hp) }} / {{ G.maxHp() }} {{ $t('common.hp') }}</div>
      <div class="bar thin" style="margin-top:8px"><i :style="{ width: (alive ? Math.min(1, act.pTimer / G.attackSpeed()) : 0) * 100 + '%' }" /></div>
      <div class="fx-row">
        <span v-for="s in statuses('player')" :key="s.id" class="fx" :style="{ '--c': s.color }" v-tooltip.top="statusTip(s)">
          <GameIcon :name="s.icon" :size="13" />{{ s.left }}<sup v-if="s.n > 1">×{{ s.n }}</sup>
        </span>
      </div>
      <div v-if="act.mercs?.length" class="row" style="justify-content:center;margin-top:10px;gap:6px">
        <span v-for="mid in act.mercs" :key="mid" v-tooltip.top="MERCENARIES.find(x => x.id === mid).name">
          <ItemTile :icon="MERCENARIES.find(x => x.id === mid).icon" tint="#6a3fbf" size="sm" :tip="false" />
        </span>
      </div>
      <div v-for="s in splats.filter(x => x.target === 'player')" :key="s.id" class="splat" :class="{ miss: s.miss, soft: s.soft, fx: s.fx }" :style="s.color ? { background: s.color } : null">{{ s.text }}</div>
    </div>

    <div class="vs">VS</div>

    <div class="fighter">
      <div :key="'m' + shake.monster" :class="{ shake: shake.monster }" :style="{ opacity: alive ? 1 : 0.25, transition: 'opacity .3s' }">
        <ItemTile :icon="m.icon" :tint="elite ? elite.color : m.boss ? '#c0392b' : '#8a2a32'" size="xl" :tip="false" />
      </div>
      <div class="fighter-name">
        <span v-if="elite" class="elite-tag" v-tooltip.top="tip($t('fighting.elite'), $t('fighting.eliteHint', { gold: ELITE_LOOT.gold, drops: ELITE_LOOT.drops }))">{{ $t('fighting.elite') }}</span>
        {{ monsterName }}
      </div>
      <div class="bar thick hp"><i :style="{ width: (alive ? act.mHp / m.hp : 0) * 100 + '%' }" /></div>
      <div class="small muted tnum" style="margin-top:5px">{{ alive ? `${fmt(act.mHp)} / ${fmt(m.hp)} ${$t('common.hp')}` : $t('combat.respawning') }}</div>
      <div class="bar thin" style="margin-top:8px;--c:#e0554b"><i :style="{ width: (alive ? Math.min(1, act.mTimer / m.speed) : 0) * 100 + '%' }" /></div>
      <div class="fx-row">
        <span v-for="tr in traits" :key="tr" class="trait" v-tooltip.top="traitTip(tr)"><GameIcon :name="TRAITS[tr].icon" :size="12" /> {{ $t(`fighting.traits.${tr}.name`) }}</span>
        <span v-for="s in statuses('monster')" :key="s.id" class="fx" :style="{ '--c': s.color }" v-tooltip.top="statusTip(s)">
          <GameIcon :name="s.icon" :size="13" />{{ s.left }}<sup v-if="s.n > 1">×{{ s.n }}</sup>
        </span>
      </div>
      <div v-for="s in splats.filter(x => x.target === 'monster')" :key="s.id" class="splat" :class="{ miss: s.miss, merc: s.merc, crit: s.crit, soft: s.soft, fx: s.fx }" :style="s.color ? { background: s.color } : null">{{ s.text }}</div>
    </div>

    <div class="arena-meta">
      <span class="tag" v-tooltip.top="tip(COMBAT_STYLES[state.combatStyle].name, COMBAT_STYLES[state.combatStyle].desc)"><GameIcon :name="COMBAT_STYLES[state.combatStyle].icon" :size="12" /> {{ COMBAT_STYLES[state.combatStyle].name }}</span>
      <span class="tag" v-tooltip.top="help('combat.accuracy')">{{ $t('combat.accuracy', { v: pct(G.hitChance(ps.accRoll, mr.defRoll)) }) }}</span>
      <span class="tag" v-tooltip.top="help('stats.maxHit')">{{ $t('combat.maxHit', { v: ps.maxHit }) }}</span>
      <span class="tag" v-tooltip.top="help('combat.speed')">{{ $t('fighting.speed', { v: +G.attackSpeed().toFixed(1) }) }}</span>
      <span class="tag" v-tooltip.top="help('combat.crit')">{{ $t('fighting.critChance', { v: pct(G.critChance()) }) }}</span>
      <span class="tag" v-tooltip.top="help('combat.hitsYou')">{{ $t('combat.hitsYou', { v: pct(G.hitChance(mr.accRoll, ps.defRoll)) }) }}</span>
      <span v-if="G.dodgeChance()" class="tag" v-tooltip.top="help('combat.dodge')">{{ $t('fighting.dodge', { v: pct(G.dodgeChance()) }) }}</span>
      <span v-if="G.blockChance()" class="tag" v-tooltip.top="help('combat.block')">{{ $t('fighting.block', { v: pct(G.blockChance()) }) }}</span>
      <span v-if="m.weak" class="tag" :class="m.weak === G.styleType() ? 'ok' : ''" v-tooltip.top="help('combat.weakness')">{{ $t('combat.weakTo', { style: $t(`combat.types.${m.weak}`) }) }}</span>
      <span v-if="G.onTask(m)" class="tag arcane" v-tooltip.top="help('combat.task')">{{ $t('combat.taskLeft', { n: state.slayer.task.left }) }}</span>
      <span v-if="dungeon" class="tag arcane">{{ dungeon.name }} · {{ act.room >= dungeon.rooms.length ? $t('combat.boss') : $t('combat.room', { n: act.room + 1, total: dungeon.rooms.length }) }} · {{ $t('combat.clears', { n: act.clears }) }}</span>
      <span v-if="state.prayer" class="tag ok">{{ $t('combat.prayerActive') }}</span>
      <span class="tag gold" v-tooltip.top="help('combat.kills')">{{ $t('combat.kills', { n: act.runKills }) }}</span>
    </div>
  </div>
</template>

<style scoped>
.fx-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 5px; min-height: 22px; margin-top: 8px; }
.fx { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 999px; font-size: 11.5px; font-weight: 700;
  color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.fx sup { font-size: 9px; }
.trait { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px; font-size: 11px; color: var(--muted); border: 1px solid var(--line); }
.elite-tag { display: inline-block; margin-inline-end: 4px; padding: 0 7px; border-radius: 6px; font-family: var(--font); font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  text-transform: uppercase; color: #1a1206; background: var(--elite); vertical-align: middle; }
.is-elite { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--elite) 55%, transparent), 0 0 40px -18px var(--elite); }
.splat.crit { background: linear-gradient(135deg, #f8e3a8, #e2b65a 50%, #a87a2a); color: #1a1206; font-size: 19px; }
.splat.soft { background: #2a3550; font-size: 13px; }
.splat.fx { font-size: 13px; min-width: 26px; padding: 2px 7px; top: 34px; color: #10121a; }
</style>
