<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { MONSTERS, AREAS, SLAYER_SHOP, monsterLevel } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'
import { fmt } from '../game/format.js'
import SkillBanner from '../components/SkillBanner.vue'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'

const task = computed(() => state.slayer.task)
const m = computed(() => (task.value ? MONSTERS[task.value.monster] : null))
const area = computed(() => (m.value ? AREAS.find(a => a.id === m.value.area) : null))
const fighting = computed(() => state.activity?.type === 'combat' && state.activity.target === m.value?.id)
const candidates = computed(() => G.slayerCandidates())
function buy(it) {
  if (G.buySlayer(it.id)) G.toast(it.icon, 'common.bought', { name: it.name }, 'success')
}
</script>

<template>
  <div>
    <SkillBanner skill="slayer" />
    <div class="two-col" style="margin-top:20px">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="death-skull" /> {{ $t('slayer.current') }} <HelpTip k="sections.slayerTask" /></h3>
        <template v-if="task && m">
          <div class="row">
            <ItemTile :icon="m.icon" tint="#7a2a52" size="xl" :tip="false" />
            <div class="grow">
              <div class="card-name" style="font-size:20px">{{ m.name }}</div>
              <div class="small muted">{{ area.name }} · {{ $t('common.levelN', { n: monsterLevel(m) }) }}</div>
              <div class="bar thick" style="margin-top:12px;--c:#b5179e"><i :style="{ width: (1 - task.left / task.total) * 100 + '%' }" /></div>
              <div class="small muted tnum" style="margin-top:6px">{{ $t('slayer.left', { n: task.left, total: task.total }) }}</div>
            </div>
          </div>
          <div class="row wrap" style="margin-top:16px">
            <Button :label="fighting ? $t('combat.retreat') : $t('slayer.hunt')" :icon="fighting ? 'pi pi-flag' : 'pi pi-bolt'" :severity="fighting ? 'danger' : undefined"
              @click="G.startCombat('area', m.id)" />
            <Button :label="$t('slayer.viewArea')" icon="pi pi-map" severity="secondary" outlined @click="$router.push('/combat')" />
          </div>
          <p class="small muted" style="margin-bottom:0">{{ $t('slayer.explain') }}</p>
        </template>
        <template v-else>
          <p class="muted" style="margin-top:0">{{ $t('slayer.noTask', { lvl: G.combatLevel(), n: candidates.length }) }}</p>
          <Button :label="$t('slayer.newTask')" icon="pi pi-plus" @click="G.newSlayerTask()" />
        </template>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="medal" /> {{ $t('slayer.record') }} <HelpTip k="sections.slayerRecord" /></h3>
        <div class="kv"><span>{{ $t('slayer.points') }}</span><b class="gold-text">{{ fmt(state.slayer.points) }}</b></div>
        <div class="kv"><span>{{ $t('slayer.completed') }}</span><b>{{ state.slayer.completed }}</b></div>
        <div class="kv"><span>{{ $t('slayer.streak') }}</span><b>{{ state.slayer.streak }}</b></div>
        <div class="kv"><span>{{ $t('slayer.nextBonus') }}</span><b>{{ $t('slayer.inTasks', { n: 10 - (state.slayer.streak % 10) }) }}</b></div>
      </div>
    </div>

    <div class="section-title">{{ $t('slayer.shop') }} <HelpTip k="sections.slayerShop" /></div>
    <div class="grid-wide">
      <div v-for="it in SLAYER_SHOP" :key="it.id" class="card">
        <div class="row">
          <ItemTile :icon="it.icon" :item="it.item || null" tint="#b5179e" size="md" :tip="false" />
          <div class="grow"><div class="card-name">{{ it.name }}</div><div class="card-sub">{{ it.desc }}</div></div>
        </div>
        <Button :label="$t('slayer.cost', { n: it.cost })" icon="pi pi-shopping-cart" fluid style="margin-top:14px" :disabled="state.slayer.points < it.cost || (it.id === 'skip' && !task)" @click="buy(it)" />
      </div>
    </div>
  </div>
</template>
