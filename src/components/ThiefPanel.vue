<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { HEISTS, HEIST_STAGES, STOLEN, CAUGHT_FROM, fenceMult } from '../game/data/thieving.js'
import { fmt, fmtClock, pct } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

// The thief's side of Thieving: the guard's heat, jail, the fence and the heists
const { t } = useI18n()
const now = ref(Date.now())
let clock
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(clock))

const heat = computed(() => (now.value, G.heat()))
const jail = computed(() => (now.value, G.jailLeft()))
const heatLevel = computed(() => (heat.value >= 80 ? 'alarm' : heat.value >= CAUGHT_FROM ? 'alert' : heat.value >= 30 ? 'wary' : 'calm'))
const fenceBonus = computed(() => Math.round((fenceMult(heat.value) - 1) * 100))
const goods = computed(() => STOLEN.filter(s => G.qty(s.id) > 0))

function bribe() { if (G.bribe()) { play('coin'); G.toast('two-coins', 'thief.bribed', {}, 'success') } }
function informant() { if (G.payInformant()) { play('coin'); G.toast('hooded-figure', 'thief.informed', {}, 'success') } }
function fence(id) { const g = G.fence(id); if (g) { play('coin'); G.toast(ITEMS[id].icon, 'thief.fenced', { gold: fmt(g) }, 'success') } }

/* ---------- heists, revealed stage by stage ---------- */
const running = ref(null)
const shown = ref(0)
function heist(h) {
  const r = G.runHeist(h.id)
  if (!r) return
  running.value = { h, r }
  shown.value = 0
  const step = () => {
    shown.value++
    play(r.stages[shown.value - 1]?.ok === false ? 'bad' : 'dice')
    if (shown.value < r.stages.length) setTimeout(step, 750)
    else setTimeout(() => {
      play(r.ok ? 'rare' : 'bad')
      G.toast(h.icon, r.ok ? 'thief.heistOk' : r.caught ? 'thief.heistCaught' : 'thief.heistFail', { heist: '@heist:' + h.id, gold: fmt(r.gold) }, r.ok ? 'rare' : 'warn')
    }, 500)
  }
  setTimeout(step, 400)
}
const reqText = r => (r.kind === 'skill' ? `${SKILLS[r.skill].name} ${r.n}` : t('thief.lockpickTier', { n: r.n }))
</script>

