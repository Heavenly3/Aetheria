<script setup>
import { ref, computed } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ToggleButton from 'primevue/togglebutton'
import { G, state } from '../game/engine.js'
import { AREAS, BOSSES, MERCENARIES, DUNGEONS, MONSTERS, monsterLevel } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'
import Button from 'primevue/button'
import { QUESTS } from '../game/data/progression.js'
import { fmt } from '../game/format.js'
import CombatSettings from '../components/CombatSettings.vue'
import AbilityPanel from '../components/AbilityPanel.vue'
import Arena from '../components/Arena.vue'
import MonsterCard from '../components/MonsterCard.vue'
import { chanceNote } from '../ui/tips.js'
import ItemTile from '../components/ItemTile.vue'
import HelpTip from '../components/HelpTip.vue'

const tab = ref(state.activity?.kind === 'boss' ? 'bosses' : state.activity?.kind === 'dungeon' ? 'dungeons' : 'areas')
const inDungeon = id => state.activity?.type === 'combat' && state.activity.kind === 'dungeon' && state.activity.target === id
const pct = v => Math.round(v * 100) + '%'
const showArena = computed(() => state.activity?.type === 'combat' && state.activity.kind !== 'tower')
const hire = ref({ squire: false, archer: false, mage: false })
const hireCost = computed(() => MERCENARIES.filter(m => hire.value[m.id]).reduce((s, m) => s + m.cost, 0))
const questName = id => QUESTS.find(q => q.id === id)?.name

function fightBoss(b) {
  G.startCombat('boss', b.id, { mercs: MERCENARIES.filter(m => hire.value[m.id]).map(m => m.id) })
}
</script>

