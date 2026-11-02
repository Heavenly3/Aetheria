<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { AREAS } from '../game/data/combat.js'
import { QUESTS } from '../game/data/progression.js'
import { REGIONS, LANDMARKS, MAP_W, MAP_H, regionOfActivity, regionPath, regionDungeon, regionBosses } from '../game/data/world.js'
import { regionMarks, regionProgress, MARK_ICONS, MARK_ORDER } from '../ui/worldMarks.js'
import { throttled } from '../ui/throttled.js'
import { focusOn } from '../ui/focus.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

/*
  The map of the realm, drawn on a 2000 × 1200 board that can be dragged and zoomed (wheel, pinch,
  buttons or keys). The land scales with the zoom; regions and markers stay the same size on top of
  it. Dungeons and bosses show under each region once zoomed in a little.
*/
const { t } = useI18n()
const questName = id => QUESTS.find(q => q.id === id)?.name
const here = computed(() => regionOfActivity(state.activity))
const marks = throttled(() => (void state.lastTick, regionMarks()), 2000)
const regions = computed(() => (void state.bestiary.kills, void state.quests, AREAS.map(a => {
  const r = REGIONS[a.id], m = marks.value?.[a.id] || {}
  return {
    a, r, open: G.areaUnlocked(a), p: regionProgress(a.id), dungeon: regionDungeon(a.id), bosses: regionBosses(a.id),
    marks: MARK_ORDER.filter(k => m[k]).map(k => ({ k, text: t(`world.marks.${k}`, { n: m[k] }) })),
  }
})))
const withExtras = computed(() => regions.value.filter(r => r.open && (r.dungeon || r.bosses.length)))
const landmarks = computed(() => LANDMARKS.filter(l => G.screenOpen(l.to)))
const label = r => [r.a.name, t('world.level', { n: r.a.recLvl }), r.open ? t('world.progress', { n: r.p.met, total: r.p.total }) : t('world.locked', { quest: questName(r.a.reqQuest) }),
  here.value === r.a.id ? t('world.here') : null, ...r.marks.map(m => m.text)].filter(Boolean).join('. ')

/* ---------- the drawing: the land as a panel, each region marked by a faint emblem ---------- */
const roads = computed(() => regions.value.slice(1).map((r, i) => {
  const from = regions.value[i].r, to = r.r, bend = i % 2 ? 70 : -70
  return { d: `M${from.x},${from.y} Q${(from.x + to.x) / 2 + bend},${(from.y + to.y) / 2 - bend * 0.7} ${to.x},${to.y}`, walked: regions.value[i].p.visited && r.p.visited }
}))
const LAND = 'M90,1010 C40,860 120,700 150,560 C180,400 230,300 330,250 C450,190 560,230 660,200 C780,160 900,210 1000,170 C1100,120 1240,150 1330,230 C1420,300 1520,330 1620,360 C1760,400 1900,430 1930,560 C1960,700 1880,800 1830,900 C1770,1020 1640,1080 1500,1060 C1380,1045 1290,1090 1170,1080 C1040,1070 940,1110 820,1100 C640,1090 500,1140 360,1120 C240,1105 130,1110 90,1010 Z'
const ISLAND = 'M1560,230 C1560,150 1640,95 1730,100 C1820,105 1880,160 1870,230 C1860,290 1790,320 1720,315 C1630,310 1560,290 1560,230 Z'

/* ---------- the view: zoom s and offset tx, ty, in screen pixels ---------- */
const box = ref(null)
const size = reactive({ w: 800, h: 520 })
const view = reactive({ s: 0.5, tx: 0, ty: 0 })
const animating = ref(false)
const full = ref(false)
const MAX = 1.8
const fit = () => Math.min(size.w / MAP_W, size.h / MAP_H)
const minS = () => fit() * 0.95
const DETAIL = 0.72
const OPEN_ZOOM = 0.9
// A view kept between visits, as the board point at the centre and the zoom
let saved = null

