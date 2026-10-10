<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { ACTIONS } from '../game/data/actions.js'
import { WATER_MAP, BAITS, BAIT_IDS } from '../game/data/fishing.js'
import { ITEMS } from '../game/data/items.js'
import { TOOL_TYPES } from '../game/data/character.js'
import { fmt, pct } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

const { t } = useI18n()
// Fishing: pick a water, choose a bait and watch the line. Every cast lands a fish at random
const waters = computed(() => ACTIONS.fishing)
const fishingAt = computed(() => (state.activity?.type === 'skill' && state.activity.skill === 'fishing' ? state.activity.action : null))
const picked = ref(fishingAt.value || ACTIONS.fishing.filter(a => G.level('fishing') >= a.lvl && G.hasTool(a)).pop()?.id || ACTIONS.fishing[0].id)
const water = computed(() => ACTIONS.fishing.find(a => a.id === picked.value))
const scene = computed(() => WATER_MAP[picked.value].scene)
const table = computed(() => G.catchTable(water.value))
const active = computed(() => fishingAt.value === picked.value)
const progress = computed(() => (active.value ? Math.max(0, state.activity.progress) / G.actionTime('fishing', water.value) : 0))
const locked = a => G.level('fishing') < a.lvl || !G.hasTool(a)
const lockText = a => (G.level('fishing') < a.lvl ? t('common.lvlShort', { n: a.lvl }) : `${TOOL_TYPES.rod.name} ${a.tool.tier}`)
// Where the bobber floats: it sinks a little as a bite gets closer
const bob = computed(() => ({ x: 318, y: Math.round(170 + (active.value ? progress.value * 8 : 0)) }))
const motion = computed(() => !state.settings.reduceMotion)

