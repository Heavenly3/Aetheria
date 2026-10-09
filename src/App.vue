<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useToast } from 'primevue/usetoast'
import { G, state, HP_REGEN, HP_REGEN_COMBAT } from './game/engine.js'
import { help, tip } from './ui/tips.js'
import { session, exitToTitle } from './game/loop.js'
import { SKILLS } from './game/data/skills.js'
import { ITEMS } from './game/data/items.js'
import { ROLES, DIFFICULTIES } from './game/data/character.js'
import { fmt, fmtTime, fmtClock } from './game/format.js'
import { play, notify } from './game/sound.js'
import { startAmbient, stopAmbient, setScene, applyAudioSettings, moodFor } from './game/music.js'
import { setCompactNumbers } from './game/format.js'
import { tm } from './i18n/index.js'
import NavMenu from './components/NavMenu.vue'
import HelpTip from './components/HelpTip.vue'
import { weatherAt, nextWeather, skyMods } from './game/data/weather.js'
import { modText } from './i18n/mods.js'
import ActivityDock from './components/ActivityDock.vue'
import GameIcon from './components/GameIcon.vue'
import ItemTile from './components/ItemTile.vue'
import TitleScreen from './components/TitleScreen.vue'
import BottomNav from './components/BottomNav.vue'
import TutorialCoach from './components/TutorialCoach.vue'
import UpdateNotes from './components/UpdateNotes.vue'
import { newsUnseen, markNewsSeen, latestUpdate } from './ui/news.js'
import { titled, cosmeticsForAch } from './game/data/cosmetics.js'
import { RARITY_TINT } from './game/data/omens.js'

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const drawer = ref(false)
const menu = ref()

const title = computed(() => (route.name === 'skill' ? SKILLS[route.params.id]?.name : route.meta.titleKey && t(route.meta.titleKey)) || 'Aetheria')
const hpPct = computed(() => (Math.max(0, state.hp) / G.maxHp()) * 100)
const fest = computed(() => G.activeFestival())
// Weather follows the clock (it changes every few hours, the same for everyone)
const wx = computed(() => (void state.lastTick, weatherAt()))
const wxLook = computed(() => {
  const w = wx.value.weather, clearNight = w.id === 'clear' && wx.value.night
  return { icon: clearNight ? null : w.icon, pi: clearNight ? 'pi pi-moon' : w.pi, key: clearNight ? 'clearNight' : w.id, tint: w.tint }
})
const wxTip = computed(() => {
  const w = wx.value, next = nextWeather()
  const lines = []
  if (w.weather.event) lines.unshift({ text: t('weather.eventLine'), kind: 'gold' })
  lines.push({ text: t('weather.changesIn', { t: fmtTime(Math.max(0, (w.endsAt - Date.now()) / 1000)) }), kind: 'muted' })
  if (next.weather.event && next.weather.id !== w.weather.id) lines.push({ text: t('weather.comingLine', { name: next.weather.name }), kind: 'gold' })
  // What the sky does to the game right now: the weather, the season and the night
  for (const part of skyMods(w)) {
    lines.push({ text: t(`weather.from.${part.from}`, { season: t(`weather.seasons.${w.season}`) }), kind: 'gold' })
    for (const [k, v] of Object.entries(part.mods)) lines.push({ text: modText(k, v), kind: v < 0 ? 'bad' : 'ok' })
    if (part.from === 'weather' && w.weather.monster > 1) lines.push({ text: t('weather.monsters', { v: Math.round((w.weather.monster - 1) * 100) }), kind: 'bad' })
  }
  return tip(t(`weather.${wxLook.value.key}.name`), t(`weather.${wxLook.value.key}.desc`), lines)
})
// Music follows what the hero is doing and the weather; settings apply as soon as they change
watch(() => ({ mood: moodFor(), weather: wx.value.weather.id, night: wx.value.night }), setScene, { immediate: true, deep: true })
watch(() => ({ ...state.settings }), st => {
  applyAudioSettings()
  setCompactNumbers(st.compactNumbers)
  document.documentElement.dataset.motion = st.reduceMotion ? 'reduce' : ''
}, { immediate: true, deep: true })
watch(() => session.inGame, on => (on ? startAmbient() : stopAmbient()), { immediate: true })
const toggleMute = () => { state.settings.muted = !state.settings.muted }
// Climate events are announced when they begin
watch(() => wx.value.block, (b, old) => {
  const w = wx.value.weather
  if (old === undefined) return
  // Every change is announced, since it changes how the game plays; climate events stand out
  push(w.icon || 'sparkles', t(w.event ? 'weather.started' : 'weather.changed', { name: w.name }), w.event ? 'rare' : 'info', 7000)
})
// The "?" next to the screen title explains the screen you are on
const screenHelp = computed(() => (route.name && te(`help.screens.${String(route.name)}.body`) ? `screens.${String(route.name)}` : null))
// The companion chip: hunger follows the clock, so it is re-read on every tick
const pal = computed(() => {
  void state.lastTick
  const p = G.companion()
  const c = state.companions
  const eggs = G.readyEggs()
  if (!p) return eggs ? { icon: 'cosmic-egg', tint: '#b38cff', full: 0, alert: true, tip: t('pets.chip.egg'), egg: true } : null
  const mood = G.hungerState(p.id)
  const alert = mood === 'starving' || mood === 'hungry' || c.basket.length > 0 || eggs > 0
  const tip = c.basket.length ? t('pets.chip.gifts', { name: G.petName(p.id), n: c.basket.length }) : eggs ? t('pets.chip.egg') : t('pets.chip.' + mood, { name: G.petName(p.id) })
  return { icon: p.icon, tint: p.tint, full: G.fullness(p.id), alert, tip, gifts: c.basket.length }
})
const unspent = computed(() => G.attrPoints() + G.talentPoints())
const menuItems = computed(() => [
  { label: t('heroMenu.viewHero'), icon: 'pi pi-user', command: () => router.push('/') },
  { label: t('nav.settings'), icon: 'pi pi-cog', command: () => router.push('/settings') },
  { label: t('heroMenu.saveNow'), icon: 'pi pi-save', command: () => { G.save(); G.toast('locked-chest', 'heroMenu.saved', {}, 'success') } },
  { separator: true },
  { label: t('heroMenu.mainMenu'), icon: 'pi pi-sign-out', command: () => exitToTitle() },
])

