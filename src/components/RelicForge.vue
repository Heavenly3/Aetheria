<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { ITEMS, STAT_LABELS } from '../game/data/items.js'
import { RARITIES, RARITY_TINT } from '../game/data/omens.js'
import { SEAL_ITEM, HEAT_MAX, HEAT_BONUS, FUSE_COUNT, RELIC_BASES, relicId, nextQuality, qualityRank } from '../game/data/relicforge.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'
import ItemCompare from './ItemCompare.vue'

const { t } = useI18n()
const router = useRouter()

const mode = ref('reforge')
const modes = computed(() => ['reforge', 'fuse', 'reshape'].map(v => ({ value: v, label: t(`forge.relic.modes.${v}`), icon: { reforge: 'pi pi-refresh', fuse: 'pi pi-sitemap', reshape: 'pi pi-sync' }[v] })))
const qName = q => t(`omens.rarity.${q}`)
const baseName = b => t(`relics.${b}`)
const statLine = id => Object.entries(ITEMS[id]?.stats || {}).map(([k, v]) => (k === 'mDmg' ? `+${Math.round(v * 100)}% ${STAT_LABELS[k]}` : `+${v} ${STAT_LABELS[k]}`)).join(' · ')
const pct = v => (v >= 0.995 || v === 0 ? Math.round(v * 100) : v < 0.01 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%'

/* ---------- picking a relic ---------- */
const live = computed(() => (void state.inventory, void state.equipment, G.relicsOwned()))
// While the hammer falls the list keeps showing the old relics, so it does not give the result away
const frozen = ref(null)
const owned = computed(() => frozen.value || live.value)
const pick = ref(null) // { id, slot }
const keyOf = r => r.id + '|' + (r.slot || '')
const current = computed(() => (pick.value && G.hasRelic(pick.value.id, pick.value.slot) ? pick.value : null))
// Keep a sensible selection as relics come and go
watch([owned, mode], () => {
  const list = mode.value === 'reshape' ? owned.value.filter(r => !r.slot) : owned.value
  if (!current.value || (mode.value === 'reshape' && current.value.slot)) pick.value = list[0] ? { id: list[0].id, slot: list[0].slot } : null
}, { immediate: true })
const it = computed(() => (current.value ? ITEMS[current.value.id] : null))
// On narrow screens the anvil sits under the list, so bring it into view
const anvil = ref()
function choose(r) {
  pick.value = { id: r.id, slot: r.slot }
  if (window.innerWidth <= 900) nextTick(() => anvil.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

/* ---------- reforge ---------- */
const seal = ref(false)
const odds = computed(() => (it.value && it.value.quality !== 'mythic' ? (void state.relicForge.heat, G.reforgeChances(current.value.id, seal.value)) : null))
const split = computed(() => {
  if (!odds.value) return null
  const r = qualityRank(it.value.quality)
  const out = { up: 0, same: 0, down: 0 }
  for (const [q, p] of Object.entries(odds.value)) out[qualityRank(q) > r ? 'up' : qualityRank(q) === r ? 'same' : 'down'] += p
  return out
})
const heat = computed(() => state.relicForge.heat)

/* ---------- fuse ---------- */
const fuseQ = ref('common')
const fuseBase = ref(RELIC_BASES[0])
const fuseQualities = computed(() => (void state.inventory, RARITIES.filter(q => q !== 'mythic').map(q => ({ q, n: G.fuseCount(q) }))))
const fusePick = computed(() => (void state.inventory, G.fusePick(fuseQ.value)))
const fuseResult = computed(() => relicId(fuseBase.value, nextQuality(fuseQ.value)))

/* ---------- reshape ---------- */
const shapeBase = ref(null)
const shapeTargets = computed(() => (it.value ? RELIC_BASES.filter(b => b !== it.value.relic) : []))
watch(shapeTargets, l => { if (!l.includes(shapeBase.value)) shapeBase.value = l[0] || null }, { immediate: true })
const shapeResult = computed(() => (it.value && shapeBase.value ? relicId(shapeBase.value, it.value.quality) : null))

/* ---------- forging and the reveal ---------- */
const reveal = ref(null) // { phase: 'forging' | 'done', kind, dir, from, to }
let timer
onUnmounted(() => clearTimeout(timer))
const busy = computed(() => reveal.value?.phase === 'forging')
function forge(kind) {
  const slot = current.value?.slot || null
  frozen.value = live.value
  let r
  if (kind === 'reforge') r = G.reforgeRelic(current.value.id, current.value.slot, seal.value)
  else if (kind === 'fuse') r = G.fuseRelics(fuseQ.value, fuseBase.value)
  else r = G.reshapeRelic(current.value.id, shapeBase.value)
  if (!r) { frozen.value = null; return }
  play('coin')
  reveal.value = { phase: 'forging', kind, dir: r.dir || 'up', from: r.from, to: r.to }
  if (seal.value && G.qty(SEAL_ITEM) <= 0) seal.value = false
  clearTimeout(timer)
  timer = setTimeout(() => {
    reveal.value = { ...reveal.value, phase: 'done' }
    frozen.value = null
    if (kind !== 'fuse') pick.value = { id: r.to, slot }
    const d = reveal.value.dir
    play(kind === 'reforge' ? (d === 'up' ? (qualityRank(ITEMS[r.to].quality) >= 3 ? 'rare' : 'level') : d === 'down' ? 'bad' : 'coin') : 'quest')
  }, 1100)
}
const costTags = cost => [
  { key: 'gold', icon: 'two-coins', have: state.gold, need: cost.gold, label: t('common.gold') },
  { key: 'dust', item: 'stardust', have: G.qty('stardust'), need: cost.dust, label: ITEMS.stardust.name },
]
const reforgeCost = computed(() => (it.value ? G.reforgeCost(current.value.id) : null))
const fuseCost = computed(() => G.fuseCost(fuseQ.value))
const shapeCost = computed(() => (it.value ? G.reshapeCost(current.value.id) : null))
const fromRank = computed(() => (reveal.value?.from ? qualityRank(ITEMS[reveal.value.from].quality) : 0))
</script>

<template>
  <div class="rf">
    <!-- What you have to work with -->
    <div class="panel pad rf-head">
      <p class="intro" style="margin:0">{{ $t('forge.relic.intro') }}</p>
      <div class="res">
        <span class="tag" v-tooltip.top="ITEMS.stardust.name"><ItemTile item="stardust" size="xs" :tip="false" /> {{ fmt(G.qty('stardust')) }}</span>
        <span class="tag" v-tooltip.top="ITEMS[SEAL_ITEM].name"><ItemTile :item="SEAL_ITEM" size="xs" :tip="false" /> {{ fmt(G.qty(SEAL_ITEM)) }}</span>
        <span class="tag gold"><GameIcon name="two-coins" :size="13" /> {{ fmt(state.gold) }}</span>
        <span class="heat" v-tooltip.top="$t('forge.relic.heatTip', { v: Math.round(HEAT_BONUS * 100), max: HEAT_MAX })" :aria-label="$t('forge.relic.heat', { n: heat, max: HEAT_MAX })">
          <span class="small muted">{{ $t('forge.relic.heatLabel') }}</span>
          <i v-for="i in HEAT_MAX" :key="i" class="ember" :class="{ on: i <= heat }"><GameIcon name="flame" :size="14" /></i>
        </span>
      </div>
    </div>

    <SelectButton v-model="mode" :options="modes" optionLabel="label" optionValue="value" :allowEmpty="false" class="rf-modes">
      <template #option="{ option }"><i :class="option.icon" style="margin-inline-end:6px" />{{ option.label }}</template>
    </SelectButton>

    <!-- No relics yet -->
    <div v-if="!owned.length && mode !== 'fuse'" class="panel empty-state">
      <GameIcon name="floating-crystal" :size="46" />
      <div>{{ $t('forge.relic.none') }}</div>
      <div class="row" style="justify-content:center;gap:8px;margin-top:12px">
        <Button :label="$t('nav.omens')" icon="pi pi-eye" size="small" outlined @click="router.push('/omens')" />
        <Button :label="$t('nav.weekly')" icon="pi pi-bolt" size="small" outlined @click="router.push('/weekly')" />
      </div>
    </div>

    <div v-else class="rf-grid">
      <!-- Left: what to work on -->
      <div class="panel pad">
        <template v-if="mode !== 'fuse'">
          <h3 class="panel-title"><GameIcon name="floating-crystal" :size="18" /> {{ $t('forge.relic.yourRelics') }}</h3>
          <div class="relic-list">
            <button v-for="r in (mode === 'reshape' ? owned.filter(x => !x.slot) : owned)" :key="keyOf(r)" class="relic"
              :class="{ on: pick && keyOf(pick) === keyOf(r) }" :style="{ '--q': RARITY_TINT[ITEMS[r.id].quality] }" @click="choose(r)">
              <ItemTile :item="r.id" size="md" :qty="r.slot ? null : r.n" :tip="false" />
              <span class="grow" style="min-width:0">
                <span class="relic-name">{{ baseName(ITEMS[r.id].relic) }}</span>
                <span class="small" :style="{ color: RARITY_TINT[ITEMS[r.id].quality] }">{{ qName(ITEMS[r.id].quality) }}</span>
              </span>
              <span v-if="r.slot" class="tag ok" style="font-size:11px">{{ $t('forge.relic.worn') }}</span>
              <i v-else-if="G.isLocked(r.id)" class="pi pi-lock faint" />
            </button>
            <p v-if="mode === 'reshape' && !owned.some(x => !x.slot)" class="small muted">{{ $t('forge.relic.reshapeBagOnly') }}</p>
          </div>
        </template>

        <template v-else>
          <h3 class="panel-title"><GameIcon name="crystal-cluster" :size="18" /> {{ $t('forge.relic.fuseFrom') }}</h3>
          <div class="q-list">
            <button v-for="f in fuseQualities" :key="f.q" class="q-row" :class="{ on: fuseQ === f.q, ready: f.n >= FUSE_COUNT }" :style="{ '--q': RARITY_TINT[f.q], '--q2': RARITY_TINT[nextQuality(f.q)] }" @click="fuseQ = f.q">
              <span class="q-dot" />
              <span class="grow">{{ qName(f.q) }} <i class="pi pi-arrow-right faint" style="font-size:10px" /> <b :style="{ color: RARITY_TINT[nextQuality(f.q)] }">{{ qName(nextQuality(f.q)) }}</b></span>
              <span class="tnum small" :class="f.n >= FUSE_COUNT ? 'ok-text' : 'faint'">{{ f.n }}/{{ FUSE_COUNT }}</span>
            </button>
          </div>
          <p class="small faint" style="margin:10px 0 0">{{ $t('forge.relic.fuseLocked') }}</p>
        </template>
      </div>

      <!-- Right: the anvil -->
      <div ref="anvil" class="panel pad anvil" :class="{ forging: busy }">
        <!-- The reveal -->
        <div v-if="reveal" class="reveal" :class="[reveal.phase, reveal.dir]" :style="{ '--q': RARITY_TINT[ITEMS[reveal.to].quality] }" role="status" aria-live="polite">
          <template v-if="reveal.phase === 'forging'">
            <div class="strike"><GameIcon name="anvil-impact" :size="64" /></div>
            <div class="small muted">{{ $t('forge.relic.forging') }}</div>
          </template>
          <template v-else>
            <div class="result-tile"><ItemTile :item="reveal.to" size="xl" :tip="false" /></div>
            <div class="result-dir">{{ $t(`forge.relic.result.${reveal.kind === 'reforge' ? reveal.dir : reveal.kind}`) }}</div>
            <div class="result-name" :style="{ color: RARITY_TINT[ITEMS[reveal.to].quality] }">{{ ITEMS[reveal.to].name }}</div>
            <div class="small muted">{{ statLine(reveal.to) }}</div>
            <div v-if="reveal.kind === 'reforge' && reveal.dir !== 'up' && heat" class="small warn-text" style="margin-top:6px">
              <GameIcon name="flame" :size="12" /> {{ $t('forge.relic.heatRose', { n: heat, max: HEAT_MAX }) }}
            </div>
            <Button :label="$t('forge.relic.continue')" size="small" text style="margin-top:8px" @click="reveal = null" />
          </template>
        </div>

        <!-- Reforge -->
        <template v-else-if="mode === 'reforge' && it">
          <div class="work-head">
            <ItemTile :item="current.id" size="lg" :tip="false" />
            <div class="grow" style="min-width:0">
              <div class="work-name" :style="{ color: RARITY_TINT[it.quality] }">{{ it.name }}</div>
              <div class="small muted">{{ statLine(current.id) }}</div>
              <div v-if="current.slot" class="small ok-text"><i class="pi pi-check" /> {{ $t('forge.relic.wornHint') }}</div>
            </div>
          </div>
          <div v-if="it.quality === 'mythic'" class="note"><i class="pi pi-star-fill" style="color:#3fe0c5" /> {{ $t('forge.relic.mythicMax') }}</div>
          <template v-else>
            <div class="odds-title small muted">{{ $t('forge.relic.odds') }}</div>
            <div class="odds-bar" role="img" :aria-label="Object.entries(odds).map(([q, p]) => `${qName(q)} ${pct(p)}`).join(', ')">
              <i v-for="(p, q) in odds" :key="q" :style="{ width: p * 100 + '%', background: RARITY_TINT[q] }" />
            </div>
            <div class="odds-list">
              <span v-for="(p, q) in odds" :key="q" class="odds-row" :class="{ cur: q === it.quality }">
                <i class="q-dot" :style="{ '--q': RARITY_TINT[q] }" />
                <span class="grow">{{ qName(q) }}<span v-if="q === it.quality" class="faint"> · {{ $t('forge.relic.now') }}</span></span>
                <b class="tnum">{{ pct(p) }}</b>
              </span>
            </div>
            <div class="row wrap split">
              <span class="tag ok"><i class="pi pi-arrow-up" /> {{ $t('forge.relic.up', { v: pct(split.up) }) }}</span>
              <span class="tag">{{ $t('forge.relic.same', { v: pct(split.same) }) }}</span>
              <span class="tag" :class="{ bad: split.down > 0 }"><i class="pi pi-arrow-down" /> {{ $t('forge.relic.down', { v: pct(split.down) }) }}</span>
            </div>
            <label class="row small seal" for="relic-seal">
              <ToggleSwitch v-model="seal" inputId="relic-seal" :disabled="G.qty(SEAL_ITEM) <= 0" />
              <span class="grow">{{ $t('forge.relic.seal', { item: ITEMS[SEAL_ITEM].name }) }}</span>
              <span class="tag"><ItemTile :item="SEAL_ITEM" size="xs" :tip="false" /> {{ fmt(G.qty(SEAL_ITEM)) }}</span>
            </label>
            <div class="cost">
              <span v-for="c in costTags(reforgeCost)" :key="c.key" class="cost-i" :class="{ miss: c.have < c.need }" v-tooltip.top="c.label">
                <ItemTile v-if="c.item" :item="c.item" size="xs" :tip="false" /><GameIcon v-else :name="c.icon" :size="15" />{{ fmt(c.need) }}
              </span>
            </div>
            <Button :label="$t('forge.relic.reforge')" icon="pi pi-refresh" fluid :severity="!seal && split.down > 0.3 ? 'warn' : undefined"
              :disabled="busy || !G.canReforge(current.id, current.slot, seal)" @click="forge('reforge')" />
          </template>
        </template>

        <!-- Fuse -->
        <template v-else-if="mode === 'fuse'">
          <div class="small muted" style="margin-bottom:8px">{{ $t('forge.relic.fuseUses') }}</div>
          <div class="fuse-row">
            <template v-if="fusePick">
              <ItemTile v-for="(id, i) in fusePick" :key="i" :item="id" size="md" />
            </template>
            <template v-else>
              <ItemTile v-for="i in FUSE_COUNT" :key="i" :icon="'floating-crystal'" size="md" empty :tip="false" />
            </template>
            <i class="pi pi-arrow-right faint" />
            <div class="fuse-out" :style="{ '--q': RARITY_TINT[nextQuality(fuseQ)] }"><ItemTile :item="fuseResult" size="lg" :tip="false" /></div>
          </div>
          <div v-if="!fusePick" class="small faint" style="margin-top:6px">{{ $t('forge.relic.fuseNeed', { n: FUSE_COUNT, q: qName(fuseQ), have: G.fuseCount(fuseQ) }) }}</div>
          <div class="small muted" style="margin:14px 0 6px">{{ $t('forge.relic.chooseKind') }}</div>
          <div class="bases">
            <button v-for="b in RELIC_BASES" :key="b" class="base" :class="{ on: fuseBase === b }" @click="fuseBase = b">
              <ItemTile :item="relicId(b, nextQuality(fuseQ))" size="sm" :tip="false" />
              <span class="small">{{ baseName(b) }}</span>
            </button>
          </div>
          <div class="work-name" :style="{ color: RARITY_TINT[nextQuality(fuseQ)], marginTop: '12px' }">{{ ITEMS[fuseResult].name }}</div>
          <ItemCompare :id="fuseResult" preview />
          <div class="cost">
            <span v-for="c in costTags(fuseCost)" :key="c.key" class="cost-i" :class="{ miss: c.have < c.need }" v-tooltip.top="c.label">
              <ItemTile v-if="c.item" :item="c.item" size="xs" :tip="false" /><GameIcon v-else :name="c.icon" :size="15" />{{ fmt(c.need) }}
            </span>
          </div>
          <Button :label="$t('forge.relic.fuse')" icon="pi pi-sitemap" fluid :disabled="busy || !G.canFuse(fuseQ, fuseBase)" @click="forge('fuse')" />
        </template>

        <!-- Reshape -->
        <template v-else-if="mode === 'reshape' && it && !current.slot">
          <div class="fuse-row">
            <ItemTile :item="current.id" size="lg" :tip="false" />
            <i class="pi pi-arrow-right faint" />
            <ItemTile v-if="shapeResult" :item="shapeResult" size="lg" :tip="false" />
          </div>
          <div class="small muted" style="margin:14px 0 6px">{{ $t('forge.relic.chooseKind') }}</div>
          <div class="bases">
            <button v-for="b in shapeTargets" :key="b" class="base" :class="{ on: shapeBase === b }" @click="shapeBase = b">
              <ItemTile :item="relicId(b, it.quality)" size="sm" :tip="false" />
              <span class="small">{{ baseName(b) }}</span>
            </button>
          </div>
          <template v-if="shapeResult">
            <div class="work-name" :style="{ color: RARITY_TINT[it.quality], marginTop: '12px' }">{{ ITEMS[shapeResult].name }}</div>
            <ItemCompare :id="shapeResult" preview />
          </template>
          <div class="cost">
            <span v-for="c in costTags(shapeCost)" :key="c.key" class="cost-i" :class="{ miss: c.have < c.need }" v-tooltip.top="c.label">
              <ItemTile v-if="c.item" :item="c.item" size="xs" :tip="false" /><GameIcon v-else :name="c.icon" :size="15" />{{ fmt(c.need) }}
            </span>
          </div>
          <Button :label="$t('forge.relic.reshape')" icon="pi pi-sync" fluid :disabled="busy || !G.canReshape(current.id, shapeBase)" @click="forge('reshape')" />
        </template>

        <div v-else class="empty-state" style="padding:30px 10px">
          <GameIcon name="anvil-impact" :size="40" />
          <div>{{ $t('forge.relic.pick') }}</div>
        </div>
      </div>
    </div>

    <p class="small faint" style="margin-top:14px">{{ $t('forge.relic.note', { r: state.relicForge.reforged, f: state.relicForge.fused }) }}</p>
  </div>
</template>

<style scoped>
.rf-head { margin-bottom: 16px; }
.res { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.heat { display: inline-flex; align-items: center; gap: 3px; margin-inline-start: auto; }
.heat .muted { margin-inline-end: 6px; }
.ember { color: var(--faint); opacity: 0.45; display: inline-flex; transition: color 0.3s, opacity 0.3s, filter 0.3s; }
.ember.on { color: var(--ember); opacity: 1; filter: drop-shadow(0 0 4px var(--ember)); }
.rf-modes { margin-bottom: 16px; }
.rf-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 18px; align-items: start; }

.relic-list { display: grid; gap: 8px; max-height: 560px; overflow-y: auto; padding-inline-end: 4px; }
.relic { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--line); background: var(--tint-1);
  color: inherit; font: inherit; text-align: start; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.relic:hover { border-color: var(--line-hi); }
.relic.on { border-color: var(--q); box-shadow: 0 0 22px -10px var(--q); }
.relic > .grow { display: grid; }
.relic-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.q-list { display: grid; gap: 8px; }
.q-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--tint-1); color: inherit; font: inherit; text-align: start; cursor: pointer; }
.q-row.on { border-color: var(--q2); box-shadow: 0 0 22px -10px var(--q2); }
.q-row:not(.ready) { opacity: 0.75; }
.q-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--q); box-shadow: 0 0 6px var(--q); flex: none; display: inline-block; }