function clamp() {
  view.s = Math.min(MAX, Math.max(minS(), view.s))
  const w = MAP_W * view.s, h = MAP_H * view.s
  view.tx = w <= size.w ? (size.w - w) / 2 : Math.min(0, Math.max(size.w - w, view.tx))
  view.ty = h <= size.h ? (size.h - h) / 2 : Math.min(0, Math.max(size.h - h, view.ty))
}
function zoomAt(px, py, s) {
  const k = Math.min(MAX, Math.max(minS(), s)) / view.s
  view.tx = px - (px - view.tx) * k
  view.ty = py - (py - view.ty) * k
  view.s *= k
  clamp()
}
function centreOn(x, y, s = view.s, smooth = true) {
  if (smooth) glide()
  view.s = s
  view.tx = size.w / 2 - x * s
  view.ty = size.h / 2 - y * s
  clamp()
}
function glide() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce') return
  animating.value = true
  setTimeout(() => (animating.value = false), 320)
}
const zoomBy = f => { glide(); zoomAt(size.w / 2, size.h / 2, view.s * f) }
const showAll = () => { glide(); view.s = fit(); clamp() }
// The hero's fight, else where the story goes next, else the furthest region opened
const focusRegion = () => here.value || G.nextGoal()?.region || [...regions.value].reverse().find(r => r.open)?.a.id || 'meadow'
const toHero = () => { const r = REGIONS[focusRegion()]; centreOn(r.x, r.y, Math.max(view.s, 0.9)) }
const at = (x, y) => ({ transform: `translate(${x * view.s + view.tx}px, ${y * view.s + view.ty}px)` })

/* ---------- dragging, wheel and pinch ---------- */
const pointers = new Map()
let drag = null, moved = false
function onDown(e) {
  if (e.button !== undefined && e.button !== 0) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  moved = false
  drag = { tx: view.tx, ty: view.ty, x: e.clientX, y: e.clientY, s: view.s, dist: pinchDist() }
}
function pinchDist() {
  if (pointers.size < 2) return 0
  const [a, b] = [...pointers.values()]
  return Math.hypot(a.x - b.x, a.y - b.y)
}
function onMove(e) {
  if (!pointers.has(e.pointerId) || !drag) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  const rect = box.value.getBoundingClientRect()
  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    if (!drag.dist) drag = { ...drag, dist: pinchDist(), s: view.s }
    moved = true
    zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, drag.s * (pinchDist() / drag.dist))
    return
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y
  if (!moved && Math.hypot(dx, dy) < 6) return
  moved = true
  view.tx = drag.tx + dx
  view.ty = drag.ty + dy
  clamp()
}
function onUp(e) {
  pointers.delete(e.pointerId)
  if (!pointers.size) drag = null
  else drag = { tx: view.tx, ty: view.ty, x: [...pointers.values()][0].x, y: [...pointers.values()][0].y, s: view.s, dist: 0 }
}
// A drag that ends on a region does not open it
function onClickCapture(e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }
function onWheel(e) {
  e.preventDefault()
  const rect = box.value.getBoundingClientRect()
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, view.s * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0012))
}
function onKey(e) {
  const step = 80
  if (e.key === '+' || e.key === '=') zoomBy(1.25)
  else if (e.key === '-') zoomBy(0.8)
  else if (e.key === '0') showAll()
  else if (e.key === 'ArrowLeft') { view.tx += step; clamp() }
  else if (e.key === 'ArrowRight') { view.tx -= step; clamp() }
  else if (e.key === 'ArrowUp') { view.ty += step; clamp() }
  else if (e.key === 'ArrowDown') { view.ty -= step; clamp() }
  else if (e.key === 'Escape' && full.value) toggleFull()
  else return
  e.preventDefault()
}
function toggleFull() {
  const c = { x: (size.w / 2 - view.tx) / view.s, y: (size.h / 2 - view.ty) / view.s }
  full.value = !full.value
  document.body.classList.toggle('map-full', full.value)
  nextTick(() => { measure(); centreOn(c.x, c.y, view.s, false) })
}