<template>
  <div>
    <CombatSettings />
    <div style="height:18px" />
    <AbilityPanel />
    <div style="height:18px" />
    <Arena v-if="showArena" />

    <Tabs v-model:value="tab">
      <TabList>
        <Tab value="areas">{{ $t('combat.tabs.areas') }}</Tab>
        <Tab value="bosses">{{ $t('combat.tabs.bosses') }}</Tab>
        <Tab value="dungeons">{{ $t('combat.tabs.dungeons') }}</Tab>
      </TabList>
      <TabPanels style="background:transparent;padding:18px 0 0">
        <TabPanel value="areas">
          <div v-for="area in AREAS" :key="area.id" class="area">
            <div class="row area-head">
              <ItemTile :icon="area.icon" tint="#6b5a3a" size="md" :tip="false" />
              <div class="grow">
                <div class="area-name">{{ area.name }}</div>
                <div class="small muted">{{ area.desc }} · {{ $t('combat.recommended', { n: area.recLvl }) }}</div>
              </div>
              <span v-if="!G.areaUnlocked(area)" class="tag bad"><i class="pi pi-lock" /> {{ $t('combat.questReq', { quest: questName(area.reqQuest) }) }}</span>
            </div>
            <div class="grid-cards">
              <MonsterCard v-for="m in area.monsters" :key="m.id" :monster="m" :locked="!G.areaUnlocked(area)" :lockText="$t('combat.areaLocked')"
                @fight="G.startCombat('area', m.id)" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="dungeons">
          <p class="intro">{{ $t('combat.dungeonIntro') }}</p>
          <div class="grid-wide">
            <div v-for="dg in DUNGEONS" :key="dg.id" class="card dungeon" :class="{ active: inDungeon(dg.id), locked: dg.reqQuest && !G.questDone(dg.reqQuest) }" style="--c:#e0554b">
              <div class="row">
                <ItemTile :icon="dg.icon" tint="#7a2a32" size="lg" :tip="false" />
                <div class="grow">
                  <div class="card-name">{{ dg.name }}</div>
                  <div class="card-sub">{{ dg.desc }}</div>
                </div>
              </div>
              <div class="row wrap" style="gap:5px">
                <span class="tag">{{ $t('combat.recommended', { n: dg.recLvl }) }}</span>
                <span class="tag gold">{{ $t('combat.clears', { n: state.dungeonsBy[dg.id] || 0 }) }}</span>
                <span v-if="dg.reqQuest && !G.questDone(dg.reqQuest)" class="tag bad"><i class="pi pi-lock" /> {{ $t('combat.questReq', { quest: questName(dg.reqQuest) }) }}</span>
              </div>
              <div class="rooms">
                <span v-for="(r, i) in dg.rooms" :key="i" class="room" :class="{ cur: inDungeon(dg.id) && state.activity.room === i, past: inDungeon(dg.id) && state.activity.room > i }"
                  v-tooltip.top="$t('combat.roomTip', { n: i + 1, monster: MONSTERS[r].name })"><ItemTile :icon="MONSTERS[r].icon" tint="#5a2a32" size="sm" :tip="false" /></span>
                <i class="pi pi-angle-right faint" />
                <span class="room boss" :class="{ cur: inDungeon(dg.id) && state.activity.room === dg.rooms.length }" v-tooltip.top="$t('combat.bossTip', { monster: dg.boss.name })">
                  <ItemTile :icon="dg.boss.icon" tint="#a0202a" size="sm" :tip="false" />
                </span>
              </div>
              <div class="row wrap" style="gap:5px">
                <span class="small faint">{{ $t('combat.chest') }}</span>
                <ItemTile v-for="c in dg.chest" :key="c.item" :item="c.item" size="xs" :note="chanceNote(c.chance)" />
              </div>
              <Button :label="inDungeon(dg.id) ? $t('combat.retreat') : $t('combat.enter')" :icon="inDungeon(dg.id) ? 'pi pi-flag' : 'pi pi-sign-in'" :severity="inDungeon(dg.id) ? 'danger' : undefined" fluid
                :disabled="!!dg.reqQuest && !G.questDone(dg.reqQuest) && !inDungeon(dg.id)" @click="inDungeon(dg.id) ? G.stop() : G.startCombat('dungeon', dg.id)" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="bosses">
          <div class="panel pad" style="margin-bottom:18px">
            <h3 class="panel-title">{{ $t('combat.mercsTitle') }} <HelpTip k="sections.mercs" /></h3>
            <p class="small muted" style="margin-top:0">{{ $t('combat.mercsIntro') }}</p>
            <div class="grid-cards">
              <div v-for="mc in MERCENARIES" :key="mc.id" class="merc row">
                <ItemTile :icon="mc.icon" tint="#6a3fbf" size="md" :tip="false" />
                <div class="grow">
                  <b>{{ mc.name }}</b>
                  <div class="small muted">{{ mc.desc }} {{ $t('combat.maxHit', { v: mc.maxHit }) }}</div>
                </div>
                <ToggleButton v-model="hire[mc.id]" :onLabel="fmt(mc.cost)" :offLabel="fmt(mc.cost)" onIcon="pi pi-check" offIcon="pi pi-wallet" size="small" />
              </div>
            </div>
            <div class="small" style="margin-top:12px">{{ $t('combat.hireCost') }} <b class="gold-text">{{ $t('inventory.goldAmount', { n: fmt(hireCost) }) }}</b></div>
          </div>
          <div class="grid-cards">
            <MonsterCard v-for="b in BOSSES" :key="b.id" :monster="b" kind="boss" :locked="!!b.reqQuest && !G.questDone(b.reqQuest)" :lockText="$t('combat.questReq', { quest: questName(b.reqQuest) })" @fight="fightBoss(b)">
              <div class="small muted" style="margin-top:8px">{{ $t('combat.recommended', { n: b.recLvl }) }} · {{ $t('combat.respawnIn', { n: b.respawn }) }}</div>
            </MonsterCard>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
.area { margin-bottom: 26px; }
.area-head { margin-bottom: 12px; }
.area-name { font-family: var(--font-display); font-size: 19px; }
.dungeon { display: flex; flex-direction: column; gap: 10px; }
.rooms { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.room { border-radius: 9px; padding: 2px; border: 1px solid transparent; }
.room.past { opacity: 0.4; }
.room.cur { border-color: var(--gold); box-shadow: 0 0 12px -2px rgba(226, 182, 90, 0.6); }
.merc { padding: 12px; border-radius: 12px; background: var(--tint-1); border: 1px solid var(--line); }
</style>
