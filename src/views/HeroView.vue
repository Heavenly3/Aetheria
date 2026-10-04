<script setup>
import { ref, computed } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Badge from 'primevue/badge'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS, SLOTS, STAT_LABELS } from '../game/data/items.js'
import { BLESSINGS } from '../game/data/progression.js'
import { ROLES, DIFFICULTIES, TOOL_TYPES } from '../game/data/character.js'
import { DRINKS } from '../game/data/tavern.js'
import { PRAYERS, GRACE_SPEED } from '../game/data/extras.js'
import { fmt, fmtTime, fmtClock, fmtHour } from '../game/format.js'
import { tm } from '../i18n/index.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import AttributesPanel from '../components/AttributesPanel.vue'
import TalentsPanel from '../components/TalentsPanel.vue'

const tab = ref('overview')
const b = computed(() => G.bonuses())
const ps = computed(() => G.playerStats(null))
const activeBlessings = computed(() => BLESSINGS.filter(x => G.blessed(x.id)))
const drink = computed(() => (state.tavern.drink ? DRINKS.find(d => d.id === state.tavern.drink.id) : null))
const prayer = computed(() => PRAYERS.find(p => p.id === state.prayer) || null)
const ev = computed(() => G.currentEvent())
const anyEffect = computed(() => activeBlessings.value.length || state.buffs.potion || state.buffs.elixir > 0 || drink.value || prayer.value || (ev.value && state.event) || state.grace)
const statRows = computed(() => Object.entries(STAT_LABELS).map(([k, l]) => ({ k, l, v: k === 'mDmg' ? `+${Math.round(b.value[k] * 100)}%` : `+${b.value[k]}` })))
const role = computed(() => ROLES[state.role])
const diff = computed(() => DIFFICULTIES[state.difficulty])
</script>