let ro
function measure() {
  if (!box.value) return
  size.w = box.value.clientWidth
  size.h = box.value.clientHeight
  clamp()
}
onMounted(() => {
  measure()
  // The first time, it opens close in on the hero (or where the story goes next), not on the whole realm
  if (saved) centreOn(saved.x, saved.y, saved.s, false)
  else { const r = REGIONS[focusRegion()]; centreOn(r.x, r.y, OPEN_ZOOM, false) }
  ro = new ResizeObserver(measure)
  ro.observe(box.value)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
})
onUnmounted(() => {
  document.body.classList.remove('map-full')
  saved = { x: (size.w / 2 - view.tx) / view.s, y: (size.h / 2 - view.ty) / view.s, s: view.s }
  ro?.disconnect()
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
})
</script>

<template>
  <section class="world" :class="{ full }" :aria-label="$t('world.map')">
    <div ref="box" class="viewport" :class="{ animating, dragging: moved }" tabindex="0" :aria-label="$t('world.mapHelp')"
      @pointerdown="onDown" @wheel="onWheel" @click.capture="onClickCapture" @keydown="onKey" @dragstart.prevent>
      <!-- The land, drawn to scale -->
      <svg class="board" :width="MAP_W" :height="MAP_H" :viewBox="`0 0 ${MAP_W} ${MAP_H}`" aria-hidden="true"
        :style="{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})` }">
        <defs>
          <linearGradient id="map-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" class="land-a" /><stop offset="1" class="land-b" />
          </linearGradient>
          <radialGradient id="map-glow"><stop offset="0" class="glow-a" /><stop offset="1" class="glow-b" /></radialGradient>
        </defs>
        <path class="shore" :d="LAND" /><path class="shore" :d="ISLAND" />
        <path class="land" :d="LAND" />
        <path class="land" :d="ISLAND" />
        <template v-for="r in regions" :key="'g' + r.a.id">
          <ellipse :cx="r.r.x" :cy="r.r.y" rx="230" ry="160" fill="url(#map-glow)" :class="{ dim: !r.open }" />
          <GameIcon class="emblem" :class="{ dim: !r.open }" :name="r.a.icon" :x="r.r.x - 130" :y="r.r.y - 150" :size="260" />
        </template>
        <path v-for="(r, i) in roads" :key="'r' + i" class="road" :class="{ walked: r.walked }" :d="r.d" />
      </svg>

      <!-- Places that are not regions: the town, the tower, the weekly arena -->
      <router-link v-for="l in landmarks" :key="l.id" :to="l.to" class="landmark" :style="at(l.x, l.y)" :aria-label="$t(`world.landmarks.${l.id}`)">
        <ItemTile :icon="l.icon" tint="#3a3550" size="md" :tip="false" />
        <span class="plate small-plate">{{ $t(`world.landmarks.${l.id}`) }}</span>
      </router-link>

      <!-- The regions -->
      <router-link v-for="r in regions" :key="r.a.id" :to="regionPath(r.a.id)" class="node" :class="{ locked: !r.open, here: here === r.a.id }"
        :style="at(r.r.x, r.r.y)" :data-tut="'region:' + r.a.id" :data-focus="'region:' + r.a.id" :aria-label="label(r)">
        <span class="tile-wrap">
          <ItemTile :icon="r.open ? r.a.icon : 'padlock'" :tint="r.open ? '#6b5a3a' : '#2a2838'" size="lg" :tip="false" />
          <span v-if="r.open" class="pips" aria-hidden="true"><i v-for="n in r.p.total" :key="n" :class="{ on: n <= r.p.met }" /></span>
        </span>
        <span class="plate">
          <b class="name">{{ r.a.name }}</b>
          <span class="lvl">{{ $t('world.level', { n: r.a.recLvl }) }}</span>
        </span>
        <span v-if="here === r.a.id" class="hero-pin" aria-hidden="true"><ItemTile :icon="state.avatar" :tint="state.tint" size="xs" :tip="false" /></span>
        <span v-if="r.marks.length" class="marks" aria-hidden="true">
          <span v-for="m in r.marks" :key="m.k" class="mark" :class="m.k" v-tooltip.top="m.text"><GameIcon :name="MARK_ICONS[m.k]" :size="12" /></span>
        </span>
      </router-link>

      <!-- Closer in: the dungeon and bosses of each region, in a row under its name -->
      <template v-if="view.s >= DETAIL">
        <div v-for="r in withExtras" :key="'x' + r.a.id" class="extras" :style="at(r.r.x, r.r.y)">
          <span class="extras-row">
            <router-link v-if="r.dungeon" :to="regionPath(r.a.id)" class="pin dungeon" :aria-label="$t('world.dungeon') + ': ' + r.dungeon.name" v-tooltip.bottom="r.dungeon.name"
              @click="focusOn('dungeon:' + r.dungeon.id)"><GameIcon :name="r.dungeon.icon" :size="15" /></router-link>
            <router-link v-for="b in r.bosses" :key="b.id" :to="regionPath(r.a.id)" class="pin boss" :class="{ beaten: (state.bestiary.kills[b.id] || 0) > 0 }"
              :aria-label="b.name" v-tooltip.bottom="b.name" @click="focusOn('monster:' + b.id)"><GameIcon :name="b.icon" :size="15" /></router-link>
          </span>
        </div>
      </template>
    </div>

    <!-- Controls -->
    <div class="tools">
      <button type="button" :aria-label="$t('world.zoomIn')" v-tooltip.left="$t('world.zoomIn')" @click="zoomBy(1.3)"><i class="pi pi-plus" /></button>
      <button type="button" :aria-label="$t('world.zoomOut')" v-tooltip.left="$t('world.zoomOut')" @click="zoomBy(0.77)"><i class="pi pi-minus" /></button>
      <button type="button" :aria-label="$t('world.showAll')" v-tooltip.left="$t('world.showAll')" @click="showAll"><i class="pi pi-expand" /></button>
      <button type="button" :aria-label="$t('world.toHero')" v-tooltip.left="$t('world.toHero')" @click="toHero"><i class="pi pi-map-marker" /></button>
      <button type="button" :aria-label="$t(full ? 'world.exitFull' : 'world.full')" v-tooltip.left="$t(full ? 'world.exitFull' : 'world.full')" @click="toggleFull">
        <i class="pi" :class="full ? 'pi-window-minimize' : 'pi-window-maximize'" />
      </button>
    </div>
    <div class="hint small">{{ view.s < DETAIL ? $t('world.zoomHint') : $t('world.dragHint') }}</div>
  </section>
