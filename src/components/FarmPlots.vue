<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
import { BUILDINGS, BUILDING_IDS, HYBRIDS, SEASON_BONUS, FAVOURITE_SEASON, SOIL, hybridOf } from '../game/data/farm.js'
import { seasonOf } from '../game/data/weather.js'
import { fmt, fmtClock } from '../game/format.js'
import { play } from '../game/sound.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

const { t } = useI18n()
const pop = ref()
const seedQ = ref('')
const seedFilter = ref('all')
const seedOpts = computed(() => ['all', 'have', 'unlocked', 'herb', 'season'].map(value => ({ value, label: t(`farm.filters.${value}`) })))
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const target = ref(null)
const CROP_MAP = Object.fromEntries(CROPS.map(c => [c.id, c]))
const SEASON_ICON = { spring: 'sprout', summer: 'sun', autumn: 'oak', winter: 'ice-spell-cast' }

// A clock for the buildings' batches
const now = ref(Date.now())
let clock
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(clock))

const season = computed(() => (now.value, seasonOf()))
const inSeasonCrops = computed(() => CROPS.filter(c => FAVOURITE_SEASON[c.id] === season.value && (!c.hybrid || G.hybridKnown(c.id))))
const ready = computed(() => state.farm.plots.filter(p => p && p.t <= 0).length)
const empty = computed(() => state.farm.plots.filter(p => !p).length)
const pests = computed(() => state.farm.plots.filter(p => p?.event === 'pests').length)
// Hybrid seeds only show once discovered
const seeds = computed(() => CROPS.filter(c => !c.hybrid || G.hybridKnown(c.id) || G.qty(c.id + '_seed') > 0)
  .map(c => ({ c, have: G.qty(c.id + '_seed'), locked: G.level('farming') < c.lvl })))
const shownSeeds = computed(() => seeds.value.filter(s => {
  if (seedFilter.value === 'have' && !s.have) return false
  if (seedFilter.value === 'unlocked' && s.locked) return false
  if (seedFilter.value === 'herb' && !s.c.herb) return false
  if (seedFilter.value === 'season' && FAVOURITE_SEASON[s.c.id] !== season.value) return false
  return !seedQ.value.trim() || norm(s.c.name).includes(norm(seedQ.value.trim()))
}))
const nextPlots = computed(() => {
  const out = []
  if (G.room('garden') < 3) out.push(t('farm.unlockGreenhouse'))
  if (G.heroLevel() < 20) out.push(t('farm.unlockHero', { n: 20 }))
  else if (G.heroLevel() < 50) out.push(t('farm.unlockHero', { n: 50 }))
  return out
})
// A plot that could cross with its neighbour when harvested
const crossable = i => {
  const p = state.farm.plots[i]
  return !!p && [i - 1, i + 1].some(j => state.farm.plots[j] && hybridOf(p.crop, state.farm.plots[j].crop))
}

function openSeeds(e, i) { target.value = i; pop.value.toggle(e) }
function plantSeed(c) {
  if (target.value === 'all') { const n = G.plantAll(c.id); if (n) G.toast(c.icon, 'farm.planted', { n, crop: '@crop:' + c.id }, 'success') }
  else G.plant(target.value, c.id)
  pop.value.hide()
}
function harvest(i) {
  const r = G.harvest(i, state.farm.auto)
  if (!r) return
  G.toast(ITEMS[r.item].icon, r.event === 'bountiful' ? 'farm.harvestedBountiful' : 'farm.harvested', { n: r.n, item: '@item:' + r.item }, r.event === 'bountiful' ? 'rare' : 'success')
}
function fertilize(i, kind) { if (G.fertilize(i, kind)) G.toast('fertilizer-bag', 'farm.fertilized', { item: '@item:' + kind }, 'success') }
function shoo(i) { if (G.shoo(i)) { play('coin'); G.toast('farmer', 'farm.shooed', {}, 'success') } }
function shooAll() { state.farm.plots.forEach((p, i) => { if (p?.event === 'pests') G.shoo(i) }); play('coin') }
function harvestAll() {
  const n = G.harvestAll()
  if (n) G.toast('sickle', 'farm.harvestedAll', { n }, 'success')
}

