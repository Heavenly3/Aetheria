<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import Badge from 'primevue/badge'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { ITEMS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { SPECIALTIES, RARITIES, TRAITS, TAVERN_LEVELS, EXPEDITIONS, EXPEDITION_DURATIONS, DRINKS, MYSTERY_CHEST } from '../game/data/tavern.js'
import { fmt, fmtTime, fmtClock, pct } from '../game/format.js'
import { play } from '../game/sound.js'
import { chanceNote } from '../ui/tips.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'
import HelpTip from '../components/HelpTip.vue'
import KeeperTalk from '../components/KeeperTalk.vue'

const { t: $tr } = useI18n()
const confirm = useConfirm()
const tab = ref('staff')
const now = ref(Date.now())
let timer
onMounted(() => {
  G.refreshBoard()
  G.ensureOrders()
  timer = setInterval(() => { now.value = Date.now(); G.refreshBoard(); G.ensureOrders() }, 1000)
})
onUnmounted(() => clearInterval(timer))

const t = computed(() => state.tavern)
const info = computed(() => G.tavernInfo())
const next = computed(() => G.nextTavern())
const costList = cost => Object.entries(cost).filter(([, v]) => v > 0)
const costOk = (k, v) => (k === 'gold' ? state.gold >= v : k === 'tokens' ? t.value.tokens >= v : G.qty(k) >= v)
function upgrade() { if (G.upgradeTavern()) { play('quest'); G.toast('beer-horn', 'tavern.upgraded', { name: '@tavern:' + state.tavern.level }, 'success') } }

/* ---------------- Staff ---------------- */
const STATUS_CLS = { idle: '', working: 'ok', nomat: 'bad', unpaid: 'bad', expedition: 'arcane', injured: 'bad' }
const boardIn = computed(() => Math.max(0, (t.value.boardAt - now.value) / 1000))
const effPct = w => Math.round(G.workerEff(w) * 100)
function hire(i) {
  const c = t.value.board[i]
  if (G.hire(i)) { play('coin'); G.toast(SPECIALTIES[c.spec].icon, 'tavern.joined', { name: c.name }, 'success') }
  else if (G.freeSlots() <= 0) G.toast('beer-horn', 'tavern.noSlots', {}, 'warn')
  else G.toast('two-coins', 'common.notEnoughGold', {}, 'warn')
}
function fire(w) {
  confirm.require({
    header: $tr('tavern.fireTitle', { name: w.name }), message: $tr('tavern.fireMessage'), icon: 'pi pi-user-minus',
    acceptLabel: $tr('tavern.fire'), rejectLabel: $tr('common.cancel'), acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => G.fire(w.uid),
  })
}
const taskOptions = w => G.workerActions(w).map(a => ({
  value: a.id, label: `${a.name} · ${$tr('common.lvlShort', { n: a.lvl })}`, disabled: G.workerLevel(w) < a.lvl,
}))
function setTask(w, id) { if (id) G.assign(w.uid, id); else G.unassign(w.uid) }
const taskAction = w => (w.task ? G.getAction(SPECIALTIES[w.spec].skill, w.task.action) : null)
const taskProgress = w => {
  const a = taskAction(w)
  return a ? Math.min(1, w.task.progress / (a.time / G.workerEff(w))) : 0
}

/* ---------------- Expeditions ---------------- */
const adventurers = computed(() => t.value.workers.filter(w => w.spec === 'adventurer'))
const sendWho = ref(null)
const durIdx = ref(0)
const durOpts = computed(() => EXPEDITION_DURATIONS.map((d, i) => ({ label: $tr('time.hours', { n: d.hours }), value: i })))
const whoOpts = computed(() => adventurers.value.map(w => ({
  value: w.uid, label: `${w.name} · ${$tr('common.lvlShort', { n: G.workerLevel(w) })}`, disabled: !!w.exp || w.injured > 0,
})))
const who = computed(() => adventurers.value.find(w => w.uid === sendWho.value) || null)
function send(ex) {
  if (!who.value) return G.toast('crossed-swords', 'tavern.pickAdventurer', {}, 'warn')
  if (G.sendExpedition(who.value.uid, ex.id, durIdx.value)) { G.toast(ex.icon, 'tavern.departs', { name: who.value.name, exp: '@exp:' + ex.id }, 'success'); sendWho.value = null }
}

/* ---------------- Orders ---------------- */
const nextDay = computed(() => {
  const d = new Date(now.value); d.setHours(24, 0, 0, 0)
  return (d - now.value) / 1000
})
function deliver(i) { if (G.deliverOrder(i)) { play('quest'); G.toast('scroll-unfurled', 'tavern.delivered', {}, 'success') } }

/* ---------------- Bar ---------------- */
const bet = ref(100)
const lastRoll = ref(null)
const rolling = ref(false)
const drink = computed(() => (t.value.drink ? DRINKS.find(d => d.id === t.value.drink.id) : null))
function buyDrink(d) { if (G.buyDrink(d.id)) { play('coin'); G.toast(d.icon, 'tavern.drank', { drink: '@drink:' + d.id }, 'success') } }
function roll() {
  if (rolling.value) return
  rolling.value = true
  play('dice')
  setTimeout(() => {
    const r = G.rollDice(bet.value)
    rolling.value = false
    if (!r) return G.toast('perspective-dice-six-faces-random', 'tavern.badBet', {}, 'warn')
    lastRoll.value = r
    play(r.delta > 0 ? (r.kind === 'jackpot' ? 'rare' : 'coin') : r.delta < 0 ? 'bad' : 'dice')
  }, 550)
}
const FACES = ['', 'dice-six-faces-one', 'dice-six-faces-two', 'dice-six-faces-three', 'dice-six-faces-four', 'dice-six-faces-five', 'dice-six-faces-six']
function mystery() {
  const got = G.openMystery()
  if (!got) return
  play('rare')
  G.toast('open-treasure-chest', 'tavern.mysteryGot', { items: Object.entries(got).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ') }, 'success')
}
const expName = id => EXPEDITIONS.find(e => e.id === id)?.name || id
const readyOrders = computed(() => t.value.orders.filter(o => !o.done && G.qty(o.item) >= o.qty).length)
</script>

<template>
  <div>
    <div class="banner" style="--c:#c9853a">
      <GameIcon class="banner-ghost" name="beer-horn" :size="220" />
      <ItemTile icon="beer-horn" tint="#a0662a" size="xl" :tip="false" />
      <div class="grow">
        <h1 class="banner-title">{{ info.name }}</h1>
        <div class="banner-desc">{{ $t('tavern.intro') }}</div>
        <div class="row wrap">
          <span class="tag">{{ $t('home.level', { n: t.level, max: TAVERN_LEVELS.length }) }}</span>
          <span class="tag">{{ $t('tavern.staffCount', { n: t.workers.length, max: info.slots }) }}</span>
          <span class="tag bad" v-if="G.wagesPerHour()">{{ $t('tavern.wages', { n: fmt(G.wagesPerHour()) }) }}</span>
          <span class="tag gold"><GameIcon name="two-coins" :size="12" /> {{ $t('tavern.tokens', { n: fmt(t.tokens) }) }}</span>
        </div>
      </div>
      <div class="panel pad up-card">
        <b>{{ next ? $t('tavern.upgradeTo', { name: next.name }) : $t('tavern.maxLevel') }}</b>
        <template v-if="next">
          <div class="small muted">{{ $t('tavern.upgradeHint') }}</div>
          <div class="cost">
            <span v-for="[k, v] in costList(next.cost)" :key="k" class="cost-i" :class="{ miss: !costOk(k, v) }" v-tooltip.top="k === 'gold' ? $t('common.gold') : ITEMS[k].name">
              <ItemTile v-if="k !== 'gold'" :item="k" size="xs" /><GameIcon v-else name="two-coins" :size="16" />{{ fmt(v) }}
            </span>
          </div>
          <Button :label="G.tavernUpgradeBlocker() ? $t(G.tavernUpgradeBlocker()) : $t('tavern.upgrade')" icon="pi pi-arrow-up" size="small" :disabled="!!G.tavernUpgradeBlocker()" @click="upgrade" />
        </template>
      </div>
    </div>

    <KeeperTalk />

    <Tabs v-model:value="tab" style="margin-top:18px">
      <TabList>
        <Tab value="staff">{{ $t('tavern.tabs.staff') }}</Tab>
        <Tab value="expeditions">{{ $t('tavern.tabs.expeditions') }}</Tab>
        <Tab value="orders">{{ $t('tavern.tabs.orders') }} <Badge v-if="readyOrders" :value="readyOrders" size="small" style="margin-inline-start:6px" /></Tab>
        <Tab value="bar">{{ $t('tavern.tabs.bar') }}</Tab>
      </TabList>
      <TabPanels style="background:transparent;padding:18px 0 0">
        <!-- STAFF -->
        <TabPanel value="staff">
          <div class="section-title" style="margin-top:0">{{ $t('tavern.yourStaff') }} <HelpTip k="sections.staff" /></div>
          <div v-if="!t.workers.length" class="panel pad muted">{{ $t('tavern.noStaff') }}</div>
          <div class="grid-wide">
            <div v-for="w in t.workers" :key="w.uid" class="card worker" :style="{ '--c': RARITIES[w.rarity].color }">
              <div class="row">
                <ItemTile :icon="w.avatar" :tint="RARITIES[w.rarity].color" size="lg" :tip="false" />
                <div class="grow">
                  <div class="card-name">{{ w.name }}</div>
                  <div class="row wrap" style="gap:5px;margin-top:3px">
                    <span class="tag" :style="{ color: RARITIES[w.rarity].color }">{{ RARITIES[w.rarity].name }}</span>
                    <span class="tag"><GameIcon :name="SPECIALTIES[w.spec].icon" :size="12" /> {{ SPECIALTIES[w.spec].name }}</span>
                    <span class="tag" :class="STATUS_CLS[w.status]">{{ $t('tavern.status.' + w.status) }}</span>
                  </div>
                </div>
              </div>
              <div class="row small muted">
                <span class="grow">{{ SPECIALTIES[w.spec].skill ? $t('tavern.levelIn', { n: G.workerLevel(w), skill: SKILLS[SPECIALTIES[w.spec].skill].name }) : $t('common.levelN', { n: G.workerLevel(w) }) }}</span>
                <span>{{ $t('tavern.efficiency', { v: effPct(w) }) }} · {{ $t('tavern.perHour', { n: fmt(G.workerWage(w)) }) }}</span>
              </div>
              <div class="bar thin" :style="{ '--c': RARITIES[w.rarity].color }"><i :style="{ width: G.workerProgress(w) * 100 + '%' }" /></div>
              <div class="row wrap" style="gap:5px">
                <span v-for="tr in w.traits" :key="tr" class="tag" :class="TRAITS[tr].good ? 'ok' : 'bad'" v-tooltip.top="TRAITS[tr].desc">{{ TRAITS[tr].name }}</span>
              </div>
              <template v-if="w.exp">
                <div class="small" v-html="$t('tavern.onExpedition', { exp: expName(w.exp.id), time: fmtClock(w.exp.t) })" />
                <div class="bar" style="--c:#6fc3b8"><i :style="{ width: (1 - w.exp.t / w.exp.total) * 100 + '%' }" /></div>
              </template>
              <div v-else-if="w.injured > 0" class="small bad-text">{{ $t('tavern.recovering', { time: fmtClock(w.injured) }) }}</div>
              <template v-else-if="SPECIALTIES[w.spec].skill">
                <Select :modelValue="w.task?.action || null" @update:modelValue="v => setTask(w, v)" :options="taskOptions(w)" optionLabel="label" optionValue="value"
                  optionDisabled="disabled" showClear filter :placeholder="$t('tavern.assign')" class="w-full" size="small" />
                <div v-if="taskAction(w)" class="row small">
                  <ItemTile :icon="taskAction(w).icon" :tint="taskAction(w).tint" size="xs" :tip="false" />
                  <span class="bar thin grow"><i :style="{ width: taskProgress(w) * 100 + '%' }" /></span>
                  <span class="muted tnum">{{ (taskAction(w).time / G.workerEff(w)).toFixed(1) }} s</span>
                </div>
              </template>
              <div v-else class="small muted">{{ $t('tavern.adventurerHint') }}</div>
              <div class="row small faint">
                <span class="grow">{{ $t('tavern.made', { n: fmt(w.made || 0) }) }}</span>
                <Button :label="$t('tavern.fire')" icon="pi pi-user-minus" size="small" text severity="danger" @click="fire(w)" />
              </div>
            </div>
          </div>

          <div class="section-title">{{ $t('tavern.board') }} <HelpTip k="sections.board" /></div>
          <div class="row wrap" style="margin-bottom:14px">
            <span class="small muted grow">{{ $t('tavern.boardHint', { time: fmtTime(boardIn), n: G.freeSlots() }) }}</span>
            <Button :label="$t('tavern.rerollGold', { n: fmt(G.rerollCost()) })" icon="pi pi-refresh" size="small" severity="secondary" :disabled="state.gold < G.rerollCost()" @click="G.rerollBoard()" />
            <Button :label="$t('tavern.rerollToken')" icon="pi pi-refresh" size="small" severity="secondary" outlined :disabled="t.tokens < 1" @click="G.rerollBoard(true)" />
          </div>
          <div class="grid-cards">
            <div v-for="(c, i) in t.board" :key="i + c.name" class="card cand" :style="{ '--c': RARITIES[c.rarity].color }">
              <div class="row">
                <ItemTile :icon="c.avatar" :tint="RARITIES[c.rarity].color" size="md" :tip="false" />
                <div class="grow">
                  <div class="card-name">{{ c.name }}</div>
                  <div class="small" :style="{ color: RARITIES[c.rarity].color }">{{ RARITIES[c.rarity].name }} · {{ SPECIALTIES[c.spec].name }}</div>
                </div>
              </div>
              <div class="row wrap" style="gap:5px">
                <span class="tag">{{ $t('common.levelN', { n: G.workerLevel(c) }) }}</span>
                <span class="tag">{{ $t('tavern.efficiency', { v: effPct(c) }) }}</span>
                <span v-for="tr in c.traits" :key="tr" class="tag" :class="TRAITS[tr].good ? 'ok' : 'bad'" v-tooltip.top="TRAITS[tr].desc">{{ TRAITS[tr].name }}</span>
              </div>
              <div class="small muted">{{ $t('tavern.wageHire', { wage: fmt(G.workerWage(c)), fee: fmt(G.hireFee(c)) }) }}</div>
              <Button :label="$t('tavern.hire')" icon="pi pi-user-plus" size="small" fluid :disabled="G.freeSlots() <= 0 || state.gold < G.hireFee(c)" @click="hire(i)" />
            </div>
          </div>
        </TabPanel>

        <!-- EXPEDITIONS -->
        <TabPanel value="expeditions">
          <div class="panel pad" style="margin-bottom:16px">
            <div class="row wrap">
              <div class="grow" style="min-width:220px">
                <label class="small muted" for="exp-who">{{ $t('tavern.adventurer') }}</label>
                <Select inputId="exp-who" v-model="sendWho" :options="whoOpts" optionLabel="label" optionValue="value" optionDisabled="disabled" :placeholder="$t('tavern.pickAdventurer')"
                  :emptyMessage="$t('tavern.noAdventurers')" class="w-full" />
              </div>
              <div>
                <div class="small muted">{{ $t('inventory.duration') }}</div>
                <SelectButton v-model="durIdx" :options="durOpts" optionLabel="label" optionValue="value" :allowEmpty="false" />
              </div>
            </div>
            <p class="small faint" style="margin-bottom:0">{{ $t('tavern.expeditionHint') }}</p>
          </div>
          <div class="grid-wide">
            <div v-for="ex in EXPEDITIONS" :key="ex.id" class="card">
              <div class="row">
                <ItemTile :icon="ex.icon" tint="#3f7a6a" size="md" :tip="false" />
                <div class="grow"><div class="card-name">{{ ex.name }}</div><div class="card-sub">{{ $t('tavern.power', { n: ex.power }) }}</div></div>
                <span v-if="who" class="tag" :class="G.expeditionChance(who, ex) >= 0.7 ? 'ok' : G.expeditionChance(who, ex) < 0.4 ? 'bad' : ''">{{ $t('tavern.successChance', { v: pct(G.expeditionChance(who, ex)) }) }}</span>
              </div>
              <div class="row wrap" style="gap:5px;margin-top:10px">
                <span class="tag gold">{{ $t('inventory.goldAmount', { n: fmt(ex.gold * EXPEDITION_DURATIONS[durIdx].mult) }) }}</span>
                <ItemTile v-for="l in ex.loot" :key="l.item" :item="l.item" size="sm" />
              </div>
              <Button :label="$t('tavern.send')" icon="pi pi-send" size="small" fluid style="margin-top:12px" :disabled="!who" @click="send(ex)" />
            </div>
          </div>
          <div class="section-title">{{ $t('tavern.reports') }} <HelpTip k="sections.reports" /></div>
          <div class="panel pad">
            <div v-if="!t.reports.length" class="small muted">{{ $t('tavern.noReports') }}</div>
            <div v-for="(r, i) in t.reports" :key="i" class="report">
              <GameIcon :name="r.icon" :size="18" />
              <div class="grow">
                <b>{{ r.name }}</b> · {{ expName(r.exp) }} <span class="tag" :class="r.ok ? 'ok' : 'bad'">{{ r.ok ? $t('tavern.success') : $t('tavern.failure') }}</span>
                <div class="row wrap small muted" style="gap:4px 10px;margin-top:4px">
                  <span class="gold-text">+{{ $t('inventory.goldAmount', { n: fmt(r.gold) }) }}</span>
                  <span v-for="(n, k) in r.items" :key="k" class="row" style="gap:4px"><ItemTile :item="k" size="xs" />{{ n }}× {{ ITEMS[k].name }}</span>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- ORDERS -->
        <TabPanel value="orders">
          <p class="intro">{{ $t('tavern.ordersIntro', { n: t.orders.length, time: fmtTime(nextDay) }) }}</p>
          <div class="grid-wide">
            <div v-for="(o, i) in t.orders" :key="i + o.item" class="card" :class="{ done: o.done }">
              <div class="row">
                <ItemTile :item="o.item" size="lg" />
                <div class="grow">
                  <div class="card-name">{{ o.qty }}× {{ ITEMS[o.item].name }}</div>
                  <div class="card-sub">{{ $t('tavern.youHave', { n: fmt(G.qty(o.item)), total: o.qty }) }}</div>
                </div>
                <i v-if="o.done" class="pi pi-check-circle ok-text" style="font-size:20px" />
              </div>
              <div class="bar thin" style="margin-top:10px"><i :style="{ width: Math.min(1, G.qty(o.item) / o.qty) * 100 + '%' }" /></div>
              <div class="row wrap" style="gap:5px;margin-top:10px">
                <span class="tag gold">{{ $t('inventory.goldAmount', { n: fmt(o.gold) }) }}</span>
                <span class="tag gold">{{ $t('tower.tokens', { n: o.tokens }) }}</span>
                <span class="tag">{{ $t('quests.xp', { n: fmt(o.xp), skill: SKILLS[o.skill].name }) }}</span>
              </div>
              <div v-if="!o.done" class="row" style="margin-top:12px">
                <Button :label="$t('tavern.deliver')" icon="pi pi-check" size="small" class="grow" :disabled="G.qty(o.item) < o.qty" @click="deliver(i)" />
                <Button :label="$t('tavern.rerollOrder')" icon="pi pi-refresh" size="small" severity="secondary" outlined :disabled="t.tokens < 2" @click="G.rerollOrder(i)" />
              </div>
              <div v-else class="small ok-text" style="margin-top:12px">{{ $t('tavern.deliveredShort') }}</div>
            </div>
          </div>
        </TabPanel>

        <!-- BAR -->
        <TabPanel value="bar">
          <div class="section-title" style="margin-top:0">{{ $t('tavern.drinks') }} <HelpTip k="sections.drinks" /></div>
          <div v-if="drink" class="panel pad row" style="margin-bottom:12px">
            <GameIcon :name="drink.icon" :size="22" class="gold-text" />
            <span class="grow" v-html="$t('tavern.underEffect', { name: drink.name, desc: drink.desc })" />
            <b class="tnum gold-text">{{ fmtClock(t.drink.t) }}</b>
          </div>
          <div class="grid-cards">
            <div v-for="d in DRINKS" :key="d.id" class="card" :class="{ active: t.drink?.id === d.id }" style="--c:#e2b65a">
              <div class="row">
                <ItemTile :icon="d.icon" tint="#a0662a" size="md" :tip="false" />
                <div class="grow"><div class="card-name">{{ d.name }}</div><div class="card-sub">{{ d.desc }} · {{ $t('tavern.minutes', { n: 30 }) }}</div></div>
              </div>
              <Button :label="d.price.gold ? $t('inventory.goldAmount', { n: fmt(d.price.gold) }) : $t('tower.tokens', { n: d.price.tokens })" icon="pi pi-shopping-cart" size="small" fluid style="margin-top:12px"
                :disabled="!G.canAffordCost(d.price)" @click="buyDrink(d)" />
            </div>
          </div>
          <p class="small faint">{{ $t('tavern.oneDrink') }}</p>

          <div class="two-col" style="margin-top:20px">
            <div class="panel pad">
              <h3 class="panel-title"><GameIcon name="perspective-dice-six-faces-random" /> {{ $t('tavern.diceTitle') }} <HelpTip k="sections.dice" /></h3>
              <p class="small muted" style="margin-top:0">{{ $t('tavern.diceRules') }}</p>
              <div class="dice-table">
                <div class="dice-side">
                  <div class="small muted">{{ $t('tavern.you') }}</div>
                  <div class="dice" :class="{ rolling }">
                    <GameIcon v-for="(v, i) in lastRoll?.p || [6, 6]" :key="i" :name="FACES[v]" :size="44" />
                  </div>
                </div>
                <div class="vs">{{ $t('tavern.vs') }}</div>
                <div class="dice-side">
                  <div class="small muted">{{ $t('tavern.barkeep') }}</div>
                  <div class="dice" :class="{ rolling }">
                    <GameIcon v-for="(v, i) in lastRoll?.h || [1, 1]" :key="i" :name="FACES[v]" :size="44" />
                  </div>
                </div>
              </div>
              <div v-if="lastRoll && !rolling" class="roll-result" :class="lastRoll.delta > 0 ? 'ok-text' : lastRoll.delta < 0 ? 'bad-text' : 'muted'">
                {{ $t('tavern.roll.' + lastRoll.kind) }} <b v-if="lastRoll.delta">{{ $t('inventory.goldAmount', { n: (lastRoll.delta > 0 ? '+' : '') + fmt(lastRoll.delta) }) }}</b>
              </div>
              <div class="row" style="margin-top:12px">
                <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="dice-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" />
                <Button :label="$t('tavern.rollDice')" icon="pi pi-sync" :loading="rolling" @click="roll" />
              </div>
              <div class="small faint" style="margin-top:8px">{{ $t('tavern.diceStats', { max: fmt(info.maxBet), n: t.dice.played, net: (t.dice.net >= 0 ? '+' : '') + fmt(t.dice.net) }) }}</div>
            </div>
            <div class="panel pad">
              <h3 class="panel-title"><GameIcon name="open-treasure-chest" /> {{ $t('tavern.mysteryTitle') }} <HelpTip k="sections.mystery" /></h3>
              <p class="small muted" style="margin-top:0">{{ $t('tavern.mysteryIntro', { n: MYSTERY_CHEST.tokens }) }}</p>
              <div class="row wrap" style="gap:5px;margin-bottom:12px">
                <ItemTile v-for="l in MYSTERY_CHEST.loot" :key="l.item" :item="l.item" size="sm" :note="chanceNote(l.chance)" />
              </div>
              <Button :label="$t('tavern.mysteryOpen', { n: MYSTERY_CHEST.tokens })" icon="pi pi-box" fluid :disabled="t.tokens < MYSTERY_CHEST.tokens" @click="mystery" />
              <p class="small faint" style="margin-bottom:0">{{ $t('tavern.tokensHint') }}</p>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
.up-card { display: flex; flex-direction: column; gap: 8px; width: 290px; padding: 14px; }
.cost { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font-size: 13px; }
.cost-i { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; color: var(--ink-2); }
.cost-i .gi { color: var(--gold); }
.cost-i.miss { color: var(--danger); }
.worker, .cand { display: flex; flex-direction: column; gap: 10px; }
.w-full { width: 100%; }
.report { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px dashed var(--line); }
.report:last-child { border-bottom: 0; }
.report > .gi { color: var(--gold); margin-top: 2px; }
.dice-table { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; padding: 14px; border-radius: 14px; background: var(--well); }
.dice-side { text-align: center; }
.dice { display: flex; justify-content: center; gap: 8px; color: var(--ink); margin-top: 6px; }
.dice.rolling { animation: shakeDice 0.18s infinite; }
@keyframes shakeDice { 25% { transform: rotate(-8deg) translateY(-2px); } 75% { transform: rotate(8deg) translateY(2px); } }
.vs { font-family: var(--font-display); color: var(--gold); }
.roll-result { text-align: center; margin-top: 10px; font-size: 15px; }
@media (max-width: 900px) { .up-card { width: 100%; } }
</style>
