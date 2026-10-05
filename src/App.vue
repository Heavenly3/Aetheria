<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useToast } from 'primevue/usetoast'
import { G, state } from './game/engine.js'
import { session, exitToTitle } from './game/loop.js'
import { SKILLS } from './game/data/skills.js'
import { ITEMS } from './game/data/items.js'
import { ROLES, DIFFICULTIES } from './game/data/character.js'
import { fmt, fmtTime, fmtClock } from './game/format.js'
import { play, notify } from './game/sound.js'
import { tm } from './i18n/index.js'
import NavMenu from './components/NavMenu.vue'
import ActivityDock from './components/ActivityDock.vue'
import GameIcon from './components/GameIcon.vue'
import ItemTile from './components/ItemTile.vue'
import TitleScreen from './components/TitleScreen.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const drawer = ref(false)
const menu = ref()

const title = computed(() => (route.name === 'skill' ? SKILLS[route.params.id]?.name : route.meta.titleKey && t(route.meta.titleKey)) || 'Aetheria')
const hpPct = computed(() => (Math.max(0, state.hp) / G.maxHp()) * 100)
const unspent = computed(() => G.attrPoints() + G.talentPoints())
const menuItems = computed(() => [
  { label: t('heroMenu.viewHero'), icon: 'pi pi-user', command: () => router.push('/') },
  { label: t('heroMenu.saveNow'), icon: 'pi pi-save', command: () => { G.save(); G.toast('locked-chest', 'heroMenu.saved', {}, 'success') } },
  { separator: true },
  { label: t('heroMenu.mainMenu'), icon: 'pi pi-sign-out', command: () => exitToTitle() },
])

const SEVERITY = { warn: 'warn', success: 'success', error: 'error', rare: 'secondary', info: 'info' }
const push = (icon, detail, kind = 'info', life = 3500) => toast.add({ severity: SEVERITY[kind] || 'info', summary: '', detail, life, icon })

onMounted(() => {
  G.on('toast', e => push(e.icon, tm(e.msg), e.kind))
  G.on('levelup', d => { play('level'); push(SKILLS[d.skill].icon, t('toast.levelUp', { level: d.level, skill: SKILLS[d.skill].name }), 'success', 4500) })
  G.on('herolevel', l => { play('quest'); push('laurel-crown', t('toast.heroLevel', { level: l }), 'success', 6000); notify(t('toast.heroLevelPlain', { level: l }), t('toast.pointsToSpend')) })
  G.on('mastery', d => push('laurels-trophy', t('toast.mastery', { level: d.level, name: tm({ key: 'common.raw', params: { v: d.name } }) }), 'success', 4500))
  G.on('rare', d => { play('rare'); push(ITEMS[d.item].icon, t('toast.rare', { item: ITEMS[d.item].name }), 'rare', 5500) })
  G.on('achievement', a => { play('quest'); push(a.icon, t('toast.achievement', { name: a.name }) + (a.gold ? ` · +${fmt(a.gold)} ${t('common.gold')}` : ''), 'success', 5500) })
  G.on('quest', q => { play('quest'); push(q.icon, t('toast.quest', { name: q.name }), 'success', 5500) })
  G.on('pet', p => { play('rare'); push(p.icon, t('toast.pet', { name: p.name }), 'rare', 8000); notify(t('toast.petPlain', { name: p.name }), p.desc) })
  G.on('streak', d => { play('quest'); push('flame', t('toast.streak', { n: d.n }), 'success', 6000) })
  G.on('death', m => { play('bad'); push('broken-skull', t('toast.death', { name: m.name }), 'error', 5000) })
  G.on('expedition', r => { play(r.ok ? 'quest' : 'bad'); push(r.icon, tm({ key: r.ok ? 'toast.expeditionOk' : 'toast.expeditionFail', params: { name: r.name, exp: '@exp:' + r.exp, gold: fmt(r.gold) } }), r.ok ? 'success' : 'warn', 6000) })
  G.on('dungeon', d => {
    play('rare')
    const loot = Object.entries(d.got).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ') || t('common.nothing')
    push(d.dg.icon, t('toast.dungeon', { name: d.dg.name, loot }), 'success', 5000)
  })
  G.on('event', e => { play('rare'); push(e.ev.icon, tm(e.msg), 'rare', 7000) })
  G.on('notify', n => notify(t('notify.title'), tm(n)))
})

