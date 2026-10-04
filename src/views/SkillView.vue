<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ACTIONS } from '../game/data/actions.js'
import { ITEMS } from '../game/data/items.js'
import SkillBanner from '../components/SkillBanner.vue'
import ActionCard from '../components/ActionCard.vue'
import ActionRow from '../components/ActionRow.vue'
import GameIcon from '../components/GameIcon.vue'
import FarmPlots from '../components/FarmPlots.vue'
import ItemTile from '../components/ItemTile.vue'
import { GRACE_COSTS, GRACE_SPEED } from '../game/data/extras.js'
import { intlLocale } from '../i18n/index.js'

const { t } = useI18n()
function buyGrace() { if (G.buyGrace()) G.toast('star-swirl', 'skill.graceBought', { v: Math.round(GRACE_SPEED * 100) }, 'success') }

const route = useRoute()
const skill = computed(() => route.params.id)
const s = computed(() => SKILLS[skill.value])
const all = computed(() => ACTIONS[skill.value] || [])

/* ---------------- Filters (remembered per skill, except the search text) ---------------- */
const DEFAULTS = { group: 'all', mat: 'all', status: 'all', sort: 'lvl', view: 'cards' }
const f = reactive({ q: '', ...DEFAULTS })
const key = () => 'aetheria-filters-' + skill.value
watch(skill, () => {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(key()) || '{}') } catch { /* storage unavailable */ }
  Object.assign(f, { q: '', ...DEFAULTS, ...saved })
}, { immediate: true })
watch(() => [f.group, f.mat, f.status, f.sort, f.view], () => {
  try { localStorage.setItem(key(), JSON.stringify({ group: f.group, mat: f.mat, status: f.status, sort: f.sort, view: f.view })) } catch { /* storage unavailable */ }
})

const statusOpts = computed(() => ['all', 'ready', 'unlocked', 'locked'].map(value => ({ value, label: t('filters.status.' + value) })))
const sortOpts = computed(() => ['lvl', 'xph', 'name', 'mastery'].map(value => ({ value, label: t('filters.sort.' + value) })))
const viewOpts = computed(() => [{ icon: 'pi pi-th-large', value: 'cards', label: t('filters.cards') }, { icon: 'pi pi-list', value: 'list', label: t('filters.list') }])
const DEFAULT_GROUP = 'groups.actions'
const groupOf = a => a.group || DEFAULT_GROUP

const groupNames = computed(() => [...new Set(all.value.map(groupOf))])
const mats = computed(() => [...new Set(all.value.filter(a => a.mat).map(a => a.mat))])
const count = pred => all.value.filter(pred).length

const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const matches = (a, q) => norm(a.name).includes(q)
  || [...Object.keys(a.in), ...Object.keys(a.out)].some(k => norm(ITEMS[k].name).includes(q))
const xph = a => (a.xp * 3600) / G.actionTime(skill.value, a)

const filtered = computed(() => {
  const q = norm(f.q.trim())
  let list = all.value.filter(a => {
    if (f.group !== 'all' && groupOf(a) !== f.group) return false
    if (f.mat !== 'all' && a.mat !== f.mat) return false
    if (f.status === 'ready' && !G.canDo(skill.value, a)) return false
    if (f.status === 'unlocked' && G.level(skill.value) < a.lvl) return false
    if (f.status === 'locked' && G.level(skill.value) >= a.lvl && G.hasTool(a)) return false
    return !q || matches(a, q)
  })
  if (f.sort === 'xph') list = [...list].sort((a, b) => xph(b) - xph(a))
  else if (f.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, intlLocale()))
  else if (f.sort === 'mastery') list = [...list].sort((a, b) => G.masteryLevel(skill.value, b.id) - G.masteryLevel(skill.value, a.id))
  return list
})
// Sorting by level keeps the sections; any other order shows one flat list
const sections = computed(() => {
  if (f.sort !== 'lvl') return [{ name: null, actions: filtered.value }]
  const out = []
  filtered.value.forEach(a => {
    const g = groupOf(a)
    let sec = out.find(x => x.name === g)
    if (!sec) out.push((sec = { name: g, actions: [] }))
    sec.actions.push(a)
  })
  return out
})
const dirty = computed(() => f.q || f.group !== 'all' || f.mat !== 'all' || f.status !== 'all')
const clear = () => Object.assign(f, { q: '', group: 'all', mat: 'all', status: 'all' })

</script>

