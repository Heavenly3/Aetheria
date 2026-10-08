<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { TOWER_SHOP, towerMonster, monsterLevel } from '../game/data/combat.js'
import { fmt } from '../game/format.js'
import Arena from '../components/Arena.vue'
import CombatSettings from '../components/CombatSettings.vue'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

const inTower = computed(() => state.activity?.type === 'combat' && state.activity.kind === 'tower')
const startFloor = computed(() => Math.max(1, Math.floor(state.tower.best / 10) * 10 + 1))
const preview = computed(() => [0, 1, 2, 3, 4].map(i => towerMonster((inTower.value ? state.activity.floor : startFloor.value) + i)))
function buy(it) {
  if (G.buyTower(it.id)) G.toast(it.icon, 'common.bought', { name: it.name }, 'success')
}
</script>

<template>
  <div>
    <div class="banner" style="--c:#e2b65a">
      <GameIcon class="banner-ghost" name="stone-tower" :size="230" />
      <ItemTile icon="stone-tower" tint="#c9a04a" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ $t('tower.title') }}</h1>
        <div class="banner-desc">{{ $t('tower.desc') }}</div>
        <div class="row wrap">
          <span class="tag gold">{{ $t('tower.best', { n: state.tower.best }) }}</span>
          <span class="tag">{{ $t('tower.startAt', { n: startFloor }) }}</span>
          <span class="tag gold"><GameIcon name="two-coins" :size="12" /> {{ $t('tower.tokens', { n: fmt(state.tower.tokens) }) }}</span>
        </div>
      </div>
      <Button :label="inTower ? $t('tower.leave') : $t('tower.enter')" :icon="inTower ? 'pi pi-flag' : 'pi pi-arrow-up'" :severity="inTower ? 'danger' : undefined"
        @click="inTower ? G.stop() : G.startCombat('tower')" />
    </div>

    <div style="height:18px" />
    <Arena v-if="inTower" />
    <CombatSettings />

    <div class="section-title">{{ $t('tower.next') }} <HelpTip k="sections.towerNext" /></div>
    <div class="floors">
      <div v-for="m in preview" :key="m.floor" class="card floor" :class="{ active: inTower && state.activity.floor === m.floor }" style="--c:#e2b65a">
        <div class="small muted">{{ $t('tower.floorN', { n: m.floor }) }}</div>
        <ItemTile :icon="m.icon" :tint="m.floor % 10 === 0 ? '#c0392b' : '#6b4a2a'" size="lg" :tip="false" style="margin:8px auto" />
        <div class="card-name small" style="text-align:center">{{ m.name }}</div>
        <div class="small muted tnum" style="text-align:center;margin-top:4px">{{ $t('common.lvlShort', { n: monsterLevel(m) }) }} · {{ $t('tower.hp', { n: m.hp }) }}</div>
      </div>
    </div>

    <div class="section-title">{{ $t('tower.shop') }} <HelpTip k="sections.towerShop" /></div>
    <div class="grid-wide">
      <div v-for="it in TOWER_SHOP" :key="it.id" class="card">
        <div class="row">
          <ItemTile :icon="it.icon" tint="#c9a04a" size="md" :tip="false" />
          <div class="grow"><div class="card-name">{{ it.name }}</div><div class="card-sub">{{ it.desc }}</div></div>
        </div>
        <Button :label="$t('tower.tokens', { n: it.cost })" icon="pi pi-shopping-cart" fluid style="margin-top:14px" :disabled="state.tower.tokens < it.cost" @click="buy(it)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.floors { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.floor { text-align: center; }
@media (max-width: 900px) { .floors { grid-template-columns: repeat(2, 1fr); } }
</style>