const off = computed(() => session.offline)
const ev = computed(() => G.currentEvent())
const offerOpen = ref(false)
function buyOffer() { if (G.buyOffer()) { play('coin'); offerOpen.value = false; G.toast('shopping-bag', 'event.bought', {}, 'success') } }
const offlineXp = computed(() => Object.entries(off.value?.xp || {}).filter(([k, v]) => SKILLS[k] && v >= 1).sort((a, b) => b[1] - a[1]))
const offlineItems = computed(() => Object.entries(off.value?.items || {}).filter(([k, v]) => ITEMS[k] && v !== 0).sort((a, b) => b[1] - a[1]))
const offlineKills = computed(() => Object.values(off.value?.kills || {}).reduce((a, b) => a + b, 0))
const offlineWhat = computed(() => {
  const a = off.value?.activity
  if (!a) return t('offline.idle')
  if (a.type === 'skill') return t('offline.training', { skill: SKILLS[a.skill].name, action: G.getAction(a.skill, a.action)?.name || '' })
  return a.kind === 'tower' ? t('offline.tower') : t('offline.fighting', { monster: G.getMonster(a)?.name || '' })
})
function startAdventure() {
  session.welcome = false
  const start = { warrior: '/combat', ranger: '/skill/woodcutting', mage: '/skill/runecrafting', artisan: '/skill/mining', rogue: '/skill/thieving', paladin: '/skill/prayer' }
  router.push(start[state.role] || '/skill/mining')
}
</script>

