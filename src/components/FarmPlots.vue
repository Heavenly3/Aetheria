<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Popover from 'primevue/popover'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { CROPS, ITEMS } from '../game/data/items.js'
import { fmt, fmtClock } from '../game/format.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

const { t } = useI18n()
const pop = ref()
const seedQ = ref('')
const seedFilter = ref('all')
const seedOpts = computed(() => ['all', 'have', 'unlocked', 'herb'].map(value => ({ value, label: t(`farm.filters.${value}`) })))
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const target = ref(null)
const CROP_MAP = Object.fromEntries(CROPS.map(c => [c.id, c]))
const ready = computed(() => state.farm.plots.filter(p => p && p.t <= 0).length)
const empty = computed(() => state.farm.plots.filter(p => !p).length)
const seeds = computed(() => CROPS.map(c => ({ c, have: G.qty(c.id + '_seed'), locked: G.level('farming') < c.lvl })))
const shownSeeds = computed(() => seeds.value.filter(s => {
  if (seedFilter.value === 'have' && !s.have) return false
  if (seedFilter.value === 'unlocked' && s.locked) return false
  if (seedFilter.value === 'herb' && !s.c.herb) return false
  return !seedQ.value.trim() || norm(s.c.name).includes(norm(seedQ.value.trim()))
}))
const nextPlots = computed(() => {
  const out = []
  if (G.room('garden') < 3) out.push(t('farm.unlockGreenhouse'))
  if (G.heroLevel() < 20) out.push(t('farm.unlockHero', { n: 20 }))
  else if (G.heroLevel() < 50) out.push(t('farm.unlockHero', { n: 50 }))
  return out
})

function openSeeds(e, i) { target.value = i; pop.value.toggle(e) }
function plantSeed(c) {
  if (target.value === 'all') { const n = G.plantAll(c.id); if (n) G.toast(c.icon, 'farm.planted', { n, crop: '@crop:' + c.id }, 'success') }
  else G.plant(target.value, c.id)
  pop.value.hide()
}
function harvest(i) {
  const r = G.harvest(i, state.farm.auto)
  if (r) G.toast(ITEMS[r.item].icon, 'farm.harvested', { n: r.n, item: '@item:' + r.item }, 'success')
}
function fertilize(i) {
  const p = state.farm.plots[i]
  if (!p || p.t <= 0 || G.qty('compost') <= 0) return
  G.removeItem('compost', 1)
  p.t = p.t / 2
  G.toast('fertilizer-bag', 'farm.fertilized', {}, 'success')
}
function harvestAll() {
  const n = G.harvestAll()
  if (n) G.toast('sickle', 'farm.harvestedAll', { n }, 'success')
}
</script>