// Catches of this visit, newest first, and a splash when one comes in
const catches = ref([])
const splash = ref(0)
let off
onMounted(() => {
  off = G.on('catch', e => {
    catches.value.unshift({ ...e, key: Date.now() + Math.random() })
    catches.value.length = Math.min(catches.value.length, 8)
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
    <!-- The waters -->
    <div class="waters">
      <button v-for="a in waters" :key="a.id" class="water" :class="{ on: picked === a.id, locked: locked(a), active: fishingAt === a.id }"
        :style="{ '--w1': WATER_MAP[a.id].scene[0], '--w2': WATER_MAP[a.id].scene[1] }" @click="picked = a.id">
        <GameIcon :name="a.icon" :size="22" />
        <span class="water-name">{{ a.name }}</span>
        <span class="small" :class="locked(a) ? 'bad-text' : 'muted'">{{ locked(a) ? lockText(a) : $t('common.lvlShort', { n: a.lvl }) }}</span>
        <span v-if="fishingAt === a.id" class="pulse" />
      </button>
    </div>

    <div class="two-col" style="margin-top:14px">
      <!-- The scene -->
      <div class="scene panel" :class="{ moving: motion, active }" :style="{ '--w1': scene[0], '--w2': scene[1] }">
        <div class="sky" />
        <div class="sun" />
        <div class="sea">
          <span class="wave w1" /><span class="wave w2" /><span class="wave w3" />
        </div>
        <!-- Rod, line, bobber and splash share one drawing, so the line always ends at the bobber -->
        <svg class="rig" viewBox="0 0 400 280" preserveAspectRatio="none" aria-hidden="true">
          <path d="M18 276 L232 66" stroke="#6b4a2a" stroke-width="7" stroke-linecap="round" />
          <path d="M232 66 L242 56" stroke="#c9a04a" stroke-width="4" stroke-linecap="round" />
          <path :d="`M242 56 Q 290 ${active ? 110 : 96} ${bob.x} ${bob.y}`" stroke="rgba(255,255,255,0.6)" stroke-width="1.4" fill="none" />
          <g :class="['bobber', { bite: active && progress > 0.8 }]" :style="{ transformOrigin: `${bob.x}px ${bob.y}px` }">
            <ellipse :cx="bob.x" :cy="bob.y + 1" rx="9" ry="3" fill="rgba(0,0,0,0.25)" />
            <circle :cx="bob.x" :cy="bob.y - 3" r="6" fill="#e0554b" />
            <path :d="`M${bob.x - 6} ${bob.y - 3} A6 6 0 0 1 ${bob.x + 6} ${bob.y - 3}`" fill="#fff" />
          </g>
          <circle :key="splash" :cx="bob.x" :cy="bob.y" r="5" :class="['splash', { show: splash > 0 }]" />
        </svg>
        <div class="scene-label">
          <b>{{ water.name }}</b>
          <span class="small">{{ active ? $t('angling.casting') : locked(water) ? lockText(water) : $t('angling.idle') }}</span>
        </div>
        <div v-if="active" class="cast-bar"><i :style="{ width: progress * 100 + '%' }" /></div>
        <div class="cast-btn">
          <Button :label="active ? $t('angling.reel') : $t('angling.cast')" :icon="active ? 'pi pi-stop' : 'pi pi-play'" :severity="active ? 'danger' : undefined"
            size="small" :disabled="locked(water)" @click="toggle" />
        </div>
      </div>

      <!-- The water's fish and the bait -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="fishing" /> {{ $t('angling.catchTitle') }} <HelpTip k="sections.fishOdds" /></h3>
        <div v-for="r in table" :key="r.id" class="fish-row" :class="{ locked: r.locked }">
          <ItemTile :item="r.id" size="sm" />
          <span class="grow">{{ ITEMS[r.id].name }}</span>
          <span v-if="r.locked" class="small bad-text">{{ $t('common.lvlShort', { n: r.lvl }) }}</span>
          <template v-else>
            <span class="odds"><i :style="{ width: r.chance * 100 + '%' }" /></span>
            <b class="small tnum">{{ pct(r.chance, 1) }}</b>
          </template>
        </div>
        <div class="small muted" style="margin-top:8px">{{ $t('angling.mastery', { n: G.masteryLevel('fishing', water.id) }) }} · {{ $t('angling.speed', { s: G.actionTime('fishing', water).toFixed(1) }) }}</div>

        <h3 class="panel-title" style="margin-top:16px"><GameIcon name="snail" /> {{ $t('angling.baitTitle') }} <HelpTip k="sections.bait" /></h3>
        <div class="baits">
          <button v-for="b in BAIT_IDS" :key="b" class="bait" :class="{ on: state.bait === b, empty: !G.qty(b) }" @click="setBait(b)">
            <ItemTile :item="b" size="sm" :qty="G.qty(b)" />
            <span class="small">{{ ITEMS[b].name }}</span>
            <span class="small faint">+{{ Math.round(BAITS[b].power * 100) }}%</span>
          </button>
        </div>
        <div class="small faint" style="margin-top:6px">{{ state.bait ? (G.activeBait() ? $t('angling.baitOn') : $t('angling.baitOut')) : $t('angling.noBait') }}</div>

        <template v-if="catches.length">
          <h3 class="panel-title" style="margin-top:16px"><GameIcon name="double-fish" /> {{ $t('angling.recent') }}</h3>
          <div class="recent">
            <span v-for="c in catches" :key="c.key" class="catch"><ItemTile :item="c.fish" size="sm" :qty="c.n > 1 ? c.n : null" /></span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fishing { margin-bottom: 22px; }
.waters { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.water { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: var(--radius); cursor: pointer; color: #fff; font: inherit;
  background: linear-gradient(180deg, color-mix(in srgb, var(--w1) 55%, transparent), color-mix(in srgb, var(--w2) 80%, transparent)); border: 1px solid var(--line); }
.water.on { border-color: var(--gold); box-shadow: 0 0 18px -6px var(--w1); }
.water.locked { filter: grayscale(0.7); opacity: 0.6; }
.water-name { font-weight: 700; font-size: 14px; text-align: center; }
.water .pulse { position: absolute; top: 8px; right: 8px; }
.scene { position: relative; overflow: hidden; min-height: 280px; padding: 0; border-radius: var(--radius); }
.sky { position: absolute; inset: 0 0 45% 0; background: linear-gradient(180deg, #1b1830, color-mix(in srgb, var(--w1) 35%, #1b1830)); }
.sea { position: absolute; inset: 55% 0 0 0; background: linear-gradient(180deg, var(--w1), var(--w2)); }
.wave { position: absolute; left: -10%; width: 120%; height: 14px; border-radius: 50%; background: rgba(255, 255, 255, 0.14); }
.w1 { top: 4px; } .w2 { top: 30px; opacity: 0.7; } .w3 { top: 58px; opacity: 0.5; }
.moving .w1 { animation: drift 6s ease-in-out infinite; } .moving .w2 { animation: drift 8s ease-in-out infinite reverse; } .moving .w3 { animation: drift 10s ease-in-out infinite; }
@keyframes drift { 50% { transform: translateX(6%); } }
.rig { position: absolute; inset: 0; width: 100%; height: 100%; }
.sun { position: absolute; right: 14%; top: 12%; width: 46px; height: 46px; border-radius: 50%; background: color-mix(in srgb, var(--w1) 35%, #fff3c4); opacity: 0.35; box-shadow: 0 0 40px 10px color-mix(in srgb, var(--w1) 30%, transparent); }
.moving.active .bobber { animation: bob 1.6s ease-in-out infinite; }
.moving .bobber.bite { animation: bite 0.35s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(3px); } }
@keyframes bite { 50% { transform: translateY(7px); } }
.splash { fill: none; stroke: rgba(255, 255, 255, 0.85); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; }
.moving .splash.show { animation: splash 0.8s ease-out; }
@keyframes splash { from { opacity: 1; transform: scale(0.4); } to { opacity: 0; transform: scale(5); } }
.scene-label { position: absolute; left: 14px; top: 12px; display: flex; flex-direction: column; color: #fff; text-shadow: 0 1px 3px #000; }
.cast-bar { position: absolute; left: 14px; right: 14px; bottom: 54px; height: 5px; border-radius: 3px; background: rgba(0, 0, 0, 0.35); }
.cast-bar i { display: block; height: 100%; border-radius: 3px; background: #fff; }
.cast-btn { position: absolute; right: 14px; bottom: 12px; }
.fish-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
.fish-row.locked { opacity: 0.5; }
.odds { width: 70px; height: 6px; border-radius: 3px; background: var(--tint-2); overflow: hidden; }
.odds i { display: block; height: 100%; background: #5fa8d3; }
.baits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.bait { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); color: inherit; font: inherit; cursor: pointer; text-align: center; }
.bait.on { border-color: var(--gold); background: rgba(226, 182, 90, 0.08); }
.bait.empty { opacity: 0.55; }
.recent { display: flex; flex-wrap: wrap; gap: 6px; }
.catch { animation: pop 0.35s ease; }
@keyframes pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
</style>
