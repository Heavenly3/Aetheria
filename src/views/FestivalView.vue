<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { FESTIVALS, TOKENS, festivalAt, nextFestival, windowFor, shopFor } from '../game/data/festivals.js'
import { TITLE_MAP, titled } from '../game/data/cosmetics.js'
import { PET_MAP } from '../game/data/pets.js'
import { ITEMS } from '../game/data/items.js'
import { fmt, fmtTime } from '../game/format.js'
import { intlLocale } from '../i18n/index.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import HelpTip from '../components/HelpTip.vue'

const { t } = useI18n()
// Re-render the countdowns every minute
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 30000)))
onUnmounted(() => clearInterval(timer))

const win = computed(() => festivalAt(new Date(now.value)))
const next = computed(() => nextFestival(new Date(now.value)))
const f = computed(() => win.value?.festival || null)
const fst = computed(() => (f.value ? G.festivalState() : null))
const left = computed(() => (win.value ? (win.value.end - now.value) / 1000 : 0))
const bonus = fe => Object.entries(fe.mods).map(([k, v]) => modText(k, v)).join(' · ')
const dates = w => {
  const o = { day: 'numeric', month: 'long' }
  return `${w.start.toLocaleDateString(intlLocale(), o)} – ${new Date(w.end - 1).toLocaleDateString(intlLocale(), o)}`
}
// Every festival in date order from today, with how many of its one-off rewards are owned
const calendar = computed(() => FESTIVALS.map(fe => {
  const unique = shopFor(fe).filter(e => e.kind !== 'item')
  return { fe, w: windowFor(fe, new Date(now.value)), owned: unique.filter(e => G.festivalOwned(e)).length, total: unique.length }
}).sort((a, b) => a.w.start - b.w.start))

function entryName(e) {
  if (e.kind === 'pet') return PET_MAP[e.ref].name
  if (e.kind === 'title') return t('festival.kinds.title')
  if (e.kind === 'avatar') return t('festival.kinds.avatar')
  if (e.kind === 'tint') return t('festival.kinds.tint')
  return (e.qty > 1 ? e.qty + '× ' : '') + ITEMS[e.ref].name
}
function entryDesc(e) {
  if (e.kind === 'pet') return [PET_MAP[e.ref].desc, Object.entries(PET_MAP[e.ref].mods).map(([k, v]) => modText(k, v)).join(' · ')].join(' ')
  if (e.kind === 'title') return titled(state.name, TITLE_MAP[e.ref])
  if (e.kind === 'avatar') return t('festival.kinds.avatarHint')
  if (e.kind === 'tint') return t('festival.kinds.tintHint')
  return ITEMS[e.ref].desc || t(`itemTypes.${ITEMS[e.ref].type}`)
}
function buy(e) {
  if (!G.buyFestival(e.id)) return
  play('coin')
  G.toast(f.value.icon, 'festival.bought', { item: entryName(e) }, 'success')
}
</script>

