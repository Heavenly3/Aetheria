<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { ACTIONS } from '../game/data/actions.js'
import { WATER_MAP, BAITS, BAIT_IDS } from '../game/data/fishing.js'
import { ITEMS } from '../game/data/items.js'
import { TOOL_TYPES } from '../game/data/character.js'
import { pct, fmtDec } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

const { t } = useI18n()
// Fishing: pick a water, choose a bait and watch the line. Every cast lands a fish at random
const waters = computed(() => ACTIONS.fishing)
const fishingAt = computed(() => (state.activity?.type === 'skill' && state.activity.skill === 'fishing' ? state.activity.action : null))
const picked = ref(fishingAt.value || ACTIONS.fishing.filter(a => G.level('fishing') >= a.lvl && G.hasTool(a)).pop()?.id || ACTIONS.fishing[0].id)
const water = computed(() => ACTIONS.fishing.find(a => a.id === picked.value))
const colours = computed(() => WATER_MAP[picked.value].scene)
const table = computed(() => G.catchTable(water.value))
const active = computed(() => fishingAt.value === picked.value)
const progress = computed(() => (active.value ? Math.min(1, Math.max(0, state.activity.progress) / G.actionTime('fishing', water.value)) : 0))
const locked = a => G.level('fishing') < a.lvl || !G.hasTool(a)
const lockText = a => (G.level('fishing') < a.lvl ? t('common.lvlShort', { n: a.lvl }) : t('angling.needsRod', { tool: TOOL_TYPES.rod.name, n: a.tool.tier }))
const fishOf = a => Object.keys(a.catch)
const fishLocked = id => G.catchTable(water.value).find(r => r.id === id)?.locked
const motion = computed(() => !state.settings.reduceMotion)
// A bite is coming: the bobber dips (it only moves, it never changes size)
const biting = computed(() => active.value && progress.value > 0.82)

// Catches of this visit, newest first, and a splash when one comes in
const catches = ref([])
const splash = ref(0)
let off
onMounted(() => {
  off = G.on('catch', e => {
    catches.value.unshift({ ...e, key: Date.now() + Math.random() })
    catches.value.length = Math.min(catches.value.length, 10)
    if (e.water === picked.value) splash.value++
  })
})
onUnmounted(() => off?.())

function toggle() {
  if (locked(water.value)) return
  G.startSkill('fishing', water.value.id)
}
function setBait(id) { state.bait = state.bait === id ? null : id }
</script>