</template>

<style scoped>
/* Built from the interface's own pieces: panel surfaces, gold lines, item tiles and tags */
.world { position: relative; border-radius: 18px; border: 1px solid var(--line); overflow: hidden; height: clamp(440px, calc(100vh - var(--topbar-h, 80px) - 210px), 1000px); background: var(--bg-2); }
:global(body.map-full .dock) { display: none; }
.world.full { position: fixed; inset: 0; z-index: 1000; height: auto; border-radius: 0; border: 0; }
.viewport { position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none; user-select: none;
  background: radial-gradient(ellipse 70% 60% at 50% 45%, color-mix(in srgb, var(--gold) 7%, transparent), transparent 70%), var(--bg-2); }
.viewport:focus-visible { outline: 2px solid var(--gold); outline-offset: -3px; }
.viewport.dragging { cursor: grabbing; }
.board { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
.animating .board, .animating .node, .animating .landmark, .animating .extras { transition: transform 0.3s ease; }

.land-a { stop-color: var(--panel-hi); }
.land-b { stop-color: var(--panel-solid); }
.glow-a { stop-color: var(--gold); stop-opacity: 0.09; }
.glow-b { stop-color: var(--gold); stop-opacity: 0; }
.shore { fill: none; stroke: var(--gold); stroke-opacity: 0.06; stroke-width: 22; stroke-linejoin: round; }
.land { fill: url(#map-land); stroke: var(--line-hi); stroke-width: 2; }
.emblem { color: var(--gold); opacity: 0.06; }
.dim { opacity: 0.02; }
ellipse.dim { opacity: 0.3; }
.road { fill: none; stroke: var(--line-hi); stroke-width: 3; stroke-dasharray: 2 12; stroke-linecap: round; }
.road.walked { stroke: var(--gold); stroke-dasharray: none; opacity: 0.6; }

/* Things laid over the board keep their size whatever the zoom */
.node, .landmark, .extras { position: absolute; left: 0; top: 0; text-decoration: none; color: var(--ink); }
.node { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 180px; margin: -32px 0 0 -90px; text-align: center; border-radius: 14px; }
.node:focus-visible, .landmark:focus-visible, .pin:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.tile-wrap { position: relative; border-radius: 14px; transition: transform 0.15s, box-shadow 0.15s; }
.node:hover .tile-wrap { transform: translateY(-2px); }
.node.here .tile-wrap { box-shadow: 0 0 0 2px var(--gold), 0 0 24px -4px var(--gold); }
.node.locked .tile-wrap { opacity: 0.75; }
.pips { position: absolute; left: 50%; bottom: -7px; translate: -50% 0; display: flex; gap: 3px; padding: 2px 5px; border-radius: 99px; background: var(--panel-solid); border: 1px solid var(--line); }
.pips i { width: 6px; height: 6px; border-radius: 50%; background: var(--tint-3); }
.pips i.on { background: var(--gold); }
.plate { display: flex; flex-direction: column; align-items: center; padding: 4px 10px; border-radius: 10px; background: var(--panel); border: 1px solid var(--line); backdrop-filter: blur(8px); line-height: 1.25; }
.node:hover .plate { border-color: var(--line-hi); }
.name { font-size: 14px; font-weight: 800; }
.lvl { font-size: 12px; color: var(--muted); }
.node.locked .name { color: var(--muted); }
.small-plate { font-size: 12.5px; font-weight: 700; color: var(--ink-2); }
.hero-pin { position: absolute; top: -14px; left: calc(50% + 22px); border-radius: 8px; box-shadow: 0 0 0 2px var(--gold); }
.marks { position: absolute; top: -8px; left: calc(50% - 50px); display: flex; flex-direction: column; gap: 3px; }
.mark { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--panel-solid); border: 1px solid var(--line-hi); color: var(--gold-hi); flex-shrink: 0; }
.mark.slayer { border-color: color-mix(in srgb, var(--danger) 50%, transparent); color: var(--tag-bad); }

.landmark { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 150px; margin: -23px 0 0 -75px; text-align: center; }
/* The row sits right under the region's card */
.extras { width: 0; margin-top: 92px; }
.extras-row { display: flex; gap: 6px; transform: translateX(-50%); width: max-content; }
.pin { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; background: var(--panel-solid); border: 1px solid var(--line); color: var(--gold-hi); text-decoration: none; }
.pin.dungeon { color: var(--tag-bad); }
.pin.boss.beaten { border-color: var(--line-hi); }
.pin:hover { border-color: var(--gold); }

.tools { position: absolute; top: 14px; right: 14px; display: flex; flex-direction: column; gap: 6px; z-index: 2; }
.tools button { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-solid); color: var(--ink); cursor: pointer; display: grid; place-items: center; }
.tools button:hover { border-color: var(--line-hi); color: var(--gold-hi); }
.tools button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.hint { position: absolute; left: 14px; bottom: 12px; padding: 4px 10px; border-radius: 8px; background: var(--panel); border: 1px solid var(--line); color: var(--muted); pointer-events: none; z-index: 2; }
@media (max-width: 760px) { .world { height: 62vh; min-height: 380px; } }
</style>