.anvil { position: relative; min-height: 360px; }
.work-head { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
.work-name { font-family: var(--font-display); font-size: 19px; line-height: 1.2; }
.note { padding: 12px; border-radius: 10px; background: var(--tint-1); font-size: 14px; }
.odds-title { margin-bottom: 6px; }
.odds-bar { display: flex; height: 12px; border-radius: 8px; overflow: hidden; background: var(--track); gap: 2px; }
.odds-bar i { display: block; height: 100%; min-width: 2px; }
.odds-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px 16px; margin: 10px 0; font-size: 13.5px; }
.odds-row { display: flex; align-items: center; gap: 8px; }
.odds-row.cur { font-weight: 600; }
.split { gap: 6px; margin-bottom: 12px; }
.seal { gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--tint-1); cursor: pointer; margin-bottom: 12px; }
.cost { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font-size: 13px; padding: 8px 10px; border-radius: 10px; background: var(--well); margin: 12px 0; }
.cost-i { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
.cost-i .gi { color: var(--gold); }
.cost-i.miss { color: var(--danger); }
.warn-text { color: var(--warn); }

.fuse-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.fuse-out :deep(.tile) { box-shadow: 0 0 26px -6px var(--q); }
.bases { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.base { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--tint-1); color: inherit; font: inherit; cursor: pointer; text-align: start; }
.base.on { border-color: var(--gold); box-shadow: 0 0 16px -8px var(--gold); }

/* Forging and the reveal */
.reveal { position: absolute; inset: 0; z-index: 2; display: grid; place-content: center; justify-items: center; gap: 6px; padding: 20px; text-align: center;
  border-radius: inherit; background: color-mix(in srgb, var(--panel-solid) 94%, transparent); }
.strike { color: var(--gold); animation: strike 0.55s ease-in-out infinite; }
.reveal.done .result-tile { animation: rise 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3); }
.reveal.done .result-tile :deep(.tile) { box-shadow: 0 0 50px -6px var(--q); }
.reveal.done.up { background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--q) 22%, transparent), transparent 65%), color-mix(in srgb, var(--panel-solid) 94%, transparent); }
.reveal.done.down .result-tile { animation: sink 0.6s ease-out; filter: saturate(0.7); }
.result-dir { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-top: 8px; }
.reveal.up .result-dir { color: var(--q); }
.reveal.down .result-dir { color: var(--danger); }
.result-name { font-family: var(--font-display); font-size: 22px; }
@keyframes strike { 0%, 100% { transform: rotate(0) scale(1); } 40% { transform: rotate(-14deg) scale(1.08); } 55% { transform: rotate(4deg) scale(0.96); } }
@keyframes rise { from { transform: scale(0.4) translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes sink { from { transform: translateY(-10px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .strike, .reveal.done .result-tile { animation: none !important; } }
@media (max-width: 900px) { .rf-grid { grid-template-columns: 1fr; } .heat { margin-inline-start: 0; } .relic-list { max-height: 320px; } }
</style>