<template>
  <Tabs v-model:value="tab">
    <TabList>
      <Tab value="overview">{{ $t('hero.tabs.overview') }}</Tab>
      <Tab value="attributes">{{ $t('hero.tabs.attributes') }} <Badge v-if="G.attrPoints()" :value="G.attrPoints()" size="small" style="margin-inline-start:6px" /></Tab>
      <Tab value="talents">{{ $t('hero.tabs.talents') }} <Badge v-if="G.talentPoints()" :value="G.talentPoints()" severity="info" size="small" style="margin-inline-start:6px" /></Tab>
    </TabList>
    <TabPanels style="background:transparent;padding:18px 0 0">
      <TabPanel value="overview">
        <div class="hero-layout">
          <div class="stack">
            <div class="panel pad">
              <div class="avatar" :style="{ '--t': state.tint }"><ItemTile :icon="state.avatar" :tint="state.tint" size="xl" :tip="false" /></div>
              <div class="hero-name">{{ state.name }}</div>
              <div class="row" style="justify-content:center;gap:6px;margin:6px 0 14px">
                <span class="tag" :style="{ color: role.color }"><GameIcon :name="role.icon" :size="13" /> {{ role.name }}</span>
                <span class="tag" :style="{ color: diff.color }">{{ diff.name }}</span>
              </div>
              <div class="row small" style="margin-bottom:6px">
                <span class="grow muted">{{ $t('hero.heroLevel') }} <b class="gold-text">{{ G.heroLevel() }}</b></span>
                <span class="muted tnum">{{ Math.round(G.heroProgress() * 100) }}%</span>
              </div>
              <div class="bar"><i :style="{ width: G.heroProgress() * 100 + '%' }" /></div>
              <div class="row small" style="margin:12px 0 6px">
                <span class="grow muted">{{ $t('stats.hitpoints') }}</span>
                <span class="muted tnum">{{ Math.max(0, state.hp) }} / {{ G.maxHp() }}</span>
              </div>
              <div class="bar hp-ok"><i :style="{ width: (Math.max(0, state.hp) / G.maxHp()) * 100 + '%' }" /></div>
              <div class="row" style="justify-content:center;gap:16px;margin-top:14px">
                <span class="small muted">{{ $t('stats.combatLevel') }} <b class="gold-text">{{ G.combatLevel() }}</b></span>
                <span class="small muted">{{ $t('stats.totalLevel') }} <b class="gold-text">{{ G.totalLevel() }}</b></span>
              </div>

              <div class="section-title" style="margin-top:20px">{{ $t('hero.equipment') }}</div>
              <div class="equip-grid">
                <template v-for="(s, slot) in SLOTS" :key="slot">
                  <button v-if="state.equipment[slot]" class="equip-slot filled" v-tooltip.top="$t('hero.clickToRemove')" @click="G.unequip(slot)">
                    <ItemTile :item="state.equipment[slot]" size="sm" :tip="false" :qty="ITEMS[state.equipment[slot]].stackEquip ? G.qty(state.equipment[slot]) : null" />
                    <div class="grow"><div class="slot-name">{{ s.name }}</div><div class="slot-item">{{ ITEMS[state.equipment[slot]].name }}</div></div>
                  </button>
                  <div v-else class="equip-slot">
                    <ItemTile :icon="s.icon" size="sm" empty :tip="false" />
                    <div class="grow"><div class="slot-name">{{ s.name }}</div><div class="slot-item faint">{{ $t('hero.empty') }}</div></div>
                  </div>
                </template>
              </div>
              <div class="section-title" style="margin-top:20px">{{ $t('hero.tools') }}</div>
              <div class="equip-grid tools">
                <template v-for="(t, type) in TOOL_TYPES" :key="type">
                  <button v-if="state.tools[type]" class="equip-slot filled" v-tooltip.top="$t('hero.clickToRemove')" @click="G.unequipTool(type)">
                    <ItemTile :item="state.tools[type]" size="sm" :tip="false" />
                    <div class="grow"><div class="slot-name">{{ $t('hero.toolTier', { tool: t.name, n: G.toolTier(type) }) }}</div><div class="slot-item">{{ ITEMS[state.tools[type]].name }}</div></div>
                  </button>
                  <div v-else class="equip-slot">
                    <ItemTile :icon="t.icon" size="sm" empty :tip="false" />
                    <div class="grow"><div class="slot-name">{{ t.name }}</div><div class="slot-item faint">{{ $t('hero.noTool') }}</div></div>
                  </div>
                </template>
              </div>
            </div>

            <div class="panel pad">
              <h3 class="panel-title"><GameIcon name="checked-shield" /> {{ $t('hero.gearBonuses') }}</h3>
              <div v-for="r in statRows" :key="r.k" class="kv"><span>{{ r.l }}</span><b>{{ r.v }}</b></div>
              <div class="kv"><span>{{ $t('hero.maxHitCurrent') }}</span><b class="gold-text">{{ ps.maxHit }}</b></div>
            </div>
          </div>

          <div class="stack" style="gap:0">
            <div v-if="anyEffect" class="panel pad" style="margin-bottom:18px">
              <h3 class="panel-title"><GameIcon name="sparkles" /> {{ $t('hero.activeEffects') }}</h3>
              <div class="row wrap">
                <span v-for="bl in activeBlessings" :key="bl.id" class="tag gold"><GameIcon :name="bl.icon" :size="13" /> {{ bl.name }} · {{ fmtClock(state.blessings[bl.id]) }}</span>
                <span v-if="state.buffs.potion" class="tag arcane"><GameIcon name="round-potion" :size="13" /> {{ ITEMS[state.buffs.potion.id].name }} · {{ fmtClock(state.buffs.potion.t) }}</span>
                <span v-if="drink" class="tag gold"><GameIcon :name="drink.icon" :size="13" /> {{ drink.name }} · {{ fmtClock(state.tavern.drink.t) }}</span>
                <span v-if="prayer" class="tag ok"><GameIcon :name="prayer.icon" :size="13" /> {{ $t('hero.inCombat', { name: prayer.name }) }}</span>
                <span v-if="ev && state.event" class="tag arcane"><GameIcon :name="ev.icon" :size="13" /> {{ ev.name }} · {{ fmtClock(state.event.t) }}</span>
                <span v-if="state.grace" class="tag ok"><GameIcon name="star-swirl" :size="13" /> {{ $t('hero.grace', { v: Math.round(state.grace * GRACE_SPEED * 100) }) }}</span>
                <span v-if="state.buffs.elixir > 0" class="tag gold"><GameIcon name="bubbling-flask" :size="13" /> {{ $t('hero.elixir') }} · {{ fmtClock(state.buffs.elixir) }}</span>
              </div>
            </div>

            <div class="section-title">{{ $t('hero.skills') }}</div>
            <div class="skills-grid">
              <router-link v-for="(s, id) in SKILLS" :key="id" :to="'/skill/' + id" class="skill-tile" :style="{ '--c': s.color }">
                <ItemTile :icon="s.icon" :tint="s.color" size="md" :tip="false" />
                <div class="grow">
                  <div class="row"><b class="grow">{{ s.name }}</b><b class="gold-text tnum">{{ G.level(id) }}</b></div>
                  <div class="bar thin" style="margin-top:7px"><i :style="{ width: G.levelProgress(id) * 100 + '%' }" /></div>
                  <div v-if="G.prestigeOf(id)" class="stars small" style="margin-top:4px"><GameIcon name="sparkles" :size="12" /> {{ G.prestigeOf(id) }}</div>
                </div>
              </router-link>
            </div>

            <div class="two-col" style="margin-top:30px">
              <div>
                <div class="section-title" style="margin-top:0">{{ $t('hero.diary') }}</div>
                <div class="panel pad diary">
                  <div v-for="(l, i) in state.log" :key="i" class="diary-row">
                    <GameIcon :name="l.icon" :size="16" />
                    <span class="grow">{{ tm(l) }}</span>
                    <span class="faint small tnum">{{ fmtHour(l.t) }}</span>
                  </div>
                  <div v-if="!state.log.length" class="muted small">{{ $t('hero.diaryEmpty') }}</div>
                </div>
              </div>
              <div>
                <div class="section-title" style="margin-top:0">{{ $t('hero.chronicle') }}</div>
                <div class="panel pad">
                  <div class="kv"><span>{{ $t('hero.playTime') }}</span><b>{{ fmtTime(state.stats.playTime) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.actions') }}</span><b>{{ fmt(state.stats.actions) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.harvests') }}</span><b>{{ fmt(state.stats.harvests || 0) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.kills') }}</span><b>{{ fmt(state.stats.kills) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.deaths') }}</span><b>{{ fmt(state.stats.deaths) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.goldEarned') }}</span><b class="gold-text">{{ fmt(state.stats.goldEarned) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.quests') }}</span><b>{{ G.questsDone() }}</b></div>
                  <div class="kv"><span>{{ $t('hero.towerBest') }}</span><b>{{ $t('tower.floorN', { n: state.tower.best }) }}</b></div>
                  <div class="kv"><span>{{ $t('hero.maxMastery') }}</span><b>{{ G.maxMastery() }}</b></div>
                  <div class="kv"><span>{{ $t('hero.offlineCap') }}</span><b>{{ $t('time.hours', { n: +G.offlineCapHours().toFixed(1) }) }}</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>
      <TabPanel value="attributes"><AttributesPanel /></TabPanel>
      <TabPanel value="talents"><TalentsPanel /></TabPanel>
    </TabPanels>
  </Tabs>
