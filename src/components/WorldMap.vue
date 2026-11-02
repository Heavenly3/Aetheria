<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { AREAS } from '../game/data/combat.js'
import { QUESTS } from '../game/data/progression.js'
import { REGIONS, LANDMARKS, DUNGEON_AT, SPOTS, MAP_W, MAP_H, regionOfActivity, regionPath, regionDungeon, regionBosses } from '../game/data/world.js'
import { regionMarks, regionProgress, MARK_ICONS, MARK_ORDER } from '../ui/worldMarks.js'
import { throttled } from '../ui/throttled.js'
import { focusOn } from '../ui/focus.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

/*
  The map of the realm, drawn on a 2000 × 1200 board that can be dragged and zoomed (wheel, pinch,
  buttons or keys). The land scales with the zoom; regions and markers stay the same size on top of
  it. Dungeons and bosses show once zoomed in a little, and the places of each region closer still.
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
const landmarks = computed(() => LANDMARKS.filter(l => G.screenOpen(l.to)))
const label = r => [r.a.name, t('world.level', { n: r.a.recLvl }), r.open ? t('world.progress', { n: r.p.met, total: r.p.total }) : t('world.locked', { quest: questName(r.a.reqQuest) }),
  here.value === r.a.id ? t('world.here') : null, ...r.marks.map(m => m.text)].filter(Boolean).join('. ')

/* ---------- the drawing: roads, rivers, ground and what stands on it ---------- */
const roads = computed(() => regions.value.slice(1).map((r, i) => {
  const from = regions.value[i].r, to = r.r, bend = i % 2 ? 70 : -70
  return { d: `M${from.x},${from.y} Q${(from.x + to.x) / 2 + bend},${(from.y + to.y) / 2 - bend * 0.7} ${to.x},${to.y}`, walked: regions.value[i].p.visited && r.p.visited }
}))
// Deterministic scatter, so the map looks the same every visit
function seeded(str) {
  let h = 2166136261
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296
}
const decor = Object.entries(REGIONS).flatMap(([id, r]) => {
  const rnd = seeded(id)
  return r.decor.map((icon, i) => {
    const ang = (i / r.decor.length) * Math.PI * 2 + rnd() * 0.6, dist = 105 + rnd() * 95, size = 38 + rnd() * 22
    return { icon, tint: r.tint, x: r.x + Math.cos(ang) * dist * 1.25 - size / 2, y: r.y + Math.sin(ang) * dist * 0.8 - size / 2, size }
  })
})
const waves = (() => {
  const rnd = seeded('sea'), out = []
  for (let i = 0; i < 70; i++) out.push({ x: rnd() * MAP_W, y: rnd() * MAP_H })
  return out
})()
const SEA_LIFE = [
  { icon: 'seagull', x: 120, y: 260, size: 40 }, { icon: 'seagull', x: 990, y: 70, size: 34 }, { icon: 'circling-fish', x: 1240, y: 1110, size: 46 },
  { icon: 'circling-fish', x: 60, y: 640, size: 40 }, { icon: 'kraken-tentacle', x: 1050, y: 1120, size: 58 },
]
const LAND = 'M90,1010 C40,860 120,700 150,560 C180,400 230,300 330,250 C450,190 560,230 660,200 C780,160 900,210 1000,170 C1100,120 1240,150 1330,230 C1420,300 1520,330 1620,360 C1760,400 1900,430 1930,560 C1960,700 1880,800 1830,900 C1770,1020 1640,1080 1500,1060 C1380,1045 1290,1090 1170,1080 C1040,1070 940,1110 820,1100 C640,1090 500,1140 360,1120 C240,1105 130,1110 90,1010 Z'
const ISLAND = 'M1560,230 C1560,150 1640,95 1730,100 C1820,105 1880,160 1870,230 C1860,290 1790,320 1720,315 C1630,310 1560,290 1560,230 Z'
const RIVER = 'M1130,380 C1100,470 980,520 960,600 C940,680 900,740 860,820 C820,900 830,980 790,1100'
const RIDGE = [[300, 400], [360, 360], [520, 400], [600, 330], [930, 300], [1010, 250], [1230, 300], [1290, 400]]

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
const PLACES = 1.15
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
  if (saved) centreOn(saved.x, saved.y, saved.s, false)
  else if (size.w < 700) { const r = REGIONS[focusRegion()]; centreOn(r.x, r.y, 0.75, false) }
  else { view.s = fit(); clamp() }
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
          <radialGradient v-for="r in regions" :id="'rg-' + r.a.id" :key="r.a.id">
            <stop offset="0%" :stop-color="r.r.tint" stop-opacity="0.38" />
            <stop offset="100%" :stop-color="r.r.tint" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect class="sea" :width="MAP_W" :height="MAP_H" />
        <path v-for="(w, i) in waves" :key="'w' + i" class="wave" :d="`M${w.x},${w.y} q12,-8 24,0 t24,0`" />
        <GameIcon v-for="(c, i) in SEA_LIFE" :key="'s' + i" class="sea-life" :name="c.icon" :x="c.x" :y="c.y" :size="c.size" />
        <path class="shallows" :d="LAND" /><path class="shallows" :d="ISLAND" />
        <path class="land" :d="LAND" />
        <ellipse class="cloud" cx="1600" cy="300" rx="120" ry="34" /><ellipse class="cloud" cx="1840" cy="300" rx="110" ry="30" />
        <path class="land isle" :d="ISLAND" />
        <ellipse v-for="r in regions" :key="'g' + r.a.id" :cx="r.r.x" :cy="r.r.y" rx="260" ry="185" :fill="`url(#rg-${r.a.id})`" />
        <ellipse class="crater" cx="1560" cy="930" rx="150" ry="70" />
        <path class="rift" d="M1690,470 L1735,520 L1712,548 L1770,600 L1748,625 L1820,690 L1770,640 L1790,612 L1730,565 L1752,540 Z" />
        <path class="river" :d="RIVER" />
        <GameIcon v-for="([x, y], i) in RIDGE" :key="'m' + i" class="ridge" name="peaks" :x="x - 34" :y="y - 34" :size="68" />
        <GameIcon v-for="(d, i) in decor" :key="'d' + i" class="decor" :name="d.icon" :x="d.x" :y="d.y" :size="d.size" :style="{ color: d.tint }" />
        <path v-for="(r, i) in roads" :key="'r' + i" class="road" :class="{ walked: r.walked }" :d="r.d" />
        <g class="compass" transform="translate(1880,1090)">
          <circle r="58" />
          <path d="M0,-70 L12,0 L0,70 L-12,0 Z" /><path d="M-70,0 L0,-12 L70,0 L0,12 Z" class="faint-arm" />
          <text y="-80" text-anchor="middle">N</text>
        </g>
      </svg>

      <!-- Places that are not regions: the town, the tower, the weekly arena -->
      <router-link v-for="l in landmarks" :key="l.id" :to="l.to" class="landmark" :style="at(l.x, l.y)" :aria-label="$t(`world.landmarks.${l.id}`)">
        <span class="lm-ring"><GameIcon :name="l.icon" :size="22" /></span>
        <span class="lm-name">{{ $t(`world.landmarks.${l.id}`) }}</span>
      </router-link>

      <!-- Closer in: dungeons and bosses, then the places of each region -->
      <template v-if="view.s >= DETAIL">
        <template v-for="r in regions" :key="'x' + r.a.id">
          <router-link v-if="r.dungeon" :to="regionPath(r.a.id)" class="pin dungeon" :class="{ locked: !r.open }" :style="at(r.r.x + (r.r.dungeonAt || DUNGEON_AT)[0], r.r.y + (r.r.dungeonAt || DUNGEON_AT)[1])"
            :aria-label="$t('world.dungeon') + ': ' + r.dungeon.name" v-tooltip.top="r.dungeon.name" @click="focusOn('dungeon:' + r.dungeon.id)">
            <GameIcon :name="r.dungeon.icon" :size="18" />
          </router-link>
          <router-link v-for="(b, i) in r.bosses" :key="b.id" :to="regionPath(r.a.id)" class="pin boss" :class="{ locked: !r.open, beaten: (state.bestiary.kills[b.id] || 0) > 0 }"
            :style="at(r.r.x + 150, r.r.y - 80 + i * 56)" :aria-label="b.name" v-tooltip.top="b.name" @click="focusOn('monster:' + b.id)">
            <GameIcon :name="b.icon" :size="18" />
          </router-link>
          <template v-if="view.s >= PLACES && r.open">
            <router-link v-for="(m, i) in r.a.monsters" :key="m.id" :to="regionPath(r.a.id)" class="place" :style="at(r.r.x + (r.r.spots || SPOTS)[i][0], r.r.y + (r.r.spots || SPOTS)[i][1])"
              @click="focusOn('monster:' + m.id)">
              <GameIcon :name="m.icon" :size="13" /> {{ $t(`world.placeNames.${m.id}`) }}
            </router-link>
          </template>
        </template>
      </template>

      <!-- The regions -->
      <router-link v-for="r in regions" :key="r.a.id" :to="regionPath(r.a.id)" class="node" :class="{ locked: !r.open, here: here === r.a.id }"
        :style="at(r.r.x, r.r.y)" :data-tut="'region:' + r.a.id" :data-focus="'region:' + r.a.id" :aria-label="label(r)">
        <span class="ring" :style="{ '--tint': r.r.tint }">
          <GameIcon :name="r.open ? r.a.icon : 'padlock'" :size="32" />
          <span v-if="r.open" class="pips" aria-hidden="true"><i v-for="n in r.p.total" :key="n" :class="{ on: n <= r.p.met }" /></span>
        </span>
        <span class="name">{{ r.a.name }}</span>
        <span class="lvl">{{ $t('world.level', { n: r.a.recLvl }) }}</span>
        <span v-if="here === r.a.id" class="hero-pin" aria-hidden="true"><ItemTile :icon="state.avatar" :tint="state.tint" size="xs" :tip="false" /></span>
        <span v-if="r.marks.length" class="marks" aria-hidden="true">
          <span v-for="m in r.marks" :key="m.k" class="mark" :class="m.k" v-tooltip.top="m.text"><GameIcon :name="MARK_ICONS[m.k]" :size="12" /></span>
        </span>
      </router-link>
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
.world { position: relative; border-radius: 18px; border: 1px solid var(--line); overflow: hidden; height: clamp(440px, calc(100vh - var(--topbar-h, 80px) - 210px), 1000px);
  --sea: color-mix(in srgb, #2a5a7a 30%, var(--bg)); --land: color-mix(in srgb, var(--panel-solid) 86%, #6b5a3a); }
:root[data-theme="light"] .world { --sea: #c8d9df; --land: #ebe0c8; }
/* Full screen: over everything, the activity dock included */
:global(body.map-full .dock) { display: none; }
.world.full { position: fixed; inset: 0; z-index: 1000; height: auto; border-radius: 0; border: 0; }
.viewport { position: absolute; inset: 0; overflow: hidden; cursor: grab; touch-action: none; user-select: none; background: var(--sea); }
.viewport:focus-visible { outline: 2px solid var(--gold); outline-offset: -3px; }
.viewport.dragging { cursor: grabbing; }
.board { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
.animating .board, .animating .node, .animating .landmark, .animating .pin, .animating .place { transition: transform 0.3s ease; }

.sea { fill: var(--sea); }
.wave { fill: none; stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 2.5; stroke-linecap: round; }
.sea-life { color: color-mix(in srgb, var(--ink) 22%, transparent); }
.shallows { fill: none; stroke: color-mix(in srgb, #7ab8e0 30%, transparent); stroke-width: 34; stroke-linejoin: round; }
.land { fill: var(--land); stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 2.5; }
.land.isle { filter: drop-shadow(0 18px 18px rgba(0, 0, 0, 0.35)); }
.cloud { fill: color-mix(in srgb, #ffffff 35%, transparent); }
.crater { fill: color-mix(in srgb, #2a0a3a 45%, transparent); }
.rift { fill: color-mix(in srgb, #12051f 80%, transparent); stroke: #8a5cff; stroke-width: 2; }
.river { fill: none; stroke: color-mix(in srgb, #4a8ab8 70%, var(--land)); stroke-width: 12; stroke-linecap: round; }
.ridge { color: color-mix(in srgb, var(--ink) 30%, var(--land)); }
.decor { opacity: 0.6; }
:root[data-theme="light"] .decor { filter: brightness(0.7); }
.road { fill: none; stroke: color-mix(in srgb, var(--ink) 35%, transparent); stroke-width: 5; stroke-dasharray: 3 14; stroke-linecap: round; }
.road.walked { stroke: var(--gold); stroke-dasharray: none; opacity: 0.7; }
.compass circle { fill: color-mix(in srgb, var(--panel-solid) 60%, transparent); stroke: color-mix(in srgb, var(--gold) 60%, transparent); stroke-width: 2; }
.compass path { fill: var(--gold); }
.compass .faint-arm { opacity: 0.5; }
.compass text { fill: var(--gold); font: 700 26px var(--font-display); }

/* Things laid over the board keep their size whatever the zoom */
.node, .landmark, .pin, .place { position: absolute; left: 0; top: 0; text-decoration: none; color: var(--ink); }
.node { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 160px; margin: -34px 0 0 -80px; text-align: center; border-radius: 14px; }
.node:focus-visible, .landmark:focus-visible, .pin:focus-visible, .place:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.ring { position: relative; width: 68px; height: 68px; border-radius: 50%; display: grid; place-items: center; color: var(--ink);
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--tint) 30%, var(--panel-solid)), var(--panel-solid) 75%);
  border: 2px solid color-mix(in srgb, var(--gold) 70%, transparent); box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.7); transition: box-shadow 0.15s; }
.node:hover .ring { box-shadow: 0 0 0 5px color-mix(in srgb, var(--gold) 22%, transparent), 0 8px 20px -8px rgba(0, 0, 0, 0.7); }
.node.here .ring { border-width: 3px; border-color: var(--gold); box-shadow: 0 0 24px -3px var(--gold); }
.node.locked .ring { border-color: var(--line-hi); color: var(--faint); background: var(--panel-solid); }
.node.locked .name, .node.locked .lvl { color: var(--muted); }
.pips { position: absolute; bottom: -6px; display: flex; gap: 3px; padding: 2px 5px; border-radius: 99px; background: var(--panel-solid); border: 1px solid var(--line); }
.pips i { width: 6px; height: 6px; border-radius: 50%; background: var(--tint-3); }
.pips i.on { background: var(--gold); }
.name, .lvl, .lm-name { padding: 0 6px; border-radius: 6px; background: color-mix(in srgb, var(--panel-solid) 72%, transparent); }
.name { font-weight: 800; font-size: 14.5px; margin-top: 7px; line-height: 1.3; }
.lvl { font-size: 12.5px; color: var(--muted); }
.hero-pin { position: absolute; top: -20px; left: calc(50% + 16px); border-radius: 8px; box-shadow: 0 0 0 2px var(--gold); }
.marks { position: absolute; top: -12px; left: calc(50% - 50px); display: flex; flex-direction: column; gap: 3px; }
.mark { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--panel-solid); border: 1px solid var(--c, var(--gold)); color: var(--c, var(--gold)); flex-shrink: 0; }
.mark.story { --c: var(--gold); }
.mark.quest { --c: #7ab8e0; }
.mark.slayer { --c: var(--danger); }
.mark.guild { --c: #b48cff; }
.mark.task { --c: var(--ok); }
:root[data-theme="light"] .mark.quest { --c: #2f6f9f; }
:root[data-theme="light"] .mark.guild { --c: #6a3fbf; }

.landmark { display: flex; flex-direction: column; align-items: center; width: 130px; margin: -22px 0 0 -65px; text-align: center; gap: 3px; }
.lm-ring { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--panel-solid); border: 1px solid var(--line-hi); color: var(--gold-hi); transform: rotate(45deg); }
.lm-ring :deep(svg) { transform: rotate(-45deg); }
.lm-name { font-size: 12.5px; font-weight: 700; margin-top: 4px; }
.pin { width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 10px; display: grid; place-items: center; background: var(--panel-solid); border: 1px solid; }
.pin.dungeon { border-color: color-mix(in srgb, var(--danger) 60%, transparent); color: var(--tag-bad); }
.pin.boss { border-color: color-mix(in srgb, var(--gold) 60%, transparent); color: var(--gold-hi); border-radius: 50%; }
.pin.boss.beaten { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ok) 50%, transparent); }
.pin.locked { opacity: 0.55; }
.place { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 99px; font-size: 12px; font-weight: 700; white-space: nowrap;
  background: color-mix(in srgb, var(--panel-solid) 88%, transparent); border: 1px solid var(--line-hi); translate: -50% -50%; }
.place:hover { border-color: var(--gold); }

.tools { position: absolute; top: 12px; right: 12px; display: flex; flex-direction: column; gap: 6px; z-index: 2; }
.tools button { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line-hi); background: var(--panel-solid); color: var(--ink); cursor: pointer; display: grid; place-items: center; }
.tools button:hover { border-color: var(--gold); color: var(--gold-hi); }
.tools button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.hint { position: absolute; left: 12px; bottom: 10px; padding: 4px 10px; border-radius: 8px; background: color-mix(in srgb, var(--panel-solid) 85%, transparent); color: var(--muted); pointer-events: none; z-index: 2; }
@media (max-width: 760px) { .world { height: 62vh; min-height: 380px; } }
</style>
