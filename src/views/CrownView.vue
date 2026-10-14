<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { SHARDS, SHARD_MAP, ENDINGS } from '../game/data/crown.js'
import { fmtTime } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'

const { t } = useI18n()
const confirm = useConfirm()
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))

const crown = computed(() => (G.ensureCrown(), state.crown))
const names = computed(() => G.journalNames())
const total = SHARDS.length
const found = computed(() => G.shardsFound())
const sockets = computed(() => crown.value.sockets)
const freeSocket = computed(() => sockets.value.indexOf(null))
const mods = m => Object.entries(m).map(([k, v]) => modText(k, v)).join(' · ')
// The gems of the drawing, spread along the top of the crown
const gems = computed(() => SHARDS.map((s, i) => {
  const a = Math.PI * (1.08 - (i / (total - 1)) * 1.16)
  return { s, x: 50 + Math.cos(a) * 42, y: 74 - Math.sin(a) * 58, on: G.shardFound(s.id) }
}))

function setIn(id) {
  if (freeSocket.value < 0) return
  G.setSocket(freeSocket.value, id)
  play('coin')
}
function takeOut(i) { G.setSocket(i, null); play('coin') }
function usePower(id) { G.usePower(id) }
const readyIn = id => (void now.value, G.powerReadyIn(id))
const activeFor = id => (void now.value, G.powerLeft(id))

/* ---------- the choice ---------- */
const chosen = computed(() => crown.value.chosen || null)
const legacy = computed(() => (void state.legacy, G.endingsChosen()))
function choose(e) {
  const name = t(`crown.endings.${e.id}.name`)
  confirm.require({
    header: t('crown.confirmTitle'),
    message: t('crown.confirmMessage', { ending: name, desc: t(`crown.endings.${e.id}.desc`, names.value) }),
    icon: 'pi pi-star',
    acceptLabel: t('crown.confirm'), rejectLabel: t('common.cancel'), rejectProps: { severity: 'secondary', outlined: true },
    accept: () => G.chooseEnding(e.id),
  })
}
</script>