const SEVERITY = { warn: 'warn', success: 'success', error: 'error', rare: 'secondary', info: 'info' }
const push = (icon, detail, kind = 'info', life = 3500) => toast.add({ severity: SEVERITY[kind] || 'info', summary: '', detail, life, icon })

onMounted(() => {
  G.on('toast', e => push(e.icon, tm(e.msg), e.kind))
  G.on('levelup', d => { if (state.settings.quietToasts) return; play('level'); push(SKILLS[d.skill].icon, t('toast.levelUp', { level: d.level, skill: SKILLS[d.skill].name }), 'success', 4500) })
  G.on('herolevel', l => { play('quest'); push('laurel-crown', t('toast.heroLevel', { level: l }), 'success', 6000); notify(t('toast.heroLevelPlain', { level: l }), t('toast.pointsToSpend')) })
  G.on('mastery', d => state.settings.quietToasts || push('laurels-trophy', t('toast.mastery', { level: d.level, name: tm({ key: 'common.raw', params: { v: d.name } }) }), 'success', 4500))
  G.on('rare', d => { play('rare'); push(ITEMS[d.item].icon, t('toast.rare', { item: ITEMS[d.item].name }), 'rare', 5500) })
  G.on('achievement', a => { play('quest'); push(a.icon, t('toast.achievement', { name: a.name }) + (a.gold ? ` · +${fmt(a.gold)} ${t('common.gold')}` : '') + (cosmeticsForAch(a.id) ? ` · ${t('cosmetics.unlockedToast')}` : ''), 'success', 5500) })
  G.on('elite', e => { play('rare'); push(e.monster.icon, t('toast.elite', { name: t('fighting.eliteName', { kind: t(`fighting.elites.${e.kind}`), name: e.monster.name }) }), 'rare', 5000) })
  G.on('chapter', c => { play('quest'); push(c.icon, t('toast.chapter', { name: t(`journal.chapters.${c.id}.title`) }), 'rare', 6500) })
  G.on('quest', q => { play('quest'); push(q.icon, t('toast.quest', { name: q.name }), 'success', 5500) })
  G.on('pet', p => { play('rare'); push(p.icon, t('toast.pet', { name: p.name }), 'rare', 8000); notify(t('toast.petPlain', { name: p.name }), p.desc) })
  G.on('petEgg', () => { play('rare'); push('cosmic-egg', t('toast.petEgg'), 'rare', 8000); notify(t('toast.petEggPlain'), t('toast.petEggHint')) })
  G.on('petLevel', d => { play('level'); push(d.pet.icon, t('toast.petLevel', { name: G.petName(d.pet.id), level: d.level }), 'success', 4500) })
  G.on('petBond', d => { play('quest'); push(d.pet.icon, t('toast.petBond', { name: G.petName(d.pet.id), tier: t(`pets.bond.${d.tier}`) }), 'success', 5500) })
  G.on('weeklyKill', d => { play('quest'); push(d.boss.icon, t(d.trophy ? 'toast.weeklyKill' : 'toast.weeklyKillAgain', { name: d.boss.name }), 'rare', 8000); notify(d.boss.name, t('weekly.slainHint')) })
  G.on('streak', d => { play('quest'); push('flame', t('toast.streak', { n: d.n }), 'success', 6000) })
  G.on('death', m => { play('bad'); push('broken-skull', t('toast.death', { name: m.name }), 'error', 5000) })
  G.on('expedition', r => { play(r.ok ? 'quest' : 'bad'); push(r.icon, tm({ key: r.ok ? 'toast.expeditionOk' : 'toast.expeditionFail', params: { name: r.name, exp: '@exp:' + r.exp, gold: fmt(r.gold) } }), r.ok ? 'success' : 'warn', 6000) })
  G.on('dungeon', d => {
    play('rare')
    const loot = Object.entries(d.got).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ') || t('common.nothing')
    push(d.dg.icon, t('toast.dungeon', { name: d.dg.name, loot }), 'success', 5000)
  })
  G.on('event', e => { play('rare'); push(e.ev.icon, tm(e.msg), 'rare', 7000) })
  G.on('omenSign', e => push('crystal-ball', tm(e.msg), 'info', 7000))
  G.on('boon', b => { play('quest'); push('sparkles', t('toast.boon', { name: t(`omens.boons.${b.id}.name`) }), 'success', 6000) })
  G.on('wish', w => { play('rare'); push('burning-meteor', t('toast.wish', { wish: t(`omens.wishes.${w.id}`) }), 'rare', 7000) })
  G.on('notify', n => notify(t('notify.title'), tm(n)))
})

