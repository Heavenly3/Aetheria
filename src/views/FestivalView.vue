<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { FESTIVALS, TOKENS, TRACK, FAIRS, FAIR_REWARDS, MARKET, TOWER_RUSH_MULT, OMEN_NIGHT_MULT, festivalAt, nextFestival, windowFor, shopFor, fairAt, upcomingFairs } from '../game/data/festivals.js'
import { TITLE_MAP, titled } from '../game/data/cosmetics.js'
import { PET_MAP } from '../game/data/pets.js'
import { ROLE_ICONS } from '../game/data/guilds.js'
import { ITEMS } from '../game/data/items.js'
import { fmt, fmtTime } from '../game/format.js'
import { intlLocale } from '../i18n/index.js'
import { guildName } from '../i18n/names.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import HelpTip from '../components/HelpTip.vue'
import FestivalActivity from '../components/FestivalActivity.vue'

const { t } = useI18n()
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))

/* ---------- the big festival ---------- */
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
const points = computed(() => fst.value?.points || 0)
const nextStep = computed(() => TRACK.find(s => s.pts > points.value) || null)
const rewardText = r => [r.tokens && t('festival.tokensN', { n: fmt(r.tokens) }), r.gold && t('inventory.goldAmount', { n: fmt(r.gold) }),
  ...Object.entries(r.items || {}).map(([k, n]) => `${n}× ${ITEMS[k].name}`)].filter(Boolean).join(' · ')
function claimStep(i) { if (G.claimTrack(i)) { play('quest'); G.toast(f.value.icon, 'festival.stepClaimed', { n: i + 1 }, 'success') } }
const ranking = computed(() => {
  if (!f.value) return []
  const all = (now.value, G.festivalRanking())
  const top = all.slice(0, 8), me = all.find(r => r.hero)
  return top.includes(me) ? top : [...top, me]
})

/* ---------- shop ---------- */
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

/* ---------- the weekend fair ---------- */
const fairWin = computed(() => fairAt(new Date(now.value)))
const fair = computed(() => fairWin.value?.fair || null)
const fairSt = computed(() => (fair.value ? G.fairState() : null))
const fairLeft = computed(() => (fairWin.value ? (fairWin.value.end - now.value) / 1000 : 0))
const fairs = computed(() => upcomingFairs(new Date(now.value), 4))
const fairRule = id => t(`festival.fairs.${id}.rule`, { x: id === 'tower_rush' ? TOWER_RUSH_MULT : OMEN_NIGHT_MULT })
function claimFair(i) { if (G.claimFair(i)) { play('quest'); G.toast(FAIRS[fair.value].icon, 'festival.fairClaimed', {}, 'success') } }
function buyMarket(e) { if (G.buyMarket(e.id)) { play('coin'); G.toast('shop', 'festival.bought', { item: `${e.qty}× ${ITEMS[e.item].name}` }, 'success') } }

/* ---------- the calendar ---------- */
const calendar = computed(() => FESTIVALS.map(fe => {
  const unique = shopFor(fe).filter(e => e.kind !== 'item')
  return { fe, w: windowFor(fe, new Date(now.value)), owned: unique.filter(e => G.festivalOwned(e)).length, total: unique.length }
}).sort((a, b) => a.w.start - b.w.start))
</script>

