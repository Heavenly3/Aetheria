<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { EMBLEMS, ROLE_ICONS, RANKS, SWAP_COST, TASK_TYPES, guildPerk } from '../game/data/guilds.js'
import { ITEMS } from '../game/data/items.js'
import { fmt, fmtTime } from '../game/format.js'
import { tm } from '../i18n/index.js'
import { guildName } from '../i18n/names.js'
import { modText } from '../i18n/mods.js'
import { play } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'
import HelpTip from '../components/HelpTip.vue'
import GuildPuzzle from '../components/GuildPuzzle.vue'

const { t } = useI18n()
const confirm = useConfirm()
const gs = computed(() => state.guilds)
const mine = computed(() => G.myGuild())
const trial = computed(() => gs.value.trial)
const trialGuild = computed(() => (trial.value ? G.guildById(trial.value.guild) : null))

// A clock for the countdowns
const now = ref(Date.now())
let timer
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))

const tab = ref(mine.value || trial.value ? 'hall' : 'board')
const tabs = computed(() => ['hall', 'board'].map(v => ({ value: v, label: t(`guilds.tabs.${v}`) })))

/* ---------- names and labels ---------- */
const crest = g => EMBLEMS[g.emblem]
const focusLabel = g => (g.focus === 'open' || g.focus === 'multi' ? t(`guilds.focus.${g.focus}`) : t(`roles.${g.focus}.name`))
const rolesOf = g => (g.focus === 'open' ? [] : g.roles)
const reqText = r => (r.kind === 'skill' ? t('guilds.req.skill', { skill: t(`skills.${r.skill}.name`), n: r.n }) : t(`guilds.req.${r.kind}`, { n: fmt(r.n) }))
const statusText = g => {
  const st = G.guildStatus(g)
  return t(`guilds.status.${st}`, st === 'cooldown' ? { time: fmtTime(Math.ceil((now.value, G.guildCooldown()) / 1000)) } : {})
}
const statusKind = st => ({ member: 'gold', trial: 'arcane', open: 'ok' }[st] || 'bad')
const taskText = task => tm({ key: `guilds.tasks.${task.type}`, params: { n: fmt(task.target), monster: '@monster:' + task.monster, skill: '@skill:' + task.skill, item: '@item:' + task.item } })
const taskIcon = task => (task.type === 'deliver' ? ITEMS[task.item]?.icon : TASK_TYPES[task.type].icon)
const perkLines = mods => Object.entries(mods).map(([k, v]) => modText(k, v))

/* ---------- the board ---------- */
const filter = ref('all')
const filters = computed(() => ['all', 'mine', 'ready'].map(v => ({ value: v, label: t(`guilds.filters.${v}`) })))
const table = computed(() => (now.value, G.guildTable()).filter(r => {
  if (filter.value === 'mine') return r.g.focus === 'open' || r.g.roles.includes(state.role)
  if (filter.value === 'ready') return G.guildStatus(r.g) === 'open'
  return true
}))
const open = ref(null)
const toggle = id => { open.value = open.value === id ? null : id }
const members = g => G.guildMembers(g).slice(0, 12)

function apply(g) {
  if (!G.applyGuild(g.id)) return
  play('quest')
  G.toast('scroll-quill', 'guilds.applied', { guild: '@guild:' + g.id }, 'success')
  tab.value = 'hall'
}