<template>
  <div class="bg-aura" aria-hidden="true" />

  <TitleScreen v-if="!session.inGame" />

  <template v-else>
    <div class="app">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark"><GameIcon name="crown" :size="24" /></div>
          <div><div class="brand-name">Aetheria</div><div class="brand-sub">{{ $t('app.tagline') }}</div></div>
        </div>
        <div class="nav-scroll"><NavMenu /></div>
      </aside>

      <main class="main">
        <header class="topbar">
          <Button class="menu-btn" icon="pi pi-bars" text rounded :aria-label="$t('app.openMenu')" @click="drawer = true" />
          <div class="topbar-title">{{ title }}</div>
          <div class="chips">
            <span class="chip" v-tooltip.bottom="$t('stats.hitpoints')">
              <GameIcon name="glass-heart" :size="15" />
              <span class="mini-hp"><i :style="{ width: hpPct + '%' }" /></span>
              {{ Math.max(0, state.hp) }}/{{ G.maxHp() }}
            </span>
            <span class="chip" v-tooltip.bottom="$t('stats.combatLevel')"><GameIcon name="crossed-swords" :size="15" />{{ G.combatLevel() }}</span>
            <span class="chip" v-tooltip.bottom="$t('stats.totalLevel')"><GameIcon name="star-medal" :size="15" />{{ G.totalLevel() }}</span>
            <button v-if="ev && state.event" class="chip event-chip" v-tooltip.bottom="ev.desc" @click="ev.offer ? (offerOpen = true) : null">
              <GameIcon :name="ev.icon" :size="15" />{{ ev.name }} · {{ fmtClock(state.event.t) }}
            </button>
            <span class="chip gold" v-tooltip.bottom="$t('common.gold')"><GameIcon name="two-coins" :size="15" />{{ fmt(state.gold) }}</span>
          </div>
          <button class="hero-chip" :aria-label="$t('heroMenu.label')" @click="menu.toggle($event)">
            <span class="hero-portrait">
              <ItemTile :icon="state.avatar" :tint="state.tint" size="sm" :tip="false" />
              <span v-if="unspent" class="hero-dot" />
            </span>
            <span class="hero-meta">
              <b>{{ state.name }}</b>
              <span class="small muted">{{ $t('common.lvlShort', { n: G.heroLevel() }) }} · {{ ROLES[state.role].name }}</span>
              <span class="bar thin"><i :style="{ width: G.heroProgress() * 100 + '%' }" /></span>
            </span>
            <i class="pi pi-angle-down muted" />
          </button>
          <Menu ref="menu" :model="menuItems" popup />
        </header>

        <section class="view">
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </transition>
          </router-view>
        </section>
      </main>
    </div>

    <ActivityDock />

    <Drawer v-model:visible="drawer" header="Aetheria" class="nav-drawer">
      <NavMenu @navigate="drawer = false" />
    </Drawer>
  </template>

  <Toast position="top-right">
    <template #message="{ message }">
      <div class="toast-body">
        <GameIcon :name="message.icon" :size="26" />
        <span class="toast-text" v-html="message.detail" />
      </div>
    </template>
  </Toast>
  <ConfirmDialog style="width: min(460px, calc(100vw - 32px))" />

  <Dialog :visible="!!off" modal :header="$t('offline.title')" style="width: min(540px, calc(100vw - 32px))" @update:visible="session.offline = null">
    <template v-if="off">
      <p class="muted" style="margin-top:0">
        <span v-html="$t('offline.away', { time: fmtTime(off.seconds) })" />
        <span v-if="off.capped"> {{ $t('offline.capped', { h: +G.offlineCapHours().toFixed(1) }) }}</span>
        {{ $t('offline.kept', { name: state.name, what: offlineWhat }) }}
      </p>
      <div class="stack" style="gap:6px">
        <div v-if="off.heroLevel" class="sum-row"><GameIcon name="laurel-crown" :size="18" />{{ $t('hero.heroLevel') }}<b class="gold-text">→ {{ off.heroLevel }}</b></div>
        <div v-if="off.gold" class="sum-row"><GameIcon name="two-coins" :size="18" />{{ $t('common.gold') }}<b class="gold-text">+{{ fmt(off.gold) }}</b></div>
        <div v-if="offlineKills" class="sum-row"><GameIcon name="crossed-swords" :size="18" />{{ $t('offline.kills') }}<b>{{ fmt(offlineKills) }}</b></div>
        <div v-if="off.tokens" class="sum-row"><GameIcon name="stone-tower" :size="18" />{{ $t('offline.towerTokens') }}<b class="gold-text">+{{ fmt(off.tokens) }}</b></div>
        <div v-if="off.eaten" class="sum-row"><GameIcon name="meat" :size="18" />{{ $t('offline.eaten') }}<b>{{ fmt(off.eaten) }}</b></div>
      </div>
      <div v-if="offlineXp.length" class="section-title" style="margin:18px 0 10px">{{ $t('offline.experience') }}</div>
      <div class="stack" style="gap:6px">
        <div v-for="[k, v] in offlineXp" :key="k" class="sum-row">
          <GameIcon :name="SKILLS[k].icon" :size="18" :style="{ color: SKILLS[k].color }" />{{ SKILLS[k].name }}
          <span v-if="off.levels[k]" class="tag gold">→ {{ $t('common.lvlShort', { n: off.levels[k] }) }}</span>
          <b class="ok-text">+{{ fmt(v) }} XP</b>
        </div>
      </div>
      <div v-if="offlineItems.length" class="section-title" style="margin:18px 0 10px">{{ $t('offline.items') }}</div>
      <div class="stack" style="gap:6px">
        <div v-for="[k, v] in offlineItems" :key="k" class="sum-row">
          <ItemTile :item="k" size="xs" />{{ ITEMS[k].name }}
          <b :class="v > 0 ? 'ok-text' : 'bad-text'">{{ v > 0 ? '+' : '' }}{{ fmt(v) }}</b>
        </div>
      </div>
      <p v-if="off.stopReason" class="small muted" style="margin-bottom:0"><i class="pi pi-pause-circle" /> {{ tm(off.stopReason) }}</p>
    </template>
    <template #footer><Button :label="$t('offline.collect')" icon="pi pi-check" @click="session.offline = null" /></template>
  </Dialog>

  <Dialog v-model:visible="offerOpen" modal :header="$t('events.merchant.name')" style="width: min(420px, calc(100vw - 32px))">
    <template v-if="state.event?.offer">
      <div class="row">
        <ItemTile :item="state.event.offer.item" size="lg" :qty="state.event.offer.qty" />
        <div class="grow">
          <b>{{ state.event.offer.qty }}× {{ ITEMS[state.event.offer.item].name }}</b>
          <div class="small muted">{{ $t('event.offer', { time: fmtClock(state.event.t) }) }}</div>
        </div>
      </div>
    </template>
    <div v-else class="small muted">{{ $t('event.gone') }}</div>
    <template #footer>
      <Button :label="$t('common.notNow')" severity="secondary" text @click="offerOpen = false" />
      <Button v-if="state.event?.offer" :label="$t('common.buyFor', { price: fmt(state.event.offer.price) })" icon="pi pi-shopping-cart" :disabled="state.gold < state.event.offer.price" @click="buyOffer" />
    </template>
  </Dialog>

  <Dialog :visible="session.inGame && session.welcome" modal :header="$t('welcome.title', { name: state.name })" style="width: min(540px, calc(100vw - 32px))" @update:visible="session.welcome = false">
    <div class="row" style="margin-bottom:14px">
      <ItemTile :icon="state.avatar" :tint="state.tint" size="lg" :tip="false" />
      <div>
        <b>{{ ROLES[state.role].name }}</b> · <span :style="{ color: DIFFICULTIES[state.difficulty].color }">{{ DIFFICULTIES[state.difficulty].name }}</span>
        <div class="small muted">{{ ROLES[state.role].desc }}</div>
      </div>
    </div>
    <ul class="muted" style="padding-inline-start:18px;line-height:1.7;margin:0">
      <li v-for="i in 6" :key="i" v-html="$t(`welcome.tips.${i - 1}`)" />
    </ul>
    <template #footer><Button :label="$t('welcome.start')" icon="pi pi-arrow-right" iconPos="right" @click="startAdventure" /></template>
  </Dialog>