<template>
  <div class="fishing">
    <!-- The waters, as cards like every other skill -->
    <div class="section-title" style="margin-top:0">{{ $t('angling.waters') }} <HelpTip k="sections.fishOdds" /></div>
    <div class="grid-wide waters">
      <button v-for="a in waters" :key="a.id" class="card water" :class="{ picked: picked === a.id, locked: locked(a), active: fishingAt === a.id }"
        :style="{ '--c': a.tint }" @click="picked = a.id">
        <div class="row">
          <ItemTile :icon="a.icon" :tint="a.tint" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ a.name }}</div>
            <div class="card-sub">
              <template v-if="locked(a)"><i class="pi pi-lock" style="font-size:11px" /> {{ lockText(a) }}</template>
              <template v-else>{{ $t('common.levelN', { n: a.lvl }) }} · {{ $t('angling.mastery', { n: G.masteryLevel('fishing', a.id) }) }}</template>
            </div>
          </div>
          <span v-if="fishingAt === a.id" class="tag ok"><span class="pulse" /> {{ $t('angling.fishing') }}</span>
        </div>
        <div class="row wrap fish-icons">
          <ItemTile v-for="id in fishOf(a)" :key="id" :item="id" size="xs" />
        </div>
      </button>
    </div>

    <div class="two-col" style="margin-top:18px">
      <!-- The scene: a fixed-size drawing, so nothing in it grows or shrinks -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon :name="water.icon" /> {{ water.name }}</h3>
        <div class="scene" :class="{ moving: motion, active }">
          <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient :id="'sky-' + water.id" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#15131f" />
                <stop offset="1" :stop-color="colours[1]" stop-opacity="0.55" />
              </linearGradient>
              <linearGradient :id="'sea-' + water.id" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" :stop-color="colours[0]" />
                <stop offset="1" :stop-color="colours[1]" />
              </linearGradient>
            </defs>
            <rect width="400" height="200" :fill="`url(#sky-${water.id})`" />
            <circle cx="320" cy="44" r="18" :fill="colours[0]" opacity="0.25" />
            <circle cx="320" cy="44" r="11" fill="#fff3c4" opacity="0.35" />
            <rect y="112" width="400" height="88" :fill="`url(#sea-${water.id})`" />
            <g class="waves">
              <path class="wave w1" d="M-40 122 Q 10 116 60 122 T 160 122 T 260 122 T 360 122 T 460 122" />
              <path class="wave w2" d="M-40 142 Q 10 136 60 142 T 160 142 T 260 142 T 360 142 T 460 142" />
              <path class="wave w3" d="M-40 166 Q 10 160 60 166 T 160 166 T 260 166 T 360 166 T 460 166" />
            </g>
            <!-- rod, line and bobber -->
            <path d="M24 196 L190 52" stroke="#6b4a2a" stroke-width="6" stroke-linecap="round" />
            <path d="M190 52 L198 45" stroke="#c9a04a" stroke-width="3.5" stroke-linecap="round" />
            <path class="line" :d="`M198 45 Q 250 ${active ? 92 : 80} 300 ${biting ? 128 : 122}`" />
            <g class="bobber" :class="{ bob: active && !biting, bite: biting }">
              <ellipse cx="300" cy="123" rx="8" ry="2.5" fill="rgba(0,0,0,0.25)" />
              <circle cx="300" cy="118" r="5.5" fill="#e0554b" />
              <path d="M294.5 118 A5.5 5.5 0 0 1 305.5 118 Z" fill="#fff" />
            </g>
            <circle :key="splash" cx="300" cy="121" r="4" class="splash" :class="{ show: splash > 0 }" />
          </svg>
        </div>

        <!-- Controls under the scene -->
        <div class="controls">
          <div class="grow" style="min-width:0">
            <div class="small" :class="active ? 'ok-text' : 'muted'">
              {{ locked(water) ? lockText(water) : active ? (biting ? $t('angling.biting') : $t('angling.casting')) : $t('angling.idle') }}
            </div>
            <div class="bar" style="margin-top:6px" :style="{ '--c': water.tint }"><i :style="{ width: progress * 100 + '%' }" /></div>
            <div class="small faint" style="margin-top:4px">{{ $t('angling.speed', { s: fmtDec(G.actionTime('fishing', water)) }) }}</div>
          </div>
          <Button :label="active ? $t('angling.reel') : $t('angling.cast')" :icon="active ? 'pi pi-stop' : 'pi pi-play'" :severity="active ? 'danger' : undefined"
            :disabled="locked(water)" @click="toggle" />
        </div>

        <template v-if="catches.length">
          <div class="section-title sm">{{ $t('angling.recent') }}</div>
          <div class="recent">
            <span v-for="c in catches" :key="c.key" class="catch"><ItemTile :item="c.fish" size="sm" :qty="c.n > 1 ? c.n : null" /></span>
          </div>
        </template>
      </div>

      <!-- The water's fish and the bait -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="fishing" /> {{ $t('angling.catchTitle') }} <HelpTip k="sections.fishOdds" /></h3>
        <div v-for="r in table" :key="r.id" class="fish-row" :class="{ locked: r.locked }">
          <ItemTile :item="r.id" size="sm" />
          <span class="grow">{{ ITEMS[r.id].name }}</span>
          <span v-if="r.locked" class="tag bad"><i class="pi pi-lock" style="font-size:10px" /> {{ $t('common.lvlShort', { n: r.lvl }) }}</span>
          <template v-else>
            <span class="bar thin odds" :style="{ '--c': water.tint }"><i :style="{ width: r.chance * 100 + '%' }" /></span>
            <b class="small tnum chance">{{ pct(r.chance, 1) }}</b>
          </template>
        </div>

        <div class="section-title sm">{{ $t('angling.baitTitle') }} <HelpTip k="sections.bait" /></div>
        <div class="baits">
          <button v-for="b in BAIT_IDS" :key="b" class="bait" :class="{ on: state.bait === b, empty: !G.qty(b) }" @click="setBait(b)">
            <ItemTile :item="b" size="sm" :qty="G.qty(b)" />
            <span class="grow">
              <span class="bait-name">{{ ITEMS[b].name }}</span>
              <span class="small faint">{{ $t('angling.baitPower', { n: Math.round(BAITS[b].power * 100) }) }}</span>
            </span>
            <i v-if="state.bait === b" class="pi pi-check gold-text" />
          </button>
        </div>
        <div class="small faint" style="margin-top:8px">{{ state.bait ? (G.activeBait() ? $t('angling.baitOn') : $t('angling.baitOut')) : $t('angling.noBait') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fishing { margin-bottom: 22px; }
.waters .water { text-align: start; color: inherit; font: inherit; cursor: pointer; }
.water.picked { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold) inset; }
.water.locked { opacity: 0.6; }
.water .pulse { margin-inline-end: 2px; }
.fish-icons { gap: 4px; margin-top: 10px; }
/* The scene keeps one size whatever happens beside it */
.scene { position: relative; height: 210px; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #15131f; }
.scene svg { display: block; width: 100%; height: 100%; }
.wave { fill: none; stroke: rgba(255, 255, 255, 0.16); stroke-width: 2; }
.w2 { opacity: 0.7; } .w3 { opacity: 0.45; }
.moving .w1 { animation: drift 7s ease-in-out infinite; }
.moving .w2 { animation: drift 9s ease-in-out infinite reverse; }
.moving .w3 { animation: drift 11s ease-in-out infinite; }
@keyframes drift { 50% { transform: translateX(-20px); } }
.line { fill: none; stroke: rgba(255, 255, 255, 0.6); stroke-width: 1.2; }
.moving .bobber.bob { animation: bob 1.8s ease-in-out infinite; }
.moving .bobber.bite { animation: bite 0.35s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(2px); } }
@keyframes bite { 50% { transform: translateY(5px); } }
.splash { fill: none; stroke: rgba(255, 255, 255, 0.85); stroke-width: 1.5; opacity: 0; transform-box: fill-box; transform-origin: center; }
.moving .splash.show { animation: splash 0.8s ease-out; }
@keyframes splash { from { opacity: 1; transform: scale(0.5); } to { opacity: 0; transform: scale(4); } }
.controls { display: flex; align-items: center; gap: 14px; margin-top: 14px; }
.section-title.sm { margin: 18px 0 8px; font-size: 12px; }
.recent { display: flex; flex-wrap: wrap; gap: 6px; }
.catch { animation: pop 0.35s ease; }
@keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
.fish-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); }
.fish-row:last-of-type { border-bottom: 0; }
.fish-row.locked { opacity: 0.55; }
.odds { width: 80px; }
.chance { min-width: 44px; text-align: end; }
.baits { display: flex; flex-direction: column; gap: 6px; }
.bait { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); color: inherit; font: inherit; cursor: pointer; text-align: start; }
.bait:hover { border-color: var(--line-hi); }
.bait.on { border-color: var(--gold); background: rgba(226, 182, 90, 0.08); }
.bait.empty { opacity: 0.55; }
.bait-name { display: block; font-weight: 600; font-size: 14px; }
</style>