</template>

<style scoped>
.hero-layout { display: grid; grid-template-columns: 360px 1fr; gap: 18px; align-items: start; }
.avatar { display: grid; place-items: center; margin: 4px auto 12px; }
.avatar :deep(.tile) { border-radius: 50% !important; box-shadow: 0 0 0 2px rgba(226, 182, 90, 0.6), 0 0 0 7px rgba(226, 182, 90, 0.08), 0 16px 40px -10px rgba(226, 182, 90, 0.45); }
.hero-name { text-align: center; font-family: var(--font-display); font-size: 26px; }
.equip-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.equip-grid.tools { grid-template-columns: 1fr; }
.equip-slot { display: flex; align-items: center; gap: 10px; padding: 9px; border-radius: 12px; text-align: start; color: inherit; font: inherit;
  background: rgba(255, 255, 255, 0.025); border: 1px dashed rgba(255, 255, 255, 0.1); min-width: 0; }
.equip-slot.filled { border-style: solid; cursor: pointer; transition: border-color 0.18s; }
.equip-slot.filled:hover { border-color: var(--danger); }
.slot-name { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
.slot-item { font-size: 13px; font-weight: 500; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.skill-tile { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line);
  color: inherit; text-decoration: none; transition: transform 0.2s, border-color 0.2s; }
.skill-tile:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.diary { max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.diary-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed var(--line); font-size: 13.5px; }
.diary-row .gi { color: var(--gold); }
@media (max-width: 1100px) { .hero-layout { grid-template-columns: 1fr; } }
</style>