/* ---------- buildings ---------- */
const costText = c => Object.entries(c).map(([k, v]) => (k === 'gold' ? `${fmt(v)} ${t('common.gold')}` : `${v}× ${ITEMS[k].name}`)).join(' · ')
function build(id) { if (G.buildFarm(id)) { play('level'); G.toast(BUILDINGS[id].icon, 'farm.built', { name: '@building:' + id, n: G.building(id) }, 'success') } }
function collect(id) {
  const got = G.collectFarm(id)
  if (got) { play('coin'); G.toast(BUILDINGS[id].icon, 'farm.collected', { items: Object.entries(got).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ') }, 'success') }
}
const buildingEffect = id => {
  const l = Math.max(1, G.building(id))
  if (id === 'scarecrow') return t('farm.buildings.scarecrow.effect', { n: Math.round(Math.min(1, l * 0.34) * 100) })
  if (id === 'well') return t('farm.buildings.well.effect', { n: Math.round(l * BUILDINGS.well.speed * 100) })
  return t(`farm.buildings.${id}.effect`, { min: Math.round(BUILDINGS[id].every / l / 60000) })
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
        <Button v-if="pests" :label="$t('farm.shooAll', { n: pests })" icon="pi pi-megaphone" size="small" severity="danger" outlined @click="shooAll" />
        <Button :label="$t('farm.plantEmpty')" icon="pi pi-plus" size="small" severity="secondary" :disabled="!empty" @click="openSeeds($event, 'all')" />
        <Button :label="$t('farm.harvestN', { n: ready })" icon="pi pi-check" size="small" :disabled="!ready" @click="harvestAll" />
      </div>
      <div class="season row wrap">
        <span class="tag gold"><GameIcon :name="SEASON_ICON[season]" :size="12" /> {{ $t('farm.season', { season: $t(`weather.seasons.${season}`) }) }}</span>
        <span class="small muted">{{ $t('farm.inSeason', { v: Math.round(SEASON_BONUS * 100) }) }}</span>
        <span v-for="c in inSeasonCrops" :key="c.id" class="row small season-crop"><ItemTile :item="c.id" size="xs" /> {{ c.name }}</span>
      </div>
    </div>

    <div class="plots">
      <div v-for="(p, i) in state.farm.plots" :key="i" class="plot" :class="{ ready: p && p.t <= 0, growing: p && p.t > 0, bountiful: p?.event === 'bountiful', pests: p?.event === 'pests' }">
        <div class="plot-num">{{ $t('farm.plot', { n: i + 1 }) }}</div>
        <div v-if="p" class="plot-tags">
          <span v-if="p.soil" class="ptag soil" v-tooltip.top="$t(`farm.soil${p.soil}`)"><GameIcon name="fertilizer-bag" :size="11" />{{ p.soil > 1 ? '+' : '' }}</span>
          <span v-if="G.inSeason(p.crop)" class="ptag season" v-tooltip.top="$t('farm.inSeasonTag', { v: Math.round(SEASON_BONUS * 100) })"><GameIcon :name="SEASON_ICON[season]" :size="11" /></span>
          <span v-if="crossable(i)" class="ptag cross" v-tooltip.top="$t('farm.crossTip')"><GameIcon name="sparkles" :size="11" /></span>
        </div>
        <template v-if="p">
          <div class="plant" :style="{ transform: `scale(${0.55 + 0.45 * (1 - p.t / p.total)})` }">
            <ItemTile :icon="p.t <= 0 ? CROP_MAP[p.crop].icon : 'sprout'" :tint="CROP_MAP[p.crop].tint" size="lg" :tip="false" />
          </div>
          <b class="plot-name">{{ CROP_MAP[p.crop].name }}</b>
          <div v-if="p.event === 'bountiful'" class="event good small"><GameIcon name="sparkles" :size="12" /> {{ $t('farm.bountiful') }}</div>
          <div v-else-if="p.event === 'pests'" class="event bad small">
            <GameIcon name="raven" :size="12" /> {{ $t('farm.pests') }}
            <Button :label="$t('farm.shoo')" size="small" severity="danger" text @click="shoo(i)" />
          </div>
          <template v-if="p.t > 0">
            <div class="bar" :style="{ '--c': CROP_MAP[p.crop].tint }" style="width:100%"><i :style="{ width: (1 - p.t / p.total) * 100 + '%' }" /></div>
            <span class="small muted tnum">{{ fmtClock(p.t) }}</span>
            <div class="row" style="gap:2px">
              <Button v-for="kind in Object.keys(SOIL)" v-show="G.canFertilize(i, kind)" :key="kind" size="small" text
                v-tooltip.top="$t(`farm.${kind}Tip`)" @click="fertilize(i, kind)">
                <ItemTile :item="kind" size="xs" :tip="false" /> {{ G.qty(kind) }}
              </Button>
            </div>
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

    <!-- The farmyard: coop, hive, scarecrow and well -->
    <div class="section-title">{{ $t('farm.yard') }} <HelpTip k="sections.farmYard" /></div>
    <div class="grid-wide">
      <div v-for="id in BUILDING_IDS" :key="id" class="card building" :class="{ locked: !G.building(id) }">
        <div class="row">
          <ItemTile :icon="BUILDINGS[id].icon" :tint="G.building(id) ? '#6b8a3a' : '#2a2838'" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ $t(`farm.buildings.${id}.name`) }} <span v-if="G.building(id)" class="small muted">· {{ $t('common.levelN', { n: G.building(id) }) }}</span></div>
            <div class="card-sub">{{ buildingEffect(id) }}</div>
          </div>
        </div>
        <template v-if="BUILDINGS[id].every && G.building(id)">
          <div class="row small" style="margin-top:10px">
            <span class="grow muted">{{ $t('farm.stored', { n: G.farmReady(id, now), max: BUILDINGS[id].store * G.building(id) }) }}</span>
            <span class="faint tnum">{{ $t('farm.nextBatch', { time: fmtClock(G.farmNext(id, now) / 1000) }) }}</span>
          </div>
          <div class="row wrap" style="gap:4px;margin-top:6px">
            <ItemTile v-for="(_, k) in BUILDINGS[id].makes" :key="k" :item="k" size="xs" />
          </div>
          <Button :label="$t('farm.collect')" icon="pi pi-download" size="small" fluid style="margin-top:10px" :disabled="!G.farmReady(id, now)" @click="collect(id)" />
        </template>
        <div v-if="G.buildCost(id)" class="small muted" style="margin-top:10px">{{ costText(G.buildCost(id)) }}</div>
        <Button v-if="G.buildCost(id)" :label="G.building(id) ? $t('farm.upgrade') : $t('farm.build')" icon="pi pi-hammer" size="small" fluid severity="secondary" outlined
          style="margin-top:8px" :disabled="!G.canBuildFarm(id)" @click="build(id)" />
        <span v-else class="tag ok" style="margin-top:10px">{{ $t('farm.maxed') }}</span>
      </div>
    </div>

    <!-- The almanac of hybrids -->
    <div class="section-title">{{ $t('farm.almanac', { n: G.hybridsKnown(), total: HYBRIDS.length }) }} <HelpTip k="sections.hybrids" /></div>
    <div class="grid-wide">
      <div v-for="h in HYBRIDS" :key="h.id" class="card hybrid" :class="{ known: G.hybridKnown(h.id) }">
        <div class="row" style="gap:8px">
          <ItemTile :item="h.parents[0]" size="sm" />
          <b class="muted">+</b>
          <ItemTile :item="h.parents[1]" size="sm" />
          <b class="muted">=</b>
          <ItemTile v-if="G.hybridKnown(h.id)" :item="h.id" size="sm" />
          <ItemTile v-else icon="perspective-dice-six-faces-random" tint="#2a2838" size="sm" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ G.hybridKnown(h.id) ? CROP_MAP[h.id].name : '???' }}</div>
            <div class="card-sub">{{ G.hybridKnown(h.id) ? $t(`farm.hybridUse.${h.id}`) : $t('farm.hybridHint') }}</div>
          </div>
        </div>
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
          <span class="tag" :class="{ ok: FAVOURITE_SEASON[c.id] === season }"><GameIcon :name="SEASON_ICON[FAVOURITE_SEASON[c.id]]" :size="11" /> {{ $t(`weather.seasons.${FAVOURITE_SEASON[c.id]}`) }}</span>
          <span v-if="c.hybrid" class="tag arcane"><GameIcon name="sparkles" :size="11" /> {{ $t('farm.hybridTag') }}</span>
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
          <GameIcon v-if="FAVOURITE_SEASON[c.id] === season" :name="SEASON_ICON[season]" :size="12" class="ok-text" />
          <span class="small muted tnum">{{ locked ? $t('common.lvlShort', { n: c.lvl }) : '×' + fmt(have) }}</span>
        </button>
        <div v-if="!seeds.some(s => s.have > 0)" class="small muted">{{ $t('farm.noSeeds') }}</div>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.farm-bar { margin-bottom: 18px; }