<template>
  <div class="thief">
    <div class="two-col">
      <!-- The guard's heat -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="guards" /> {{ $t('thief.heatTitle') }} <HelpTip k="sections.heat" /></h3>
        <div class="row small"><span class="grow" :class="'heat-' + heatLevel">{{ $t(`thief.heat.${heatLevel}`) }}</span><b class="tnum">{{ Math.round(heat) }} / 100</b></div>
        <div class="heat-bar"><i :style="{ width: heat + '%' }" :class="'heat-' + heatLevel" /><span class="mark" :style="{ left: CAUGHT_FROM + '%' }" /></div>
        <div class="small muted" style="margin-top:6px">{{ $t('thief.heatEffect', { fail: pct(G.heatFail(), 1), fence: (fenceBonus >= 0 ? '+' : '') + fenceBonus }) }}</div>
        <div v-if="jail" class="jail">
          <GameIcon name="padlock" :size="22" />
          <div class="grow"><b>{{ $t('thief.jailed') }}</b><div class="small muted">{{ $t('thief.jailLeft', { time: fmtClock(jail / 1000) }) }}</div></div>
          <Button :label="$t('thief.bribe', { n: fmt(G.bribeCost()) })" size="small" severity="danger" :disabled="state.gold < G.bribeCost()" @click="bribe" />
        </div>
        <Button v-else :label="$t('thief.informant', { n: fmt(G.informantCost()) })" icon="pi pi-comments" size="small" severity="secondary" outlined style="margin-top:12px"
          :disabled="heat < 5 || state.gold < G.informantCost()" v-tooltip.top="$t('thief.informantTip')" @click="informant" />
      </div>

      <!-- The fence -->
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="robber-hand" /> {{ $t('thief.fenceTitle') }} <HelpTip k="sections.fence" /></h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('thief.fenceText') }}</p>
        <div v-if="!goods.length" class="small faint">{{ $t('thief.noGoods') }}</div>
        <div v-for="s in goods" :key="s.id" class="good">
          <ItemTile :item="s.id" size="sm" :qty="G.qty(s.id)" />
          <span class="grow">{{ ITEMS[s.id].name }}</span>
          <span class="small gold-text tnum">{{ fmt(G.fencePrice(s.id)) }} / u.</span>
          <Button :label="$t('thief.sell')" size="small" @click="fence(s.id)" />
        </div>
        <div class="row wrap" style="gap:4px;margin-top:10px">
          <span class="small faint">{{ $t('thief.findable') }}</span>
          <ItemTile v-for="s in STOLEN" :key="s.id" :item="s.id" size="xs" :note="$t('thief.fromLevel', { n: s.lvl })" />
        </div>
      </div>
    </div>

    <!-- Heists -->
    <div class="section-title" style="margin-top:22px">{{ $t('thief.heistsTitle') }} <HelpTip k="sections.heists" /></div>
    <div class="grid-wide">
      <div v-for="h in HEISTS" :key="h.id" class="card heist" :class="{ locked: !G.heistReqs(h).every(r => r.ok) }">
        <div class="row">
          <ItemTile :icon="h.icon" tint="#5a4a7a" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ $t(`thief.heists.${h.id}.name`) }}</div>
            <div class="card-sub">{{ $t(`thief.heists.${h.id}.desc`) }}</div>
          </div>
        </div>
        <div class="row wrap small" style="gap:6px;margin-top:10px">
          <span v-for="r in G.heistReqs(h)" :key="r.kind + (r.skill || '')" class="tag" :class="r.ok ? 'ok' : 'bad'">{{ reqText(r) }}</span>
        </div>
        <div class="stages">
          <div v-for="st in HEIST_STAGES" :key="st" class="stage">
            <span class="small muted">{{ $t(`thief.stages.${st}`) }}</span>
            <b class="small tnum">{{ pct(G.heistChances(h.id)[st]) }}</b>
          </div>
        </div>
        <div class="row wrap" style="gap:4px;margin-top:8px">
          <span class="tag gold"><GameIcon name="two-coins" :size="11" /> {{ fmt(h.gold[0]) }}–{{ fmt(h.gold[1]) }}</span>
          <ItemTile v-for="(_, k) in h.loot" :key="k" :item="k" size="xs" />
          <ItemTile v-if="h.gear" :item="h.gear" size="xs" :note="$t('thief.gearChance')" />
        </div>
        <Button v-if="G.heistCooldown(h.id, now) > 0" :label="$t('thief.cooldown', { time: fmtClock(G.heistCooldown(h.id, now) / 1000) })" icon="pi pi-clock" size="small" fluid disabled style="margin-top:12px" />
        <Button v-else :label="$t('thief.startHeist')" icon="pi pi-bolt" size="small" fluid style="margin-top:12px" :disabled="!G.canHeist(h.id) || !!running && shown < running.r.stages.length" @click="heist(h)" />

        <!-- The run, stage by stage -->
        <div v-if="running?.h.id === h.id" class="run">
          <div v-for="(st, i) in running.r.stages.slice(0, shown)" :key="st.id" class="run-step" :class="st.ok ? 'ok' : 'bad'">
            <i class="pi" :class="st.ok ? 'pi-check' : 'pi-times'" /> {{ $t(`thief.stages.${st.id}`) }} · {{ $t(`thief.stageText.${st.id}.${st.ok ? 'ok' : 'bad'}`) }}
          </div>
          <div v-if="shown >= running.r.stages.length" class="run-end small" :class="running.r.ok ? 'gold-text' : 'bad-text'">
            {{ running.r.ok ? $t('thief.heistOkLine', { gold: fmt(running.r.gold) }) : running.r.caught ? $t('thief.caughtLine') : $t('thief.failLine', { gold: fmt(running.r.gold) }) }}
            <span v-for="(n, k) in running.r.items" :key="k" class="row" style="gap:4px;display:inline-flex;margin-inline-start:6px"><ItemTile :item="k" size="xs" />{{ n }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thief { margin-bottom: 22px; }
.heat-bar { position: relative; height: 10px; border-radius: 6px; background: var(--tint-2); margin-top: 8px; overflow: hidden; }
.heat-bar i { position: absolute; inset-block: 0; left: 0; border-radius: 6px; transition: width 0.6s ease; }
.heat-bar .mark { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(224, 85, 75, 0.7); }
i.heat-calm { background: #62c17e; } i.heat-wary { background: #e2b65a; } i.heat-alert { background: #ff7a3a; } i.heat-alarm { background: #e0554b; box-shadow: 0 0 12px #e0554b; }
span.heat-calm { color: var(--tag-ok); } span.heat-wary { color: var(--gold-hi); } span.heat-alert { color: #ff9a5a; } span.heat-alarm { color: var(--tag-bad); font-weight: 700; }
.jail { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: var(--radius); background: rgba(224, 85, 75, 0.08); border: 1px solid rgba(224, 85, 75, 0.35); color: var(--tag-bad); }
.good { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); }
.stages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
.stage { display: flex; flex-direction: column; align-items: center; padding: 6px 4px; border-radius: 8px; background: var(--tint-1); text-align: center; }
.run { margin-top: 12px; padding: 10px 12px; border-radius: var(--radius); background: var(--tint-1); border: 1px solid var(--line); }
.run-step { font-size: 13px; padding: 3px 0; animation: pop 0.35s ease; }
.run-step.ok { color: var(--tag-ok); } .run-step.bad { color: var(--tag-bad); }
.run-end { margin-top: 6px; font-weight: 600; animation: pop 0.35s ease; }
@keyframes pop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (max-width: 520px) { .stages { grid-template-columns: repeat(2, 1fr); } }
</style>