<template>
  <div>
    <!-- The crown itself -->
    <div class="banner crown-banner" style="--c:#e2b65a">
      <div class="crown-art" aria-hidden="true">
        <svg viewBox="0 0 100 80" class="circlet"><path d="M8 72 L14 34 L30 52 L50 20 L70 52 L86 34 L92 72 Z" /></svg>
        <span v-for="g in gems" :key="g.s.id" class="gem" :class="{ on: g.on, heart: g.s.heart }" :style="{ left: g.x + '%', top: g.y + '%', '--t': g.s.tint }">
          <GameIcon :name="g.on ? g.s.icon : 'padlock'" :size="15" />
        </span>
      </div>
      <div class="grow">
        <h2 class="banner-title">{{ $t('crown.title') }}</h2>
        <p class="banner-desc">{{ $t('crown.intro') }}</p>
        <div class="row wrap" style="gap:6px">
          <span class="tag gold"><GameIcon name="crown" :size="12" /> {{ $t('crown.count', { n: found, total }) }}</span>
          <span v-if="chosen" class="tag ok">{{ $t('crown.chosenNow') }} · {{ $t(`crown.endings.${chosen}.name`) }}</span>
        </div>
      </div>
    </div>

    <!-- The circlet's sockets -->
    <div class="section-title">{{ $t('crown.circlet') }}</div>
    <p class="small muted" style="margin:-4px 0 12px">{{ $t('crown.circletHint') }}</p>
    <div class="sockets">
      <div v-for="(id, i) in sockets" :key="i" class="socket" :class="{ empty: !id }" :style="id ? { '--t': SHARD_MAP[id].tint } : null">
        <template v-if="id">
          <ItemTile :icon="SHARD_MAP[id].icon" :tint="SHARD_MAP[id].tint" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <b>{{ $t(`crown.shards.${id}.name`) }}</b>
            <div class="small ok-text">{{ mods(SHARD_MAP[id].mods) }}</div>
          </div>
          <button class="mini" :aria-label="$t('crown.takeOut')" v-tooltip.top="$t('crown.takeOut')" @click="takeOut(i)"><i class="pi pi-times" /></button>
        </template>
        <span v-else class="small faint">{{ $t('crown.socketEmpty') }}</span>
      </div>
      <div class="socket heart-socket" :class="{ empty: !G.shardFound('heart') }" style="--t:#f6dc9a">
        <ItemTile :icon="G.shardFound('heart') ? 'glass-heart' : 'padlock'" :tint="G.shardFound('heart') ? '#f6dc9a' : '#2a2838'" size="md" :tip="false" />
        <div class="grow" style="min-width:0">
          <b>{{ $t('crown.heart') }}</b>
          <div class="small" :class="G.shardFound('heart') ? 'ok-text' : 'faint'">{{ G.shardFound('heart') ? mods(SHARD_MAP.heart.mods) : $t('crown.heartAsleep') }}</div>
        </div>
      </div>
    </div>

    <!-- Every shard -->
    <div class="section-title">{{ $t('crown.count', { n: found, total }) }}</div>
    <div class="grid-wide">
      <div v-for="s in SHARDS" :key="s.id" class="card shard" :class="{ locked: !G.shardFound(s.id), set: G.shardActive(s.id) }" :style="{ '--c': s.tint }">
        <div class="row">
          <ItemTile :icon="G.shardFound(s.id) ? s.icon : 'padlock'" :tint="G.shardFound(s.id) ? s.tint : '#2a2838'" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ $t(`crown.shards.${s.id}.name`) }}</div>
            <div class="card-sub">{{ G.shardFound(s.id) ? $t(`crown.shards.${s.id}.desc`) : $t('crown.where', { hint: $t(`crown.hints.${s.id}`) }) }}</div>
          </div>
        </div>
        <div class="small" style="margin-top:10px"><span class="faint">{{ $t('crown.passive') }}:</span> <span class="ok-text">{{ mods(s.mods) }}</span></div>
        <div class="power">
          <div class="grow" style="min-width:0">
            <div class="small"><span class="faint">{{ $t('crown.power') }}:</span> <b>{{ $t(`crown.powers.${s.power.id}.name`) }}</b></div>
            <div class="small muted">{{ $t(`crown.powers.${s.power.id}.desc`) }}</div>
          </div>
        </div>
        <div v-if="G.shardFound(s.id)" class="row wrap" style="gap:8px;margin-top:10px">
          <template v-if="!s.heart">
            <Button v-if="!sockets.includes(s.id)" :label="$t('crown.setIn')" icon="pi pi-plus" size="small" severity="secondary" outlined :disabled="freeSocket < 0" @click="setIn(s.id)" />
            <Button v-else :label="$t('crown.takeOut')" icon="pi pi-minus" size="small" severity="secondary" text @click="takeOut(sockets.indexOf(s.id))" />
          </template>
          <span class="grow" />
          <span v-if="activeFor(s.id) > 0" class="tag ok">{{ $t('crown.activeFor', { time: fmtTime(activeFor(s.id) / 1000) }) }}</span>
          <Button v-else-if="readyIn(s.id) > 0" :label="$t('crown.readyIn', { time: fmtTime(readyIn(s.id) / 1000) })" icon="pi pi-clock" size="small" disabled />
          <span v-else-if="!G.shardActive(s.id)" class="small faint">{{ $t('crown.setToUse') }}</span>
          <Button v-else :label="$t('crown.use')" icon="pi pi-bolt" size="small" @click="usePower(s.id)" />
        </div>
      </div>
    </div>

    <!-- The choice -->
    <div class="section-title">{{ $t('crown.choiceTitle') }}</div>
    <div class="panel pad">
      <p class="small muted" style="margin-top:0">{{ G.canChooseEnding() ? $t('crown.choiceIntro') : chosen ? '' : $t('crown.choiceLocked') }}</p>
      <div class="endings">
        <div v-for="e in ENDINGS" :key="e.id" class="ending" :class="{ chosen: chosen === e.id, before: state.legacy?.endings?.[e.id] && chosen !== e.id }" :style="{ '--c': e.tint }">
          <ItemTile :icon="e.icon" :tint="e.tint" size="lg" :tip="false" />
          <div class="card-name">{{ $t(`crown.endings.${e.id}.name`) }}</div>
          <div class="small muted">{{ $t(`crown.endings.${e.id}.desc`, names) }}</div>
          <div class="small ok-text">{{ mods(e.mods) }}</div>
          <span v-if="chosen === e.id" class="tag ok">{{ $t('crown.chosenNow') }}</span>
          <span v-else-if="state.legacy?.endings?.[e.id]" class="tag gold">{{ $t('crown.chosenBefore') }}</span>
          <Button v-if="G.canChooseEnding()" :label="$t(`crown.endings.${e.id}.action`, names)" size="small" @click="choose(e)" />
        </div>
      </div>
    </div>

    <!-- What every life keeps -->
    <div class="section-title">{{ $t('crown.legacyTitle') }}</div>
    <div class="panel pad">
      <p class="small muted" style="margin-top:0">{{ legacy.length ? $t('crown.legacyIntro') : $t('crown.legacyNone') }}</p>
      <div v-for="e in legacy" :key="e.id" class="row small legacy">
        <GameIcon :name="e.icon" :size="16" />
        <b class="grow">{{ $t(`crown.endings.${e.id}.name`) }}</b>
        <span class="ok-text">{{ mods(e.mods) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crown-banner { margin-bottom: 18px; }
.crown-art { position: relative; width: 210px; height: 150px; flex-shrink: 0; }
.circlet { position: absolute; inset: 10% 6% 0; width: 88%; height: 90%; fill: rgba(226, 182, 90, 0.12); stroke: var(--gold); stroke-width: 1.4; stroke-linejoin: round; }
.gem { position: absolute; transform: translate(-50%, -50%); width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  background: var(--tint-2); border: 1px solid var(--line); color: var(--faint); }
.gem.on { color: #fff; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--t) 80%, #fff), var(--t)); border-color: color-mix(in srgb, var(--t) 60%, #fff);
  box-shadow: 0 0 14px -2px var(--t); }
.gem.heart { width: 34px; height: 34px; }
.sockets { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.socket { display: flex; align-items: center; gap: 10px; min-height: 72px; padding: 10px 12px; border-radius: var(--radius); border: 1px solid color-mix(in srgb, var(--t, var(--gold)) 45%, transparent); background: var(--panel); }
.socket.empty { border-style: dashed; border-color: var(--line); justify-content: center; }
.heart-socket { background: linear-gradient(160deg, rgba(246, 220, 154, 0.08), var(--panel) 70%); }
.mini { background: none; border: 0; color: var(--muted); padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.mini:hover { background: var(--tint-2); color: var(--ink); }
.shard.set { border-color: color-mix(in srgb, var(--c) 55%, transparent); }
.shard.locked { opacity: 0.6; filter: none; cursor: default; }
.power { display: flex; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--line); }
.endings { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.ending { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 14px; border-radius: var(--radius); text-align: center; border: 1px solid var(--line); background: var(--tint-1); }
.ending.chosen { border-color: color-mix(in srgb, var(--c) 70%, transparent); box-shadow: 0 0 26px -10px var(--c); }
.ending.before { border-color: rgba(226, 182, 90, 0.4); }
.legacy { gap: 10px; padding: 6px 0; border-bottom: 1px dashed var(--line); }
@media (max-width: 600px) { .crown-art { width: 170px; height: 120px; } }
</style>