.season { gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.season-crop { gap: 4px; color: var(--ink-2); }
.plots { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.plot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 14px; border-radius: 16px; min-height: 200px; justify-content: center;
  background: linear-gradient(180deg, rgba(70, 52, 32, 0.25), rgba(40, 30, 20, 0.35)), var(--panel); border: 1px solid rgba(160, 120, 70, 0.25); }
.plot.ready { border-color: rgba(98, 193, 126, 0.6); box-shadow: 0 0 24px -8px rgba(98, 193, 126, 0.6); }
.plot.bountiful { border-color: rgba(246, 196, 83, 0.7); box-shadow: 0 0 26px -8px rgba(246, 196, 83, 0.8); }
.plot.pests { border-color: rgba(224, 85, 75, 0.6); }
.plot.locked { opacity: 0.5; border-style: dashed; color: var(--faint); }
.plot-num { position: absolute; top: 10px; inset-inline-start: 12px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); }
.plot-tags { position: absolute; top: 8px; inset-inline-end: 10px; display: flex; gap: 4px; }
.ptag { display: inline-flex; align-items: center; gap: 1px; padding: 2px 5px; border-radius: 999px; font-size: 10px; background: var(--tint-2); }
.ptag.soil { color: #a8d84a; }
.ptag.season { color: var(--tag-ok); }
.ptag.cross { color: #c9b0ff; }
.event { display: flex; align-items: center; gap: 4px; }
.event.good { color: #f6c453; }
.event.bad { color: var(--tag-bad); }
.plant { transition: transform 1s ease; margin-top: 10px; }
.plot-name { font-size: 14px; }
.plot-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px; border: 0; background: none; color: var(--muted); font: inherit; cursor: pointer; border-radius: 12px; }
.plot-empty:hover { color: var(--gold-hi); background: rgba(226, 182, 90, 0.06); }
.building.locked :deep(.tile) { filter: grayscale(0.8); }
.hybrid:not(.known) { opacity: 0.75; }
.hybrid.known { border-color: rgba(201, 176, 255, 0.4); }
.seed-pop { width: 280px; max-height: 360px; overflow-y: auto; }
.seed-opt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px; border-radius: 10px; border: 0; background: none; color: var(--ink); font: inherit; cursor: pointer; text-align: start; }
.seed-opt:hover:not(:disabled) { background: var(--tint-2); }
.seed-opt:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
