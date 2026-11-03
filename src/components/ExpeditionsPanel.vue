<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { EXPEDITIONS, EXPEDITION_DURATIONS, RARITIES, TRIP_EVENTS, tripEventCount, HOME_CHANCE } from '../game/data/tavern.js'
import { UNIQUE_MERCS, mercIcon, mercTint } from '../game/data/company.js'
import { mercName } from '../ui/company.js'
import { fmt, fmtClock, fmtHour, pct } from '../game/format.js'
import { chanceNote } from '../ui/tips.js'
import { play } from '../game/sound.js'
import ItemTile from './ItemTile.vue'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// Expeditions: crews of adventurers and companions sent out for hours, the trips under way and the
// chronicle of the ones that came home
const { t } = useI18n()
const props = defineProps({ now: { type: Number, required: true } })
const tv = computed(() => state.tavern)
const trips = computed(() => tv.value.trips || [])

/* ---------- a hand of the crew, whoever they are ---------- */
const key = r => G.handKey(r)
const handOf = r => G.hand(r)
const nameOf = r => { const h = handOf(r); return !h ? '?' : r.k === 'w' ? h.name : mercName(h) }
const iconOf = r => { const h = handOf(r); return r.k === 'w' ? h.avatar : mercIcon(h) }
const tintOf = r => { const h = handOf(r); return r.k === 'w' ? RARITIES[h.rarity].color : mercTint(h) }
const tradeOf = r => G.handTrade(r)
const tradeName = r => (r.k === 'w' ? t('specs.adventurer') : t(`company.roles.${tradeOf(r)}.name`))
// Why someone cannot set out: away, hurt or recovering
function busyText(r) {
  const h = handOf(r)
  const trip = G.tripOf(r)
  if (trip) return t('tavern.trip.away', { exp: expName(trip.exp) })
  if (r.k === 'w' && h.injured > 0) return t('tavern.recovering', { time: fmtClock(h.injured) })
  if (r.k === 'c' && G.mercHurt(h)) return t('company.hurt', { t: fmtClock(Math.max(0, (h.hurtUntil - props.now) / 1000)) })
  return ''
}

/* ---------- planning a trip ---------- */
const dest = ref('forest')
const durIdx = ref(1)
const repeat = ref(false)
const crew = ref([])
const ex = computed(() => EXPEDITIONS.find(e => e.id === dest.value))
const size = computed(() => G.crewSize())
const choices = computed(() => (void tv.value.workers.length, void state.company.members.length, G.crewChoices()))
const picked = r => crew.value.some(c => key(c) === key(r))
// Hands who went away, got hurt or left drop out of the crew being planned
watch([choices, () => props.now], () => { crew.value = crew.value.filter(r => handOf(r) && G.handFree(r)) })
function togglePick(r) {
  if (picked(r)) crew.value = crew.value.filter(c => key(c) !== key(r))
  else if (crew.value.length < size.value && G.handFree(r)) crew.value = [...crew.value, r]
}
const durOpts = computed(() => EXPEDITION_DURATIONS.map((d, i) => ({ label: t('time.hours', { n: d.hours }), value: i })))
const chance = computed(() => (crew.value.length ? G.expeditionChance(crew.value, ex.value) : 0))
const bonus = computed(() => G.crewBonus(crew.value, ex.value))
const gold = computed(() => G.tripGold(crew.value.length ? crew.value : [null], ex.value, durIdx.value))
const events = computed(() => tripEventCount(EXPEDITION_DURATIONS[durIdx.value].hours))
// What each trade in the crew brings, said plainly
const notes = computed(() => {
  const out = []
  const seen = new Set()
  for (const r of crew.value) {
    const tr = tradeOf(r)
    if (!seen.has(tr)) { seen.add(tr); out.push({ icon: 'sparkles', text: t(`tavern.trip.roles.${tr}`) }) }
  }
  for (const id of bonus.value.home) out.push({ icon: 'laurel-crown', text: t('tavern.trip.home', { name: t(`company.uniques.${id}.name`), v: Math.round(HOME_CHANCE * 100) }), gold: true })
  if (crew.value.length > 1) out.push({ icon: 'crossed-swords', text: t('tavern.trip.together', { n: crew.value.length }) })
  return out
})
const blocker = computed(() => {
  if (!crew.value.length) return 'tavern.trip.pickCrew'
  if (ex.value.map && !G.qty('treasure_map')) return 'tavern.trip.noMap'
  return null
})
function send() {
  if (blocker.value) return
  const names = crew.value.map(nameOf).join(', ')
  if (G.sendExpedition(crew.value, ex.value.id, durIdx.value, repeat.value)) {
    play('quest')
    G.toast(ex.value.icon, 'tavern.departs', { name: names, exp: '@exp:' + ex.value.id }, 'success')
    crew.value = []
  }
}
// Companions met along the way who know this ground, shown on the destination
const homeOf = id => Object.keys(UNIQUE_MERCS).filter(u => UNIQUE_MERCS[u].home === id && G.companyMember(u))
const expName = id => EXPEDITIONS.find(e => e.id === id)?.name || id
const chanceCls = v => (v >= 0.7 ? 'ok' : v < 0.4 ? 'bad' : '')