/* ---------- the trial ---------- */
function finishTrial() {
  const id = trial.value.guild
  if (G.finishTrial()) { play('quest'); G.toast('swords-emblem', 'guilds.joined', { guild: '@guild:' + id }, 'rare') }
}
function abandon() {
  confirm.require({
    header: t('guilds.trial.abandon'), message: t('guilds.trial.abandonConfirm'), icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('guilds.trial.abandon'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { G.abandonTrial(); tab.value = 'board' },
  })
}

/* ---------- membership ---------- */
const rank = computed(() => G.guildRank())
const rep = computed(() => (mine.value ? G.guildRep(mine.value.id) : 0))
const next = computed(() => G.nextRank())
const rankBar = computed(() => {
  if (!next.value) return 1
  const from = RANKS[rank.value].rep
  return (rep.value - from) / (next.value.rep - from)
})
const perkNow = computed(() => perkLines(G.guildPerk()))
const perkNext = computed(() => (mine.value && next.value ? perkLines(guildPerk(mine.value, rank.value + 1)) : []))
const contracts = computed(() => (now.value, G.ensureContracts()))
const refreshIn = computed(() => fmtTime(Math.ceil(G.contractsLeft(now.value) / 1000)))
function claim(i) {
  const r = G.claimContract(i)
  if (r) { play('coin'); G.toast('scroll-unfurled', 'guilds.contracts.got', { marks: r.marks, rep: r.rep, gold: fmt(r.gold) }, 'success') }
}
function buy(e) { if (G.buyGuild(e.id)) { play('coin'); G.toast('shop', 'guilds.shop.bought', {}, 'success') } }
function leave() {
  confirm.require({
    header: t('guilds.leave'), message: t('guilds.leaveConfirm', { guild: guildName(mine.value) }), icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('guilds.leave'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { G.leaveGuild(); tab.value = 'board' },
  })
}
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:18px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0;flex-basis:280px">{{ $t('guilds.intro') }}</p>
        <span class="tag gold tnum"><GameIcon name="star-medal" :size="13" /> {{ $t('guilds.marks') }}: {{ fmt(gs.marks) }}</span>
      </div>
    </div>

    <SelectButton v-model="tab" :options="tabs" optionLabel="label" optionValue="value" :allowEmpty="false" style="margin-bottom:18px" />

    <!-- ============ My guild ============ -->
    <template v-if="tab === 'hall'">
      <!-- Trial under way -->
      <div v-if="trial && trialGuild" class="panel pad" :style="{ '--c': trialGuild.color }">
        <h3 class="panel-title"><GameIcon name="scroll-quill" /> {{ $t('guilds.trial.for', { guild: guildName(trialGuild) }) }}</h3>
        <p class="small muted" style="margin-top:-6px">{{ $t('guilds.trial.hint') }}</p>
        <div class="two-col">
          <div>
            <div class="small muted label">{{ $t('guilds.trial.task') }}</div>
            <div class="task">
              <ItemTile :icon="taskIcon(trial.task)" size="sm" :tip="false" />
              <div class="grow" style="min-width:0">
                <div>{{ taskText(trial.task) }}</div>
                <div class="bar" style="margin-top:6px"><i :style="{ width: (G.taskCur(trial.task) / trial.task.target) * 100 + '%' }" /></div>
                <div class="small muted tnum" style="margin-top:4px">{{ fmt(G.taskCur(trial.task)) }} / {{ fmt(trial.task.target) }}</div>
              </div>
              <i v-if="G.taskMet(trial.task)" class="pi pi-check ok-text" />
            </div>
          </div>
          <div>
            <div class="small muted label">{{ $t('guilds.trial.puzzle') }}</div>
            <GuildPuzzle :now="now" />
          </div>
        </div>
        <div class="row wrap" style="margin-top:16px;gap:10px">
          <Button :label="$t('guilds.trial.finish')" icon="pi pi-sign-in" :disabled="!G.trialReady()" @click="finishTrial" />
          <span v-if="G.trialReady()" class="small ok-text">{{ $t('guilds.trial.ready') }}</span>
          <span class="grow" />
          <Button :label="$t('guilds.trial.abandon')" severity="secondary" outlined size="small" @click="abandon" />
        </div>
      </div>

      <!-- Member -->
      <template v-else-if="mine">
        <div class="banner" :style="{ '--c': mine.color }">
          <GameIcon class="banner-ghost" :name="crest(mine)" :size="230" />
          <ItemTile :icon="crest(mine)" :tint="mine.color" size="xl" :tip="false" />
          <div class="grow">
            <h1 class="banner-title">{{ guildName(mine) }}</h1>
            <div class="banner-desc motto">“{{ $t(`guilds.mottos.${mine.motto}`) }}”</div>
            <div class="row wrap">
              <span class="tag gold">{{ $t('guilds.place', { n: G.guildPlace(mine.id) }) }} · {{ $t('guilds.renown', { n: fmt(G.guildRenown(mine)) }) }}</span>
              <span class="tag">{{ $t('guilds.tier', { n: mine.tier }) }}</span>
              <span class="tag">{{ focusLabel(mine) }}</span>
              <span class="tag">{{ $t('guilds.leader', { name: mine.leader }) }}</span>
            </div>
          </div>
        </div>

        <div class="two-col" style="margin-top:18px">
          <div class="panel pad">
            <h3 class="panel-title"><GameIcon name="star-medal" /> {{ $t('guilds.rank') }}: {{ $t(`guilds.ranks.${RANKS[rank].id}`) }}</h3>
            <div class="row small"><span class="muted grow">{{ $t('guilds.rep') }}</span><b class="tnum">{{ fmt(rep) }}</b></div>
            <div class="bar thick" style="margin:8px 0"><i :style="{ width: rankBar * 100 + '%' }" /></div>
            <div class="small muted">{{ next ? $t('guilds.nextRank', { rank: $t(`guilds.ranks.${next.id}`), n: fmt(next.rep) }) : $t('guilds.topRank') }}</div>
            <div class="ranks">
              <span v-for="(r, i) in RANKS" :key="r.id" class="rank-pip" :class="{ on: i <= rank }" :title="$t(`guilds.ranks.${r.id}`)" />
            </div>
          </div>
          <div class="panel pad">
            <h3 class="panel-title"><GameIcon name="sparkles" /> {{ $t('guilds.perk') }}</h3>
            <div v-for="l in perkNow" :key="l" class="small ok-text">{{ l }}</div>
            <template v-if="perkNext.length">
              <div class="small muted" style="margin-top:10px">{{ $t('guilds.perkNext') }}</div>
              <div v-for="l in perkNext" :key="'n' + l" class="small faint">{{ l }}</div>
            </template>
          </div>
        </div>

        <div class="row" style="margin:24px 0 12px">
          <div class="section-title grow" style="margin:0">{{ $t('guilds.contracts.title') }}</div>
          <span class="small muted"><i class="pi pi-clock" /> {{ $t('guilds.contracts.refresh', { time: refreshIn }) }}</span>
        </div>
        <div class="grid-wide">
          <div v-for="(c, i) in contracts" :key="i + c.type + c.target" class="card contract" :class="{ done: c.claimed }">
            <div class="row" style="align-items:flex-start">
              <ItemTile :icon="taskIcon(c)" size="sm" :tip="false" />
              <div class="grow" style="min-width:0">
                <div class="small muted">{{ $t(`guilds.contracts.sizes.${c.size}`) }}</div>
                <div class="card-name" style="font-size:15px">{{ taskText(c) }}</div>
              </div>
            </div>
            <div class="bar" style="margin:10px 0 4px"><i :style="{ width: (G.taskCur(c) / c.target) * 100 + '%' }" /></div>
            <div class="small muted tnum">{{ fmt(G.taskCur(c)) }} / {{ fmt(c.target) }}</div>
            <div class="row wrap small reward">
              <span class="tag gold"><GameIcon name="star-medal" :size="12" /> {{ c.reward.marks }}</span>
              <span class="tag">+{{ c.reward.rep }} {{ $t('guilds.rep').toLowerCase() }}</span>
              <span class="tag"><GameIcon name="two-coins" :size="12" /> {{ fmt(c.reward.gold) }}</span>
            </div>
            <div class="row" style="margin-top:10px;gap:8px">
              <Button v-if="c.claimed" :label="$t('guilds.contracts.claimed')" icon="pi pi-check" size="small" disabled />
              <Button v-else :label="$t('guilds.contracts.claim')" size="small" :disabled="!G.taskMet(c)" @click="claim(i)" />
              <Button v-if="!c.claimed" :label="$t('guilds.contracts.swap')" icon="pi pi-refresh" size="small" severity="secondary" outlined
                :disabled="gs.marks < SWAP_COST" v-tooltip.top="$t('guilds.contracts.swapTip', { n: SWAP_COST })" @click="G.swapContract(i)" />
            </div>
          </div>
        </div>

        <div class="section-title" style="margin-top:24px">{{ $t('guilds.shop.title') }}</div>
        <div class="grid-wide">
          <div v-for="e in G.guildShop()" :key="e.id" class="card shop-item" :class="{ locked: rank < e.rank }">
            <div class="row wrap" style="gap:6px">
              <ItemTile v-for="(n, id) in e.items" :key="id" :item="id" :qty="n" size="sm" />
              <span class="grow" />
              <span class="tag gold tnum"><GameIcon name="star-medal" :size="12" /> {{ e.cost }}</span>
            </div>
            <div class="small muted" style="margin-top:8px">{{ Object.entries(e.items).map(([id, n]) => `${n}× ${ITEMS[id].name}`).join(' · ') }}</div>
            <div class="row" style="margin-top:10px">
              <span v-if="rank < e.rank" class="small bad-text grow">{{ $t('guilds.shop.needRank', { rank: $t(`guilds.ranks.${RANKS[e.rank].id}`) }) }}</span>
              <span v-else class="grow" />
              <Button :label="$t('guilds.shop.buy')" size="small" :disabled="!G.canBuyGuild(e)" @click="buy(e)" />
            </div>
          </div>
        </div>

        <div class="section-title" style="margin-top:24px">{{ $t('guilds.members') }}</div>
        <div class="panel roster">
          <div v-for="(m, i) in G.guildMembers(mine)" :key="m.name + i" class="member" :class="{ hero: m.hero }">
            <GameIcon :name="ROLE_ICONS[m.role]" :size="15" />
            <span class="grow">{{ m.hero ? `${m.name} (${$t('guilds.you')})` : m.name }}</span>
            <span class="small muted">{{ $t(`guilds.ranks.${RANKS[m.rank].id}`) }}</span>
            <span class="small faint tnum lvl">{{ $t('common.lvlShort', { n: m.level }) }}</span>
          </div>
        </div>

        <div class="row" style="margin-top:20px">
          <span class="grow" />
          <Button :label="$t('guilds.leave')" icon="pi pi-sign-out" severity="danger" outlined size="small" @click="leave" />
        </div>
      </template>

      <!-- Not in a guild yet -->
      <div v-else class="panel pad empty">
        <GameIcon name="swords-emblem" :size="40" />
        <p class="muted">{{ $t('guilds.noGuild') }}</p>
        <Button :label="$t('guilds.toBoard')" icon="pi pi-list" @click="tab = 'board'" />
      </div>
    </template>

    <!-- ============ All the guilds, by renown ============ -->
    <template v-else>
      <div class="row wrap" style="margin-bottom:14px">
        <div class="section-title grow" style="margin:0">{{ $t('guilds.table') }} <HelpTip k="screens.guilds" /></div>
        <SelectButton v-model="filter" :options="filters" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" />
      </div>
      <div v-for="r in table" :key="r.g.id" class="guild" :class="{ open: open === r.g.id, mine: gs.member === r.g.id }" :style="{ '--c': r.g.color }">
        <button class="guild-head" :aria-expanded="open === r.g.id" @click="toggle(r.g.id)">
          <span class="place tnum">{{ r.place }}</span>
          <ItemTile :icon="crest(r.g)" :tint="r.g.color" size="md" :tip="false" />
          <span class="grow" style="min-width:0">
            <span class="guild-name">{{ guildName(r.g) }}</span>
            <span class="small muted sub">
              <span class="stars">{{ '★'.repeat(r.g.tier) }}<span class="faint">{{ '★'.repeat(5 - r.g.tier) }}</span></span>
              · {{ focusLabel(r.g) }}
              <GameIcon v-for="ro in rolesOf(r.g)" :key="ro" :name="ROLE_ICONS[ro]" :size="12" />
              · {{ $t('guilds.membersN', { n: G.guildMembers(r.g).length }) }}
            </span>
          </span>
          <span class="tnum renown small">{{ $t('guilds.renown', { n: fmt(r.renown) }) }}</span>
          <span class="tag" :class="statusKind(G.guildStatus(r.g))">{{ statusText(r.g) }}</span>
          <i class="pi muted" :class="open === r.g.id ? 'pi-angle-up' : 'pi-angle-down'" />
        </button>
        <div v-if="open === r.g.id" class="guild-body">
          <p class="motto">“{{ $t(`guilds.mottos.${r.g.motto}`) }}” <span class="small muted">— {{ $t('guilds.leader', { name: r.g.leader }) }}</span></p>
          <div class="two-col">
            <div>
              <div class="small muted label">{{ $t('guilds.requirements') }}</div>
              <div class="req small">
                <span :class="G.guildStatus(r.g) === 'role' ? 'bad-text' : 'ok-text'">
                  <i class="pi" :class="G.guildStatus(r.g) === 'role' ? 'pi-times' : 'pi-check'" />
                  {{ $t('guilds.takes', { roles: r.g.focus === 'open' ? $t('guilds.focus.open') : r.g.roles.map(x => $t(`roles.${x}.name`)).join(', ') }) }}
                </span>
              </div>
              <div v-for="q in G.guildReqs(r.g)" :key="q.kind + (q.skill || '')" class="req small">
                <span :class="q.ok ? 'ok-text' : 'bad-text'"><i class="pi" :class="q.ok ? 'pi-check' : 'pi-times'" /> {{ reqText(q) }}</span>
              </div>
              <div class="req small">
                <span :class="state.gold >= G.guildFee(r.g) ? 'ok-text' : 'bad-text'"><GameIcon name="two-coins" :size="12" /> {{ $t('guilds.req.fee', { n: fmt(G.guildFee(r.g)) }) }}</span>
              </div>
              <div class="small muted label" style="margin-top:12px">{{ $t('guilds.perk') }}</div>
              <div class="small">{{ perkLines(guildPerk(r.g, RANKS.length - 1)).join(' · ') }}</div>
              <div class="row" style="margin-top:14px">
                <Button :label="$t('guilds.apply')" icon="pi pi-send" size="small" :disabled="G.guildStatus(r.g) !== 'open'" @click="apply(r.g)" />
              </div>
            </div>
            <div>
              <div class="small muted label">{{ $t('guilds.members') }}</div>
              <div class="roster compact">
                <div v-for="(m, i) in members(r.g)" :key="m.name + i" class="member" :class="{ hero: m.hero }">
                  <GameIcon :name="ROLE_ICONS[m.role]" :size="13" />
                  <span class="grow">{{ m.hero ? `${m.name} (${$t('guilds.you')})` : m.name }}</span>
                  <span class="small muted">{{ $t(`guilds.ranks.${RANKS[m.rank].id}`) }}</span>
                  <span class="small faint tnum lvl">{{ $t('common.lvlShort', { n: m.level }) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.label { margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11.5px; }
.task { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius); background: var(--tint-1); border: 1px solid var(--line); }
.motto { font-style: italic; }
.ranks { display: flex; gap: 6px; margin-top: 12px; }
.rank-pip { flex: 1; height: 6px; border-radius: 3px; background: var(--tint-2); }
.rank-pip.on { background: var(--c, var(--gold)); box-shadow: 0 0 8px color-mix(in srgb, var(--c, var(--gold)) 60%, transparent); }
.reward { gap: 6px; margin-top: 10px; }
.roster { padding: 6px; }
.member { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; }
.member:nth-child(odd) { background: var(--tint-1); }
.member.hero { color: var(--gold-hi); background: rgba(226, 182, 90, 0.08); }
.member .lvl { min-width: 48px; text-align: end; }
.roster.compact .member { padding: 5px 8px; font-size: 14px; }
.empty { text-align: center; color: var(--muted); }
.empty p { max-width: 52ch; margin: 12px auto 16px; }
.guild { border-radius: var(--radius); background: var(--panel); border: 1px solid var(--line); margin-bottom: 10px; overflow: hidden; }
.guild.open { border-color: var(--line-hi); }
.guild.mine { border-color: color-mix(in srgb, var(--c) 60%, transparent); }
.guild-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px; background: none; border: 0; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.guild-head:hover { background: var(--tint-1); }
.place { width: 26px; text-align: center; font-family: var(--font-display); font-size: 18px; color: var(--muted); }
.guild-name { display: block; font-family: var(--font-display); font-size: 16.5px; letter-spacing: 0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.stars { color: var(--gold); letter-spacing: 0.05em; }
.renown { color: var(--ink-2); white-space: nowrap; }
.guild-body { padding: 4px 18px 18px; border-top: 1px solid var(--line); }
.req { margin: 3px 0; }
@media (max-width: 720px) {
  .renown { display: none; }
  /* The status goes under the name, so the name keeps the whole row */
  .guild-head { flex-wrap: wrap; row-gap: 6px; padding: 10px 12px; }
  .guild-head .pi { order: 4; }
  .guild-head .tag { order: 5; flex-basis: calc(100% - 38px); margin-inline-start: 38px; justify-content: center; }
  .guild-name { white-space: normal; font-size: 15.5px; }
  .guild-body { padding: 4px 12px 14px; }
}
</style>