<template>
  <div>
    <!-- The big festival, or the wait for the next one -->
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
          <span class="small muted tnum">{{ $t('festival.pointsN', { n: fmt(points) }) }}</span>
        </div>
      </div>

      <FestivalActivity :now="now" />

      <!-- The track -->
      <div class="section-title">{{ $t('festival.track') }} <HelpTip k="sections.festTrack" /></div>
      <div class="panel pad">
        <div class="row small" style="margin-bottom:8px">
          <span class="grow muted">{{ nextStep ? $t('festival.nextStep', { n: fmt(nextStep.pts - points) }) : $t('festival.trackDone') }}</span>
          <b class="tnum gold-text">{{ fmt(points) }} / {{ fmt(TRACK[TRACK.length - 1].pts) }}</b>
        </div>
        <div class="bar thick" :style="{ '--c': f.tint }"><i :style="{ width: Math.min(1, points / TRACK[TRACK.length - 1].pts) * 100 + '%' }" /></div>
        <div class="steps">
          <div v-for="(s, i) in TRACK" :key="i" class="step" :class="{ reached: points >= s.pts, claimed: fst.claimed[i] }">
            <span class="step-n tnum">{{ i + 1 }}</span>
            <div class="row wrap" style="gap:3px;justify-content:center">
              <ItemTile v-for="(_, k) in s.reward.items" :key="k" :item="k" size="xs" />
              <ItemTile v-if="s.reward.tokens" :icon="f.icon" :tint="f.tint" size="xs" :tip="false" />
            </div>
            <span class="small faint tnum">{{ fmt(s.pts) }}</span>
            <Button v-if="G.trackReady(i)" :label="$t('festival.claim')" size="small" @click="claimStep(i)" v-tooltip.top="rewardText(s.reward)" />
            <i v-else-if="fst.claimed[i]" class="pi pi-check ok-text" />
            <span v-else class="small muted step-reward" v-tooltip.top="rewardText(s.reward)"><i class="pi pi-gift" /></span>
          </div>
        </div>
      </div>

      <div class="two-col" style="margin-top:18px">
        <!-- How to earn -->
        <div class="panel pad how">
          <h3 class="panel-title"><GameIcon name="two-coins" /> {{ $t('festival.howTitle') }}</h3>
          <ul>
            <li>{{ $t('festival.how.actions', { pct: Math.round(TOKENS.actionChance * 100) }) }}</li>
            <li>{{ $t('festival.how.kills', { pct: Math.round(TOKENS.killChance * 100), boss: TOKENS.boss }) }}</li>
            <li>{{ $t('festival.how.tasks', { n: TOKENS.task }) }}</li>
            <li>{{ $t('festival.how.activity') }}</li>
          </ul>
          <p class="small faint" style="margin:0">{{ $t('festival.resetHint', { n: fmt(fst.earned) }) }}</p>
        </div>
        <!-- The ranking -->
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="trophy-cup" /> {{ $t('festival.ranking') }} <HelpTip k="sections.festRanking" /></h3>
          <div v-for="r in ranking" :key="r.name + r.place" class="rival" :class="{ hero: r.hero }">
            <span class="place tnum">{{ r.place }}</span>
            <GameIcon :name="ROLE_ICONS[r.role]" :size="14" />
            <span class="grow" style="min-width:0">
              <span class="rival-name">{{ r.hero ? `${r.name} (${$t('guilds.you')})` : r.name }}</span>
              <span v-if="r.guild" class="small faint guild">{{ guildName(G.guildById(r.guild)) }}</span>
            </span>
            <b class="tnum">{{ fmt(r.points) }}</b>
          </div>
        </div>
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

    <!-- The weekend fair -->
    <div class="section-title">{{ $t('festival.fairTitle') }} <HelpTip k="sections.festFair" /></div>
    <div v-if="fair" class="panel pad fair" :style="{ '--c': FAIRS[fair].tint }">
      <div class="row">
        <ItemTile :icon="FAIRS[fair].icon" :tint="FAIRS[fair].tint" size="lg" :tip="false" />
        <div class="grow" style="min-width:0">
          <div class="card-name" style="font-size:19px">{{ $t(`festival.fairs.${fair}.name`) }}</div>
          <div class="small muted">{{ fairRule(fair) }}</div>
        </div>
        <div class="stack" style="align-items:flex-end;gap:2px">
          <span class="tag gold"><i class="pi pi-clock" /> {{ $t('festival.endsIn', { time: fmtTime(fairLeft) }) }}</span>
          <b class="tnum">{{ $t('festival.fairPoints', { n: fmt(fairSt.points) }) }}</b>
        </div>
      </div>
      <div class="fair-rewards">
        <div v-for="(r, i) in FAIR_REWARDS" :key="i" class="fair-reward" :class="{ claimed: fairSt.claimed[i] }">
          <b class="tnum">{{ fmt(Math.min(fairSt.points, r.pts)) }} / {{ fmt(r.pts) }}</b>
          <span class="small muted">{{ rewardText(r.reward) }}</span>
          <Button v-if="G.fairReady(i)" :label="$t('festival.claim')" size="small" @click="claimFair(i)" />
          <i v-else-if="fairSt.claimed[i]" class="pi pi-check ok-text" />
        </div>
      </div>
      <template v-if="fair === 'market'">
        <div class="section-title sm">{{ $t('festival.marketTitle') }}</div>
        <div class="grid-wide">
          <div v-for="e in MARKET" :key="e.id" class="card market">
            <div class="row">
              <ItemTile :item="e.item" :qty="e.qty > 1 ? e.qty : null" size="md" />
              <div class="grow" style="min-width:0">
                <div class="card-name">{{ ITEMS[e.item].name }}</div>
                <div class="card-sub">{{ $t('festival.stock', { n: G.marketLeft(e) }) }}</div>
              </div>
            </div>
            <Button :label="$t('inventory.goldAmount', { n: fmt(e.gold) })" size="small" fluid style="margin-top:10px" :disabled="!G.canBuyMarket(e)" @click="buyMarket(e)" />
          </div>
        </div>
      </template>
    </div>
    <div v-else class="panel pad small muted">{{ fairs[0] ? $t('festival.nextFair', { name: $t(`festival.fairs.${fairs[0].fair}.name`), time: fmtTime((fairs[0].start - now) / 1000) }) : $t('festival.noFairs') }}</div>

    <!-- The calendar -->
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
      <div v-for="w in fairs" :key="w.key" class="card cal fair-cal" :class="{ active: fair === w.fair && fairWin?.key === w.key }" :style="{ '--c': FAIRS[w.fair].tint }">
        <div class="row">
          <ItemTile :icon="FAIRS[w.fair].icon" :tint="FAIRS[w.fair].tint" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ $t(`festival.fairs.${w.fair}.name`) }}</div>
            <div class="card-sub">{{ dates(w) }} · {{ $t('festival.weekendFair') }}</div>
          </div>
        </div>
        <p class="small muted" style="margin:10px 0 0">{{ fairRule(w.fair) }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fest-banner { margin-bottom: 18px; }
.tokens { min-width: 110px; }
.how ul { margin: 0 0 10px; padding-inline-start: 20px; color: var(--ink-2); line-height: 1.7; }
.steps { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; margin-top: 14px; }
.step { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px 4px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); text-align: center; }
.step.reached { border-color: rgba(226, 182, 90, 0.5); }
.step.claimed { opacity: 0.6; }
.step-n { font-family: var(--font-display); font-size: 16px; color: var(--gold-hi); }
.step-reward { cursor: help; }
.rival { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 8px; }
.rival:nth-child(even) { background: var(--tint-1); }
.rival.hero { color: var(--gold-hi); background: rgba(226, 182, 90, 0.08); }
.rival .place { width: 22px; text-align: center; font-family: var(--font-display); color: var(--muted); }
.rival-name { display: block; }
.rival .guild { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shop-entry { display: flex; flex-direction: column; justify-content: space-between; }
.title-preview { font-family: var(--font-display); font-size: 14px; color: var(--gold-hi); }
.swatch-big { width: 54px; height: 54px; border-radius: 14px; flex-shrink: 0; box-shadow: inset 0 0 0 2px var(--tint-border); }
.quiet { text-align: center; padding: 36px 20px; }
.quiet .gi { color: var(--faint); }
.fair { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.fair-rewards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.fair-reward { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); }
.fair-reward.claimed { opacity: 0.6; }
.section-title.sm { margin: 18px 0 10px; font-size: 12px; }
.cal.active { border-color: color-mix(in srgb, var(--c) 60%, transparent); }
.fair-cal { border-style: dashed; }
@media (max-width: 900px) { .steps { grid-template-columns: repeat(5, minmax(0, 1fr)); } .fair-rewards { grid-template-columns: 1fr; } }
</style>