<template>
  <div>
    <div class="panel pad farm-bar">
      <div class="row wrap">
        <div class="grow">
          <h3 class="panel-title" style="margin:0"><GameIcon name="plant-watering" /> {{ $t('farm.title') }} <HelpTip k="sections.farm" /></h3>
          <div class="small muted" style="margin-top:4px">{{ $t('farm.intro') }}</div>
        </div>
        <label class="row small" for="farm-auto" style="gap:8px;cursor:pointer">
          <ToggleSwitch v-model="state.farm.auto" inputId="farm-auto" />
          {{ $t('farm.auto') }}
        </label>
        <Button :label="$t('farm.plantEmpty')" icon="pi pi-plus" size="small" severity="secondary" :disabled="!empty" @click="openSeeds($event, 'all')" />
        <Button :label="$t('farm.harvestN', { n: ready })" icon="pi pi-check" size="small" :disabled="!ready" @click="harvestAll" />
      </div>
    </div>

    <div class="plots">
      <div v-for="(p, i) in state.farm.plots" :key="i" class="plot" :class="{ ready: p && p.t <= 0, growing: p && p.t > 0 }">
        <div class="plot-num">{{ $t('farm.plot', { n: i + 1 }) }}</div>
        <template v-if="p">
          <div class="plant" :style="{ transform: `scale(${0.55 + 0.45 * (1 - p.t / p.total)})` }">
            <ItemTile :icon="p.t <= 0 ? CROP_MAP[p.crop].icon : 'sprout'" :tint="CROP_MAP[p.crop].tint" size="lg" :tip="false" />
          </div>
          <b class="plot-name">{{ CROP_MAP[p.crop].name }}</b>
          <template v-if="p.t > 0">
            <div class="bar" :style="{ '--c': CROP_MAP[p.crop].tint }" style="width:100%"><i :style="{ width: (1 - p.t / p.total) * 100 + '%' }" /></div>
            <span class="small muted tnum">{{ fmtClock(p.t) }}</span>
            <Button v-if="G.qty('compost') > 0" :label="$t('farm.fertilize', { n: G.qty('compost') })" icon="pi pi-bolt" size="small" text @click="fertilize(i)" />
          </template>
          <Button v-else :label="$t('farm.harvest')" icon="pi pi-check" size="small" fluid @click="harvest(i)" />
        </template>
        <template v-else>
          <button class="plot-empty" @click="openSeeds($event, i)">
            <GameIcon name="plant-seed" :size="34" />
            <span>{{ $t('farm.plant') }}</span>
          </button>
        </template>
      </div>
      <div class="plot locked">
        <div class="plot-num">{{ $t('farm.morePlots') }}</div>
        <GameIcon name="padlock" :size="28" />
        <span class="small muted" style="text-align:center">{{ nextPlots.length ? $t('farm.unlockWith', { list: nextPlots.join(' / ') }) : $t('farm.allPlots') }}</span>
      </div>
    </div>

    <div class="section-title">{{ $t('farm.seeds') }} <HelpTip k="sections.seeds" /></div>
    <div class="row wrap" style="margin-bottom:14px">
      <IconField class="grow" style="min-width:200px">
        <InputIcon class="pi pi-search" />
        <InputText v-model="seedQ" :placeholder="$t('farm.search')" fluid id="seed-search" />
      </IconField>
      <SelectButton v-model="seedFilter" :options="seedOpts" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" />
    </div>
    <div class="grid-cards">
      <div v-for="{ c, have, locked } in shownSeeds" :key="c.id" class="card seed" :class="{ locked }" :style="{ '--c': c.tint }">
        <div class="row">
          <ItemTile :item="c.id + '_seed'" size="md" :tip="false" :qty="have" />
          <div class="grow">
            <div class="card-name">{{ c.name }}</div>
            <div class="card-sub"><template v-if="locked"><i class="pi pi-lock" style="font-size:11px" /> {{ $t('skill.requiresLevel', { n: c.lvl }) }}</template><template v-else>{{ $t('common.levelN', { n: c.lvl }) }}</template></div>
          </div>
        </div>
        <div class="row wrap" style="gap:6px;margin-top:12px">
          <span class="tag gold">+{{ fmt(c.harvestXp * G.xpMult('farming')) }} XP</span>
          <span class="tag"><i class="pi pi-clock" style="font-size:10px" /> {{ fmtClock(G.growTime(c)) }}</span>
          <span class="tag">{{ $t('farm.perHarvest', { min: c.yield[0], max: c.yield[1] }) }}</span>
          <span class="tag arcane">{{ $t('skill.masteryN', { n: G.masteryLevel('farming', c.id) }) }}</span>
        </div>
        <div class="bar thin" style="margin-top:10px;--c:#b38cff"><i :style="{ width: G.masteryProgress('farming', c.id) * 100 + '%' }" /></div>
      </div>
    </div>

    <div v-if="!shownSeeds.length" class="empty-state"><GameIcon name="plant-seed" :size="40" /><div>{{ $t('farm.noMatch') }}</div></div>

    <Popover ref="pop">
      <div class="seed-pop">
        <div class="small muted" style="margin-bottom:8px">{{ target === 'all' ? $t('farm.plantAllTitle') : $t('farm.plantOneTitle', { n: target + 1 }) }}</div>
        <button v-for="{ c, have, locked } in seeds.filter(s => s.have > 0)" :key="c.id" class="seed-opt" :disabled="locked" @click="plantSeed(c)">
          <ItemTile :item="c.id + '_seed'" size="sm" :tip="false" />
          <span class="grow">{{ c.name }}</span>
          <span class="small muted tnum">{{ locked ? $t('common.lvlShort', { n: c.lvl }) : '×' + fmt(have) }}</span>
        </button>
        <div v-if="!seeds.some(s => s.have > 0)" class="small muted">{{ $t('farm.noSeeds') }}</div>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.farm-bar { margin-bottom: 18px; }
.plots { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.plot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 14px; border-radius: 16px; min-height: 190px; justify-content: center;
  background: linear-gradient(180deg, rgba(70, 52, 32, 0.25), rgba(40, 30, 20, 0.35)), var(--panel); border: 1px solid rgba(160, 120, 70, 0.25); }
.plot.ready { border-color: rgba(98, 193, 126, 0.6); box-shadow: 0 0 24px -8px rgba(98, 193, 126, 0.6); }
.plot.locked { opacity: 0.5; border-style: dashed; color: var(--faint); }
.plot-num { position: absolute; top: 10px; inset-inline-start: 12px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); }
.plant { transition: transform 1s ease; margin-top: 10px; }
.plot-name { font-size: 14px; }
.plot-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px; border: 0; background: none; color: var(--muted); font: inherit; cursor: pointer; border-radius: 12px; }
.plot-empty:hover { color: var(--gold-hi); background: rgba(226, 182, 90, 0.06); }
.seed-pop { width: 280px; max-height: 360px; overflow-y: auto; }
.seed-opt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border-radius: 10px; border: 0; background: none; color: var(--ink); font: inherit; cursor: pointer; text-align: start; }
.seed-opt:hover:not(:disabled) { background: var(--tint-2); }
.seed-opt:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