</template>

<style>
.nav-drawer { width: min(300px, 86vw) !important; }
.nav-drawer .p-drawer-title { font-family: var(--font-display); font-weight: 400; color: var(--gold); }
.event-chip { border-color: rgba(179, 140, 255, 0.5) !important; color: #d6c4ff; cursor: pointer; font: inherit; font-weight: 700; animation: evGlow 2s infinite; }
.event-chip .gi { color: #b38cff; }
@keyframes evGlow { 50% { box-shadow: 0 0 14px -2px rgba(179, 140, 255, 0.6); } }
.hero-chip { display: flex; align-items: center; gap: 10px; padding-block: 5px; padding-inline: 5px 10px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line);
  color: var(--ink); font: inherit; cursor: pointer; transition: border-color 0.2s; }
.hero-chip:hover { border-color: var(--line-hi); }
.hero-portrait { position: relative; }
.hero-dot { position: absolute; top: -3px; inset-inline-end: -3px; width: 10px; height: 10px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 2px var(--bg); animation: pulseDot 1.6s infinite; }
@keyframes pulseDot { 50% { transform: scale(1.3); } }
.hero-meta { display: flex; flex-direction: column; gap: 2px; text-align: start; min-width: 110px; line-height: 1.15; }
.hero-meta b { font-size: 14px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 900px) { .hero-meta { display: none; } }
</style>
