<script setup>
import { ref, computed } from 'vue'
import { fmt, fmtHour } from '../game/format.js'

// Single-series line chart on one axis, with a hover crosshair and tooltip
const props = defineProps({
  points: { type: Array, default: () => [] }, // [{ t, v }]
  unit: { type: String, default: '' },
  color: { type: String, default: '#b9832c' },
  label: { type: String, default: '' },
})
const W = 640, H = 220, P = { l: 52, r: 18, t: 16, b: 30 }
const hover = ref(null)
const uid = Math.random().toString(36).slice(2, 8)

function niceMax(v) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
const t0 = computed(() => props.points[0]?.t || 0)
const t1 = computed(() => props.points[props.points.length - 1]?.t || 1)
const ymax = computed(() => niceMax(Math.max(...props.points.map(p => p.v), 0)))
const x = t => P.l + ((t - t0.value) / Math.max(1, t1.value - t0.value)) * (W - P.l - P.r)
const y = v => P.t + (1 - v / ymax.value) * (H - P.t - P.b)
const path = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '))
const area = computed(() => props.points.length ? `${path.value} L${x(t1.value).toFixed(1)},${y(0)} L${x(t0.value).toFixed(1)},${y(0)} Z` : '')
const yTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map(f => f * ymax.value))
const xTicks = computed(() => {
  if (props.points.length < 2) return []
  return [0, 0.25, 0.5, 0.75, 1].map(f => t0.value + f * (t1.value - t0.value))
})
const last = computed(() => props.points[props.points.length - 1])

function onMove(e) {
  const r = e.currentTarget.getBoundingClientRect()
  const px = ((e.clientX - r.left) / r.width) * W
  let best = null, bd = Infinity
  props.points.forEach(p => { const d = Math.abs(x(p.t) - px); if (d < bd) { bd = d; best = p } })
  hover.value = best
}
</script>

<template>
  <div class="lc">
    <div v-if="points.length < 2" class="lc-empty small muted">{{ $t('chart.notEnough') }}</div>
    <template v-else>
      <svg :viewBox="`0 0 ${W} ${H}`" class="lc-svg" role="img" :aria-label="label" @mousemove="onMove" @mouseleave="hover = null">
        <defs>
          <linearGradient :id="'g' + uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
            <stop offset="100%" :stop-color="color" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="grid">
          <line v-for="v in yTicks" :key="'y' + v" :x1="P.l" :x2="W - P.r" :y1="y(v)" :y2="y(v)" />
        </g>
        <g class="axis">
          <text v-for="v in yTicks" :key="'yl' + v" :x="P.l - 8" :y="y(v) + 4" text-anchor="end">{{ fmt(v) }}</text>
          <text v-for="(t, i) in xTicks" :key="'xl' + i" :x="x(t)" :y="H - 8" :text-anchor="i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'">{{ fmtHour(t) }}</text>
        </g>
        <path :d="area" :fill="`url(#g${uid})`" />
        <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <circle :cx="x(last.t)" :cy="y(last.v)" r="4.5" :fill="color" stroke="var(--panel-solid)" stroke-width="2" />
        <g v-if="hover">
          <line :x1="x(hover.t)" :x2="x(hover.t)" :y1="P.t" :y2="H - P.b" class="cross" />
          <circle :cx="x(hover.t)" :cy="y(hover.v)" r="5" :fill="color" stroke="var(--panel-solid)" stroke-width="2" />
        </g>
        <rect :x="P.l" :y="P.t" :width="W - P.l - P.r" :height="H - P.t - P.b" fill="transparent" />
      </svg>
      <div v-if="hover" class="lc-tip" :style="{ left: (x(hover.t) / W) * 100 + '%' }">
        <b class="tnum">{{ fmt(hover.v) }} {{ unit }}</b>
        <span class="muted">{{ fmtHour(hover.t) }}</span>
      </div>
      <details class="lc-table small">
        <summary class="muted">{{ $t('chart.asTable') }}</summary>
        <table>
          <thead><tr><th>{{ $t('chart.time') }}</th><th>{{ label }}</th></tr></thead>
          <tbody><tr v-for="p in points" :key="p.t"><td>{{ fmtHour(p.t) }}</td><td class="tnum">{{ fmt(p.v) }} {{ unit }}</td></tr></tbody>
        </table>
      </details>
    </template>
  </div>
</template>

<style scoped>
.lc { position: relative; }
.lc-empty { padding: 40px 10px; text-align: center; }
.lc-svg { width: 100%; height: auto; display: block; }
.grid line { stroke: var(--line); stroke-width: 1; }
.axis text { fill: var(--muted); font-size: 11px; font-family: var(--font); font-variant-numeric: tabular-nums; }
.cross { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 3; }
.lc-tip { position: absolute; top: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px; pointer-events: none;
  padding: 5px 10px; border-radius: 8px; background: var(--panel-solid); border: 1px solid var(--line); box-shadow: var(--shadow); font-size: 12.5px; white-space: nowrap; }
.lc-table { margin-top: 8px; }
.lc-table summary { cursor: pointer; }
.lc-table table { width: 100%; border-collapse: collapse; margin-top: 6px; }
.lc-table th, .lc-table td { text-align: start; padding: 4px 6px; border-bottom: 1px solid var(--line); }
.lc-table tbody { display: block; max-height: 180px; overflow-y: auto; }
.lc-table thead, .lc-table tbody tr { display: table; width: 100%; table-layout: fixed; }
</style>