<template>
  <div>
    <template v-if="f">
      <div class="banner fest-banner" :style="{ '--c': f.tint }">
        <GameIcon :name="f.icon" :size="220" class="banner-ghost" />
        <ItemTile :icon="f.icon" :tint="f.tint" size="xl" :tip="false" />
        <div class="grow">
          <h2 class="banner-title">{{ f.name }}</h2>
          <p class="banner-desc">{{ f.desc }}</p>
          <div class="row wrap" style="gap:6px">
            <span class="tag gold"><i class="pi pi-clock" /> {{ $t('festival.endsIn', { time: fmtTime(left) }) }}</span>
            <span class="tag ok">{{ $t('festival.bonus') }}: {{ bonus(f) }}</span>
          </div>
        </div>
        <div class="stack tokens" style="gap:2px;align-items:center">
          <span class="lvl-big tnum">{{ fmt(fst.tokens) }}</span>
          <span class="lvl-label">{{ $t('festival.tokens') }}</span>
        </div>
      </div>

      <div class="panel pad how">
        <h3 class="panel-title"><GameIcon name="two-coins" /> {{ $t('festival.howTitle') }}</h3>
        <ul>
          <li>{{ $t('festival.how.actions', { pct: Math.round(TOKENS.actionChance * 100) }) }}</li>
          <li>{{ $t('festival.how.kills', { pct: Math.round(TOKENS.killChance * 100), boss: TOKENS.boss }) }}</li>
          <li>{{ $t('festival.how.tasks', { n: TOKENS.task }) }}</li>
        </ul>
        <p class="small faint" style="margin:0">{{ $t('festival.resetHint', { n: fmt(fst.earned) }) }}</p>
      </div>

      <div class="section-title">{{ $t('festival.shop') }} <HelpTip k="sections.festShop" /></div>
      <div class="grid-wide">
        <div v-for="e in G.festivalShop()" :key="e.id" class="card shop-entry" :class="{ done: G.festivalOwned(e) }" :style="{ '--c': f.tint }">
          <div class="row">
            <ItemTile v-if="e.kind === 'pet'" :icon="PET_MAP[e.ref].icon" :tint="PET_MAP[e.ref].tint" size="md" :tip="false" />
            <ItemTile v-else-if="e.kind === 'avatar'" :icon="e.ref" :tint="state.tint" size="md" :tip="false" />
            <span v-else-if="e.kind === 'tint'" class="swatch-big" :style="{ background: e.ref }" />
            <ItemTile v-else-if="e.kind === 'title'" icon="scroll-quill" :tint="f.tint" size="md" :tip="false" />
            <ItemTile v-else :item="e.ref" size="md" />
            <div class="grow" style="min-width:0">
              <div class="card-name">{{ entryName(e) }}</div>
              <div class="card-sub" :class="{ 'title-preview': e.kind === 'title' }">{{ entryDesc(e) }}</div>
            </div>
          </div>
          <div class="row" style="margin-top:12px">
            <span class="grow tag gold tnum"><GameIcon :name="f.icon" :size="13" /> {{ fmt(e.cost) }}</span>
            <span v-if="G.festivalOwned(e)" class="small ok-text"><i class="pi pi-check" /> {{ $t('festival.owned') }}</span>
            <Button v-else :label="$t('festival.buy')" size="small" :disabled="!G.canBuyFestival(e)" @click="buy(e)" />
          </div>
        </div>
      </div>
    </template>

    <div v-else class="panel pad quiet">
      <GameIcon :name="next.festival.icon" :size="46" />
      <h2 class="banner-title" style="font-size:24px">{{ $t('festival.none') }}</h2>
      <p class="muted" style="margin:6px 0 0">{{ $t('festival.next', { name: next.festival.name, time: fmtTime((next.start - now) / 1000) }) }}</p>
    </div>

    <div class="section-title">{{ $t('festival.calendar') }} <HelpTip k="sections.festCalendar" /></div>
    <div class="grid-wide">
      <div v-for="c in calendar" :key="c.fe.id" class="card cal" :class="{ active: f === c.fe }" :style="{ '--c': c.fe.tint }">
        <div class="row">
          <ItemTile :icon="c.fe.icon" :tint="c.fe.tint" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ c.fe.name }}</div>
            <div class="card-sub">{{ dates(c.w) }}</div>
          </div>
          <span class="tag tnum" :class="{ ok: c.owned === c.total }">{{ c.owned }}/{{ c.total }}</span>
        </div>
        <p class="small muted" style="margin:10px 0 0">{{ c.fe.desc }}</p>
        <p class="small" style="margin:6px 0 0"><span class="faint">{{ $t('festival.bonus') }}:</span> {{ bonus(c.fe) }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fest-banner { margin-bottom: 18px; }
.tokens { min-width: 110px; }
.how ul { margin: 0 0 10px; padding-inline-start: 20px; color: var(--ink-2); line-height: 1.7; }
.shop-entry { display: flex; flex-direction: column; justify-content: space-between; }
.title-preview { font-family: var(--font-display); font-size: 14px; color: var(--gold-hi); }
.swatch-big { width: 54px; height: 54px; border-radius: 14px; flex-shrink: 0; box-shadow: inset 0 0 0 2px var(--tint-border); }
.quiet { text-align: center; padding: 36px 20px; }
.quiet .gi { color: var(--faint); }
.cal.active { border-color: color-mix(in srgb, var(--c) 60%, transparent); }
</style>
