<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { G, state } from '../game/engine.js'
import { PLAYER_ATTACK_SPEED, MERCENARIES, COMBAT_STYLES, DUNGEONS } from '../game/data/combat.js'
import { pct, fmt } from '../game/format.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'

const act = computed(() => state.activity)
const m = computed(() => G.getMonster(act.value))
const alive = computed(() => act.value.respawn <= 0)
const ps = computed(() => G.playerStats(m.value))
const mr = computed(() => G.monsterRolls(m.value))
const dungeon = computed(() => (act.value?.kind === 'dungeon' ? DUNGEONS.find(d => d.id === act.value.target) : null))
const splats = ref([])
const shake = ref({ player: 0, monster: 0 })
let id = 0
let off

onMounted(() => {
  off = G.on('hit', d => {
    const target = d.who === 'monster' ? 'player' : d.who === 'monster-merc' ? null : 'monster'
    if (!target) return
    const s = { id: ++id, target, dmg: d.dmg, merc: d.who === 'merc' }
    splats.value.push(s)
    setTimeout(() => (splats.value = splats.value.filter(x => x.id !== s.id)), 900)
    if (d.dmg > 0) shake.value[target]++
  })
})
onUnmounted(() => off && off())
</script>

<template>
  <div v-if="act && m" class="arena">
    <div class="fighter">
      <div :key="'p' + shake.player" :class="{ shake: shake.player }"><ItemTile :icon="state.avatar" :tint="state.tint" size="xl" :tip="false" /></div>
      <div class="fighter-name">{{ state.name }}</div>
      <div class="bar thick hp-ok"><i :style="{ width: (Math.max(0, state.hp) / G.maxHp()) * 100 + '%' }" /></div>
      <div class="small muted tnum" style="margin-top:5px">{{ Math.max(0, state.hp) }} / {{ G.maxHp() }} {{ $t('common.hp') }}</div>
      <div class="bar thin" style="margin-top:8px"><i :style="{ width: (alive ? act.pTimer / PLAYER_ATTACK_SPEED : 0) * 100 + '%' }" /></div>
      <div v-if="act.mercs?.length" class="row" style="justify-content:center;margin-top:10px;gap:6px">
        <span v-for="mid in act.mercs" :key="mid" v-tooltip.top="MERCENARIES.find(x => x.id === mid).name">
          <ItemTile :icon="MERCENARIES.find(x => x.id === mid).icon" tint="#6a3fbf" size="sm" :tip="false" />
        </span>
      </div>
      <div v-for="s in splats.filter(x => x.target === 'player')" :key="s.id" class="splat" :class="{ miss: !s.dmg }">{{ s.dmg }}</div>
    </div>

    <div class="vs">VS</div>

    <div class="fighter">
      <div :key="'m' + shake.monster" :class="{ shake: shake.monster }" :style="{ opacity: alive ? 1 : 0.25, transition: 'opacity .3s' }">
        <ItemTile :icon="m.icon" :tint="m.boss ? '#c0392b' : '#8a2a32'" size="xl" :tip="false" />
      </div>
      <div class="fighter-name">{{ m.name }}</div>
      <div class="bar thick hp"><i :style="{ width: (alive ? act.mHp / m.hp : 0) * 100 + '%' }" /></div>
      <div class="small muted tnum" style="margin-top:5px">{{ alive ? `${fmt(act.mHp)} / ${fmt(m.hp)} ${$t('common.hp')}` : $t('combat.respawning') }}</div>
      <div class="bar thin" style="margin-top:8px;--c:#e0554b"><i :style="{ width: (alive ? act.mTimer / m.speed : 0) * 100 + '%' }" /></div>
      <div v-for="s in splats.filter(x => x.target === 'monster')" :key="s.id" class="splat" :class="{ miss: !s.dmg, merc: s.merc }">{{ s.dmg }}</div>
    </div>

    <div class="arena-meta">
      <span class="tag"><GameIcon :name="COMBAT_STYLES[state.combatStyle].icon" :size="12" /> {{ COMBAT_STYLES[state.combatStyle].name }}</span>
      <span class="tag">{{ $t('combat.accuracy', { v: pct(G.hitChance(ps.accRoll, mr.defRoll)) }) }}</span>
      <span class="tag">{{ $t('combat.maxHit', { v: ps.maxHit }) }}</span>
      <span class="tag">{{ $t('combat.hitsYou', { v: pct(G.hitChance(mr.accRoll, ps.defRoll)) }) }}</span>
      <span v-if="m.weak" class="tag" :class="m.weak === G.styleType() ? 'ok' : ''">{{ $t('combat.weakTo', { style: $t(`combat.types.${m.weak}`) }) }}</span>
      <span v-if="G.onTask(m)" class="tag arcane">{{ $t('combat.taskLeft', { n: state.slayer.task.left }) }}</span>
      <span v-if="dungeon" class="tag arcane">{{ dungeon.name }} · {{ act.room >= dungeon.rooms.length ? $t('combat.boss') : $t('combat.room', { n: act.room + 1, total: dungeon.rooms.length }) }} · {{ $t('combat.clears', { n: act.clears }) }}</span>
      <span v-if="state.prayer" class="tag ok">{{ $t('combat.prayerActive') }}</span>
      <span class="tag gold">{{ $t('combat.kills', { n: act.runKills }) }}</span>
    </div>
  </div>
</template>