/* ---------- trips under way ---------- */
function recall(trip) { G.recallTrip(trip.uid) }
const tripHands = trip => trip.crew.filter(r => handOf(r))

/* ---------- the chronicle ---------- */
// Reports from before crews only carried a name
const repCrew = r => r.crew || [{ name: r.name }]
const repName = c => (c.name?.startsWith('#') ? t(`company.uniques.${c.name.slice(1)}.name`) : c.name)
const savedBy = (r, e) => { const c = (r.crew || []).find(x => G.handKey(x) === e.saved); return c ? repName(c) : '' }
</script>

<template>
  <div class="exp">
    <!-- Trips under way -->
    <section v-if="trips.length" class="under-way">
      <div class="section-title" style="margin-top:0">{{ $t('tavern.trip.underWay', { n: trips.length }) }}</div>
      <div class="trips">
        <div v-for="trip in trips" :key="trip.uid" class="card trip">
          <div class="row">
            <ItemTile :icon="EXPEDITIONS.find(e => e.id === trip.exp)?.icon" tint="#3f7a6a" size="md" :tip="false" />
            <div class="grow" style="min-width:0">
              <div class="card-name">{{ expName(trip.exp) }}</div>
              <div class="card-sub tnum">{{ $t('tavern.trip.back', { time: fmtClock(Math.max(0, trip.t)) }) }}</div>
            </div>
            <span v-if="trip.repeat" class="tag arcane" v-tooltip.top="$t('tavern.trip.repeatTip')"><i class="pi pi-replay" /> {{ $t('tavern.trip.repeating') }}</span>
          </div>
          <div class="bar" style="--c:#6fc3b8" role="progressbar" :aria-label="expName(trip.exp)" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round((1 - trip.t / trip.total) * 100)">
            <i :style="{ width: (1 - trip.t / trip.total) * 100 + '%' }" />
          </div>
          <div class="row wrap crew-line">
            <span v-for="r in tripHands(trip)" :key="key(r)" class="hand-chip"><ItemTile :icon="iconOf(r)" :tint="tintOf(r)" size="xs" :tip="false" /> {{ nameOf(r) }}</span>
          </div>
          <div class="row trip-actions">
            <label class="row small grow" :for="'rep-' + trip.uid" style="gap:8px;cursor:pointer">
              <ToggleSwitch :modelValue="trip.repeat" :inputId="'rep-' + trip.uid" @update:modelValue="v => G.setTripRepeat(trip.uid, v)" /> {{ $t('tavern.trip.repeat') }}
            </label>
            <Button :label="$t('tavern.trip.recall')" icon="pi pi-undo" size="small" text severity="secondary" v-tooltip.top="$t('tavern.trip.recallTip')" @click="recall(trip)" />
          </div>
        </div>
      </div>
    </section>

    <div class="plan-grid">
      <!-- Where to go -->
      <section>
        <div class="section-title" style="margin-top:0">{{ $t('tavern.trip.destinations') }} <HelpTip k="sections.expeditions" /></div>
        <div class="dests" role="radiogroup" :aria-label="$t('tavern.trip.destinations')">
          <button v-for="e in EXPEDITIONS" :key="e.id" type="button" role="radio" class="dest" :class="{ on: dest === e.id }" :aria-checked="dest === e.id" @click="dest = e.id">
            <div class="row">
              <ItemTile :icon="e.icon" tint="#3f7a6a" size="md" :tip="false" />
              <div class="grow" style="min-width:0">
                <div class="card-name">{{ e.name }}</div>
                <div class="card-sub">{{ $t('tavern.power', { n: e.power }) }}<template v-if="e.map"> · {{ $t('tavern.needsMap', { n: G.qty('treasure_map') }) }}</template></div>
              </div>
              <span v-if="crew.length" class="tag" :class="chanceCls(G.expeditionChance(crew, e))">{{ pct(G.expeditionChance(crew, e)) }}</span>
            </div>
            <div class="row wrap loot">
              <span class="tag gold">{{ $t('inventory.goldAmount', { n: fmt(G.tripGold(crew.length ? crew : [null], e, durIdx)) }) }}</span>
              <ItemTile v-for="l in e.loot" :key="l.item" :item="l.item" size="sm" :note="chanceNote(l.chance)" />
            </div>
            <div v-if="homeOf(e.id).length" class="small gold-text home-line"><GameIcon name="laurel-crown" :size="12" /> {{ $t('tavern.trip.knows', { name: homeOf(e.id).map(u => $t(`company.uniques.${u}.name`)).join(', ') }) }}</div>
          </button>
        </div>
      </section>

      <!-- The crew and the trip -->
      <section class="panel planner" :aria-label="$t('tavern.trip.planner')">
        <div class="row plan-head">
          <ItemTile :icon="ex.icon" tint="#3f7a6a" size="lg" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="small muted">{{ $t('tavern.trip.planner') }}</div>
            <h3 class="plan-title">{{ ex.name }}</h3>
          </div>
        </div>

        <div>
          <div class="row small muted"><span class="grow">{{ $t('tavern.trip.crew') }}</span><span class="tnum">{{ crew.length }} / {{ size }}</span></div>
          <div class="slots">
            <template v-for="i in size" :key="i">
              <button v-if="crew[i - 1]" type="button" class="slot filled" :aria-label="$t('tavern.trip.drop', { name: nameOf(crew[i - 1]) })" @click="togglePick(crew[i - 1])">
                <ItemTile :icon="iconOf(crew[i - 1])" :tint="tintOf(crew[i - 1])" size="sm" :tip="false" />
                <span class="slot-name">{{ nameOf(crew[i - 1]) }}</span>
                <i class="pi pi-times" aria-hidden="true" />
              </button>
              <span v-else class="slot empty">{{ $t('tavern.trip.freeSlot') }}</span>
            </template>
          </div>
        </div>

        <div class="choices" role="group" :aria-label="$t('tavern.trip.choose')">
          <div v-if="!choices.length" class="small faint">{{ $t('tavern.trip.nobody') }}</div>
          <button v-for="r in choices" :key="key(r)" type="button" class="choice" :class="{ on: picked(r) }" :aria-pressed="picked(r)"
            :disabled="!picked(r) && (!G.handFree(r) || crew.length >= size)" @click="togglePick(r)">
            <ItemTile :icon="iconOf(r)" :tint="tintOf(r)" size="sm" :tip="false" />
            <span class="grow choice-text">
              <b>{{ nameOf(r) }}</b>
              <small class="muted">{{ tradeName(r) }} · {{ $t('common.lvlShort', { n: G.handLevel(r) }) }}<template v-if="busyText(r)"> · <span class="bad-text">{{ busyText(r) }}</span></template></small>
            </span>
            <i class="pi" :class="picked(r) ? 'pi-check-circle gold-text' : 'pi-plus-circle faint'" aria-hidden="true" />
          </button>
        </div>

        <div>
          <div class="small muted" id="trip-dur">{{ $t('inventory.duration') }}</div>
          <SelectButton v-model="durIdx" :options="durOpts" optionLabel="label" optionValue="value" :allowEmpty="false" aria-labelledby="trip-dur" class="durs" />
        </div>

        <div class="figures">
          <div class="figure"><span class="small muted">{{ $t('tavern.trip.odds') }}</span><b class="tnum" :class="crew.length && chanceCls(chance) ? chanceCls(chance) + '-text' : ''">{{ crew.length ? pct(chance) : '—' }}</b></div>
          <div class="figure"><span class="small muted">{{ $t('tavern.trip.gold') }}</span><b class="tnum gold-text">{{ fmt(gold) }}</b></div>
          <div class="figure"><span class="small muted">{{ $t('tavern.trip.crewLevel') }}</span><b class="tnum">{{ crew.length ? bonus.level : '—' }}</b></div>
          <div class="figure"><span class="small muted">{{ $t('tavern.trip.eventCount') }}</span><b class="tnum">{{ events }}</b></div>
        </div>

        <ul v-if="notes.length" class="notes">
          <li v-for="(n, i) in notes" :key="i" class="small" :class="{ 'gold-text': n.gold }"><GameIcon :name="n.icon" :size="12" /> {{ n.text }}</li>
        </ul>
        <p v-if="crew.length && !bonus.shield" class="small faint" style="margin:0">{{ $t('tavern.trip.risk') }}</p>

        <label class="row small" for="trip-repeat" style="gap:8px;cursor:pointer">
          <ToggleSwitch v-model="repeat" inputId="trip-repeat" /> {{ $t('tavern.trip.repeat') }}
        </label>
        <Button :label="blocker ? $t(blocker) : $t('tavern.trip.send', { n: crew.length })" icon="pi pi-send" fluid :disabled="!!blocker" @click="send" />
      </section>
    </div>

    <!-- The chronicle of trips that came home -->
    <div class="section-title">{{ $t('tavern.reports') }} <HelpTip k="sections.reports" /></div>
    <div v-if="!tv.reports.length" class="panel pad small muted">{{ $t('tavern.noReports') }}</div>
    <div class="reports">
      <article v-for="(r, i) in tv.reports" :key="r.t + '-' + i" class="card report" :class="r.ok ? 'won' : 'lost'">
        <div class="row">
          <ItemTile :icon="r.icon" tint="#3f7a6a" size="sm" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ expName(r.exp) }}</div>
            <div class="card-sub">{{ fmtHour(r.t) }}<template v-if="r.hours"> · {{ $t('time.hours', { n: r.hours }) }}</template></div>
          </div>
          <span class="tag" :class="r.ok ? 'ok' : 'bad'">{{ r.ok ? $t('tavern.success') : $t('tavern.failure') }}</span>
        </div>
        <div class="row wrap crew-line">
          <span v-for="(c, j) in repCrew(r)" :key="j" class="hand-chip">{{ repName(c) }}</span>
        </div>
        <ul v-if="r.events?.length || r.home?.length" class="chronicle">
          <li v-for="(e, j) in r.events || []" :key="j" class="small" :class="TRIP_EVENTS[e.id]?.good ? 'good' : e.saved ? 'saved' : 'bad'">
            <GameIcon :name="TRIP_EVENTS[e.id]?.icon || 'scroll-unfurled'" :size="14" />
            <span>{{ e.saved ? $t(`tavern.trip.events.${e.id}.saved`, { who: savedBy(r, e) }) : $t(`tavern.trip.events.${e.id}.text`) }}</span>
          </li>
          <li v-for="id in r.home || []" :key="id" class="small good"><GameIcon name="laurel-crown" :size="14" /> <span>{{ $t(`company.uniques.${id}.trip`) }}</span></li>
        </ul>
        <p v-if="r.hurt" class="small bad-text" style="margin:0">{{ $t('tavern.trip.cameHurt') }}</p>
        <div class="row wrap loot">
          <span class="tag gold">+{{ $t('inventory.goldAmount', { n: fmt(r.gold) }) }}</span>
          <span v-for="(n, k) in r.items" :key="k" class="tag" v-tooltip.top="ITEMS[k]?.name"><ItemTile :item="k" size="xs" :tip="false" /> {{ fmt(n) }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.exp { display: grid; gap: 18px; }
.trips { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.trip { display: grid; gap: 10px; }
.trip-actions { gap: 8px; }
.crew-line { gap: 6px; }
.hand-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 4px; border-radius: 999px; background: var(--tint-1); border: 1px solid var(--line); font-size: 12.5px; font-weight: 600; }
.report .hand-chip { padding-left: 9px; }
.plan-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 18px; align-items: start; }
.dests { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.dest { display: grid; gap: 10px; text-align: start; padding: 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
.dest:hover { border-color: var(--line-hi); }
.dest.on { border-color: var(--gold); box-shadow: 0 0 22px -12px var(--gold); transform: translateY(-1px); }
.dest:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.loot { gap: 5px; }
.home-line { display: flex; align-items: center; gap: 6px; }
.planner { position: sticky; top: 12px; display: grid; gap: 14px; padding: 16px; }
.plan-head { gap: 12px; }
.plan-title { margin: 0; font-family: var(--font-display); font-size: 18px; letter-spacing: 0.03em; }
.slots { display: grid; gap: 6px; margin-top: 6px; }
.slot { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 4px 10px 4px 5px; border-radius: 10px; font: inherit; font-size: 13px; }
.slot.filled { background: color-mix(in srgb, var(--gold) 10%, var(--panel-solid)); border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line)); color: var(--ink); cursor: pointer; }
.slot.filled:hover .pi-times { color: var(--danger); }
.slot.filled:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.slot.empty { justify-content: center; border: 1px dashed var(--line-hi); color: var(--muted); }
.slot-name { flex: 1; font-weight: 700; text-align: start; }
.choices { display: grid; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 2px; }
.choice { display: flex; align-items: center; gap: 10px; padding: 6px 10px 6px 6px; border-radius: 10px; border: 1px solid var(--line); background: var(--tint-1); color: var(--ink); font: inherit; cursor: pointer; text-align: start; }
.choice:hover:not(:disabled) { border-color: var(--line-hi); }
.choice.on { border-color: var(--gold); }
.choice:disabled { opacity: 0.6; cursor: default; }
.choice:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.choice-text { display: grid; min-width: 0; }
.choice-text b { font-size: 13.5px; }
.choice-text small { font-size: 12px; }
.durs { display: flex; margin-top: 4px; }
.durs :deep(.p-togglebutton) { flex: 1; }
.figures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.figure { display: grid; gap: 2px; padding: 8px 10px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); }
.figure b { font-size: 17px; }
.notes { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.notes li { display: flex; align-items: center; gap: 6px; }
.reports { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.report { display: grid; gap: 10px; align-content: start; }
.report.won { border-color: color-mix(in srgb, var(--ok) 35%, var(--line)); }
.report.lost { border-color: color-mix(in srgb, var(--danger) 35%, var(--line)); }
.chronicle { list-style: none; margin: 0; padding: 10px 12px; display: grid; gap: 6px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); }
.chronicle li { display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; }
.chronicle li .gi { flex-shrink: 0; margin-top: 2px; }
.chronicle .good .gi { color: var(--ok); }
.chronicle .bad .gi { color: var(--danger); }
.chronicle .saved .gi { color: var(--gold); }
@media (max-width: 1100px) {
  .plan-grid { grid-template-columns: 1fr; }
  .planner { position: static; order: -1; }
}
@media (max-width: 600px) {
  .dests, .reports, .trips { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .dest { transition: none; } }
</style>