<template>
  <div v-if="s">
    <SkillBanner :skill="skill" />
    <template v-if="s.cat === 'combat'">
      <div class="panel pad" style="margin-top:20px">
        <h3 class="panel-title"><GameIcon :name="s.icon" /> {{ $t('skill.howToTrain', { skill: s.name }) }}</h3>
        <p class="muted" style="margin-top:0">{{ $t('skill.combatHelp.' + skill) }}</p>
        <Button :label="skill === 'slayer' ? $t('skill.goSlayer') : $t('skill.goCombat')" icon="pi pi-arrow-right" iconPos="right" @click="$router.push(skill === 'slayer' ? '/slayer' : '/combat')" />
      </div>
    </template>
    <div v-if="skill === 'farming'" style="margin-top:20px"><FarmPlots /></div>
    <div v-if="skill === 'agility'" class="panel pad grace">
      <ItemTile item="mark_of_grace" size="lg" :qty="G.qty('mark_of_grace')" />
      <div class="grow">
        <h3 class="panel-title" style="margin:0 0 4px">{{ $t('skill.graceTitle') }}</h3>
        <div class="small muted" v-html="$t('skill.graceText', { v: Math.round(state.grace * GRACE_SPEED * 100), n: state.grace, max: GRACE_COSTS.length })" />
        <div class="pips"><i v-for="i in GRACE_COSTS.length" :key="i" :class="{ on: i <= state.grace }" /></div>
      </div>
      <Button v-if="G.graceCost() !== null" :label="$t('skill.graceUpgrade', { n: G.graceCost() })" icon="pi pi-arrow-up" :disabled="G.qty('mark_of_grace') < G.graceCost()" @click="buyGrace" />
      <span v-else class="tag ok">{{ $t('skill.graceDone') }}</span>
    </div>

    <template v-if="all.length">
      <div class="filters panel" :style="{ '--c': s.color }">
        <div class="row wrap">
          <IconField class="grow search">
            <InputIcon class="pi pi-search" />
            <InputText v-model="f.q" :placeholder="$t('filters.searchIn', { skill: s.name })" fluid :id="'search-' + skill" />
          </IconField>
          <SelectButton v-model="f.status" :options="statusOpts" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" />
          <Select v-model="f.sort" :options="sortOpts" optionLabel="label" optionValue="value" size="small" class="sort" :inputId="'sort-' + skill" />
          <SelectButton v-model="f.view" :options="viewOpts" optionValue="value" dataKey="value" :allowEmpty="false" size="small" :aria-label="$t('filters.view')">
            <template #option="{ option }"><i :class="option.icon" v-tooltip.top="option.label" /></template>
          </SelectButton>
        </div>
        <div v-if="groupNames.length > 1" class="chips-row">
          <span class="chips-label">{{ $t('filters.section') }}</span>
          <button class="fchip" :class="{ on: f.group === 'all' }" @click="f.group = 'all'">{{ $t('filters.all') }} <i>{{ all.length }}</i></button>
          <button v-for="g in groupNames" :key="g" class="fchip" :class="{ on: f.group === g }" @click="f.group = f.group === g ? 'all' : g">
            {{ $t(g) }} <i>{{ count(a => groupOf(a) === g) }}</i>
          </button>
        </div>
        <div v-if="mats.length > 1" class="chips-row">
          <span class="chips-label">{{ $t('filters.material') }}</span>
          <button class="fchip" :class="{ on: f.mat === 'all' }" @click="f.mat = 'all'">{{ $t('filters.all') }}</button>
          <button v-for="m in mats" :key="m" class="fchip" :class="{ on: f.mat === m }" @click="f.mat = f.mat === m ? 'all' : m">
            {{ $t(m) }} <i>{{ count(a => a.mat === m) }}</i>
          </button>
        </div>
        <div class="row small muted">
          <span class="grow">{{ $t('filters.showing', { n: filtered.length, total: all.length }) }}</span>
          <Button v-if="dirty" :label="$t('filters.clear')" icon="pi pi-filter-slash" size="small" text @click="clear" />
        </div>
      </div>

      <template v-for="sec in sections" :key="sec.name || 'flat'">
        <div v-if="sec.name && sections.length > 1" class="section-title">{{ $t(sec.name) }}</div>
        <div v-if="f.view === 'cards'" class="grid-cards">
          <ActionCard v-for="a in sec.actions" :key="a.id" :skill="skill" :action="a" />
        </div>
        <div v-else class="rows">
          <ActionRow v-for="a in sec.actions" :key="a.id" :skill="skill" :action="a" />
        </div>
      </template>
      <div v-if="!filtered.length" class="empty-state">
        <GameIcon name="crystal-ball" :size="46" />
        <div>{{ $t('filters.noMatch') }}</div>
        <Button :label="$t('filters.clear')" icon="pi pi-filter-slash" text @click="clear" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.filters { position: sticky; top: 76px; z-index: 5; margin: 20px 0 18px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
  background: rgba(20, 19, 31, 0.92); backdrop-filter: blur(18px); }
.search { min-width: 220px; }
.sort { min-width: 170px; }
.chips-row { display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
.chips-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); margin-inline-end: 4px; flex-shrink: 0; }
.fchip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px; font: inherit; font-size: 13px; cursor: pointer;
  color: var(--muted); background: rgba(255, 255, 255, 0.03); border: 1px solid var(--line); transition: all 0.15s; }
.fchip i { font-style: normal; font-size: 11px; color: var(--faint); font-variant-numeric: tabular-nums; }
.fchip:hover { color: var(--ink); border-color: rgba(255, 255, 255, 0.18); }
.fchip.on { color: var(--ink); border-color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.fchip.on i { color: var(--ink); }
.rows { display: flex; flex-direction: column; gap: 6px; }
.grace { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 20px; }
.pips { display: flex; gap: 4px; margin-top: 8px; max-width: 320px; }
.pips i { flex: 1; height: 5px; border-radius: 5px; background: rgba(255, 255, 255, 0.07); }
.pips i.on { background: var(--gold-grad); }
@media (max-width: 900px) { .filters { position: static; } }
</style>