const off = computed(() => session.offline)
// After an update, returning players see what changed once; new players start with it seen
const news = ref(false)
watch(() => session.inGame, on => {
  if (!on) return
  if (session.welcome) markNewsSeen()
  else news.value = newsUnseen()
}, { immediate: true })
function closeNews(all) {
  news.value = false
  markNewsSeen()
  if (all) router.push('/settings')
}
const ev = computed(() => G.currentEvent())
const omenSign = computed(() => G.omenSign())
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
  // New characters follow the guided tutorial from the hero screen
  if (!state.tutorial.done) { router.push('/'); return }
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
          <div class="topbar-title">{{ title }}<HelpTip v-if="screenHelp" :k="screenHelp" :params="{ skill: title }" class="screen-help" /></div>
          <div class="chips">
            <button class="chip mute-chip" :aria-label="$t(state.settings.muted ? 'settings.unmute' : 'settings.mute')" v-tooltip.bottom="$t(state.settings.muted ? 'settings.unmute' : 'settings.mute')" @click="toggleMute">
              <i class="pi" :class="state.settings.muted ? 'pi-volume-off' : 'pi-volume-up'" />
            </button>
            <span class="chip wx-chip" :style="{ '--c': wxLook.tint }" v-tooltip.bottom="wxTip" :aria-label="$t(`weather.${wxLook.key}.name`)">
              <GameIcon v-if="wxLook.icon" :name="wxLook.icon" :size="15" /><i v-else :class="wxLook.pi" />
            </span>
            <span class="chip" v-tooltip.bottom="help('top.hp', { out: HP_REGEN, fight: HP_REGEN_COMBAT })">
              <GameIcon name="glass-heart" :size="15" />
              <span class="mini-hp"><i :style="{ width: hpPct + '%' }" /></span>
              {{ Math.max(0, state.hp) }}/{{ G.maxHp() }}
            </span>
            <span class="chip" v-tooltip.bottom="help('top.combat')"><GameIcon name="crossed-swords" :size="15" />{{ G.combatLevel() }}</span>
            <span class="chip" v-tooltip.bottom="help('top.total')"><GameIcon name="star-medal" :size="15" />{{ G.totalLevel() }}</span>
            <router-link v-if="omenSign" to="/omens" class="chip omen-chip sign" v-tooltip.bottom="tip($t('omens.signTitle'), $t(G.omenSignHint()))"><GameIcon name="crystal-ball" :size="15" />…</router-link>
            <router-link v-else-if="ev && state.event" to="/omens" class="chip omen-chip" :style="{ '--c': RARITY_TINT[ev.rarity] }" v-tooltip.bottom="tip(ev.name, ev.desc)">
              <GameIcon :name="ev.icon" :size="15" />{{ ev.name }} · {{ fmtClock(state.event.t) }}
            </router-link>
            <router-link v-if="fest" to="/festival" class="chip fest-chip" :style="{ '--c': fest.tint }" v-tooltip.bottom="tip(fest.name, fest.desc, [{ text: $t('help.top.festTokens', { n: fmt(G.festivalState().tokens) }), kind: 'gold' }])"><GameIcon :name="fest.icon" :size="15" />{{ fmt(G.festivalState().tokens) }}</router-link>
            <router-link v-if="pal" to="/pets" class="chip pal-chip" :class="{ alert: pal.alert }" :style="{ '--c': pal.tint }" v-tooltip.bottom="pal.tip" :aria-label="pal.tip">
              <GameIcon :name="pal.icon" :size="15" />
              <span v-if="!pal.egg" class="pal-meter" :class="{ low: pal.full < 25 }"><i :style="{ width: pal.full + '%' }" /></span>
              <b v-if="pal.gifts" class="pal-gifts">{{ pal.gifts }}</b>
            </router-link>
            <span class="chip gold" v-tooltip.bottom="help('top.gold')"><GameIcon name="two-coins" :size="15" />{{ fmt(state.gold) }}</span>
          </div>
          <button class="hero-chip" :aria-label="$t('heroMenu.label')" @click="menu.toggle($event)">
            <span class="hero-portrait">
              <ItemTile :icon="state.avatar" :tint="state.tint" size="sm" :tip="false" />
              <span v-if="unspent" class="hero-dot" />
            </span>
            <span class="hero-meta">
              <b>{{ titled(state.name, G.heroTitle()) }}</b>
              <span class="small muted">{{ $t('common.lvlShort', { n: G.heroLevel() }) }} · {{ ROLES[state.role].name }}</span>
              <span class="bar thin"><i :style="{ width: G.heroProgress() * 100 + '%' }" /></span>
            </span>
            <i class="pi pi-angle-down muted" />
          </button>
          <Menu ref="menu" :model="menuItems" popup />
        </header>

        <section class="view">
          <TutorialCoach />
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </transition>
          </router-view>
        </section>
      </main>
    </div>

    <ActivityDock />
    <BottomNav @menu="drawer = true" />

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

  <Dialog :visible="news && !off && !session.welcome" modal :header="$t('changelog.whatsNew')" style="width: min(560px, calc(100vw - 32px))" @update:visible="closeNews(false)">
    <div class="row news-head">
      <ItemTile :icon="latestUpdate().icon" size="md" :tip="false" />
      <div class="grow">
        <b class="news-title">{{ $t(`changelog.entries.${latestUpdate().id}.title`) }}</b>
        <div class="small muted">{{ latestUpdate().version ? $t('changelog.beta', { v: latestUpdate().version.split('beta.')[1] }) : $t('changelog.live') }}</div>
      </div>
    </div>
    <UpdateNotes :entry="latestUpdate()" />
    <template #footer>
      <Button :label="$t('changelog.seeAll')" icon="pi pi-list" severity="secondary" text @click="closeNews(true)" />
      <Button :label="$t('changelog.gotIt')" icon="pi pi-check" @click="closeNews(false)" />
    </template>
  </Dialog>

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


  <Dialog :visible="session.inGame && session.welcome" modal :header="$t('welcome.title', { name: state.name })" style="width: min(540px, calc(100vw - 32px))" @update:visible="session.welcome = false">
    <div class="row" style="margin-bottom:14px">
      <ItemTile :icon="state.avatar" :tint="state.tint" size="lg" :tip="false" />
      <div>
        <b>{{ ROLES[state.role].name }}</b> · <span class="hue" :style="{ '--hue': DIFFICULTIES[state.difficulty].color }">{{ DIFFICULTIES[state.difficulty].name }}</span>
        <div class="small muted">{{ ROLES[state.role].desc }}</div>
      </div>
    </div>
    <ul class="muted" style="padding-inline-start:18px;line-height:1.7;margin:0">
      <li v-for="i in 6" :key="i" v-html="$t(`welcome.tips.${i - 1}`)" />
    </ul>
    <p v-if="!state.tutorial.done" class="welcome-guide"><GameIcon name="treasure-map" :size="20" /><span v-html="$t('welcome.tutorial')" /></p>
    <template #footer><Button :label="$t('welcome.start')" icon="pi pi-arrow-right" iconPos="right" @click="startAdventure" /></template>
  </Dialog>
</template>

<style>
.nav-drawer { width: min(300px, 86vw) !important; }
.nav-drawer .p-drawer-footer { padding: 0 12px 12px; }
.welcome-guide { display: flex; align-items: center; gap: 10px; margin: 16px 0 0; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, var(--gold) 10%, transparent); border: 1px solid var(--line-hi); }
.welcome-guide .gi { color: var(--gold); flex-shrink: 0; }
.nav-drawer .p-drawer-title { font-family: var(--font-display); font-weight: 400; color: var(--gold); }
.omen-chip { --c: #b38cff; color: var(--ink); text-decoration: none; border-color: color-mix(in srgb, var(--c) 55%, transparent) !important; animation: evGlow 2.2s infinite; }
.omen-chip .gi { color: var(--c); }
.omen-chip.sign { color: var(--muted); letter-spacing: 0.2em; }
.fest-chip { color: var(--ink); text-decoration: none; border-color: color-mix(in srgb, var(--c) 55%, transparent) !important; }
.fest-chip .gi { color: var(--c); }
.screen-help { font-size: 14px; margin-inline-start: 8px; }
.news-head { gap: 14px; margin-bottom: 16px; }
.news-title { font-family: var(--font-display); font-size: 19px; letter-spacing: 0.03em; }
.wx-chip .gi, .wx-chip .pi { color: var(--c); }
.wx-chip .pi { font-size: 14px; }
.mute-chip { cursor: pointer; font: inherit; color: var(--muted); }
.mute-chip:hover { color: var(--ink); }
.pal-chip { color: var(--ink); text-decoration: none; border-color: color-mix(in srgb, var(--c) 45%, transparent) !important; }
.pal-chip .gi { color: var(--c); }
.pal-chip.alert { animation: palNudge 2.4s ease-in-out infinite; }
.pal-meter { width: 30px; height: 6px; border-radius: 4px; background: var(--tint-2); overflow: hidden; }
.pal-meter i { display: block; height: 100%; background: var(--ok); border-radius: inherit; transition: width 0.4s; }
.pal-meter.low i { background: var(--warn); }
.pal-gifts { min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--gold); color: #1a1408; font-size: 10.5px; display: grid; place-items: center; }
@keyframes palNudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); box-shadow: 0 0 14px -4px var(--c); } }
@media (prefers-reduced-motion: reduce) { .pal-chip.alert { animation: none; } }
@keyframes evGlow { 50% { box-shadow: 0 0 14px -2px color-mix(in srgb, var(--c) 70%, transparent); } }
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
