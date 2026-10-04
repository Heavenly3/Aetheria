<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { G } from '../game/engine.js'
import { continueGame, startNewGame } from '../game/loop.js'
import { ROLES, DIFFICULTIES } from '../game/data/character.js'
import { SKILLS } from '../game/data/skills.js'
import { fmt, fmtTime } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import CharacterCreation from './CharacterCreation.vue'
import LanguageSelect from './LanguageSelect.vue'

const { t } = useI18n()
const confirm = useConfirm()
const mode = ref('menu') // menu | load | new | create
const slots = ref(G.listSlots())
const last = ref(G.lastSlot())
const createSlot = ref(null)
const refresh = () => { slots.value = G.listSlots(); last.value = G.lastSlot() }
const lastInfo = computed(() => (last.value !== null ? slots.value[last.value] : null))
const hasAny = computed(() => slots.value.some(Boolean))

// Decorative embers with fixed positions
const embers = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100, delay: (i * 0.73) % 9, dur: 9 + ((i * 1.7) % 7), size: 2 + (i % 3),
}))

const ago = ts => {
  if (!ts) return ''
  const s = (Date.now() - ts) / 1000
  return s < 60 ? t('title.justNow') : t('title.ago', { time: fmtTime(s) })
}
const activityLabel = a => (!a ? '' : a.skill ? SKILLS[a.skill]?.name : t('nav.combat'))

function pickSlot(i) {
  const s = slots.value[i]
  if (mode.value === 'load') { if (s) continueGame(i); return }
  if (!s) { createSlot.value = i; mode.value = 'create'; return }
  confirm.require({
    header: t('title.overwriteTitle'),
    message: t('title.overwriteMessage', { n: i + 1, name: s.name }),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('title.overwrite'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { createSlot.value = i; mode.value = 'create' },
  })
}
function removeSlot(i) {
  const s = slots.value[i]
  confirm.require({
    header: t('title.deleteTitle'),
    message: t('title.deleteMessage', { name: s.name, level: s.heroLevel }),
    icon: 'pi pi-trash',
    acceptLabel: t('common.delete'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { G.deleteSlot(i); refresh() },
  })
}
function newGame() {
  const empty = slots.value.findIndex(s => !s)
  if (empty >= 0 && !hasAny.value) { createSlot.value = empty; mode.value = 'create' }
  else mode.value = 'new'
}
function created(profile) { startNewGame(createSlot.value, profile) }
</script>

<template>
  <div class="title-screen">
    <div class="ts-bg" aria-hidden="true">
      <span v-for="(e, i) in embers" :key="i" class="ember"
        :style="{ left: e.left + '%', animationDelay: e.delay + 's', animationDuration: e.dur + 's', width: e.size + 'px', height: e.size + 'px' }" />
    </div>
    <div class="ts-lang"><LanguageSelect input-id="title-language" /></div>

    <CharacterCreation v-if="mode === 'create'" :slot="createSlot" @cancel="mode = hasAny ? 'new' : 'menu'" @create="created" />

    <div v-else class="ts-content">
      <div class="logo">
        <div class="logo-mark"><GameIcon name="crown" :size="40" /></div>
        <h1 class="logo-name">Aetheria</h1>
        <div class="logo-sub">{{ $t('app.tagline') }}</div>
      </div>

      <transition name="fade" mode="out-in">
        <div v-if="mode === 'menu'" key="menu" class="menu">
          <button v-if="lastInfo" class="ts-btn primary" @click="continueGame(last)">
            <span class="menu-label"><GameIcon name="play-button" :size="20" /> {{ $t('title.continue') }}</span>
            <span class="menu-meta">{{ lastInfo.name }} · {{ ROLES[lastInfo.role]?.name }} · {{ $t('common.lvlShort', { n: lastInfo.heroLevel }) }} · {{ ago(lastInfo.lastTick) }}</span>
          </button>
          <button class="ts-btn" :class="{ primary: !lastInfo }" @click="newGame">
            <span class="menu-label"><GameIcon name="quill-ink" :size="20" /> {{ $t('title.newGame') }}</span>
            <span class="menu-meta">{{ $t('title.newGameHint') }}</span>
          </button>
          <button class="ts-btn" :disabled="!hasAny" @click="mode = 'load'">
            <span class="menu-label"><GameIcon name="locked-chest" :size="20" /> {{ $t('title.load') }}</span>
            <span class="menu-meta">{{ $t('title.slotsUsed', { n: slots.filter(Boolean).length, total: slots.length }) }}</span>
          </button>
          <p class="hint">{{ $t('title.autosaveHint') }}</p>
        </div>

        <div v-else key="slots" class="slots-wrap">
          <div class="row" style="margin-bottom:14px">
            <h2 class="slots-title grow">{{ mode === 'load' ? $t('title.load') : $t('title.chooseSlot') }}</h2>
            <Button :label="$t('common.back')" icon="pi pi-arrow-left" text @click="mode = 'menu'" />
          </div>
          <div class="slots">
            <div v-for="(s, i) in slots" :key="i" class="slot" :class="{ empty: !s, last: i === last }">
              <template v-if="s">
                <div class="row">
                  <ItemTile :icon="s.avatar" :tint="s.tint" size="lg" :tip="false" />
                  <div class="grow" style="min-width:0">
                    <div class="slot-name">{{ s.name }}</div>
                    <div class="small muted">{{ ROLES[s.role]?.name }} · {{ $t('title.heroLevel', { n: s.heroLevel }) }}</div>
                  </div>
                  <span class="slot-num">{{ i + 1 }}</span>
                </div>
                <div class="row wrap" style="gap:6px;margin-top:12px">
                  <span class="tag" :style="{ color: DIFFICULTIES[s.difficulty]?.color }">{{ DIFFICULTIES[s.difficulty]?.name }}</span>
                  <span class="tag">{{ $t('stats.totalLevel') }} {{ s.totalLevel }}</span>
                  <span class="tag gold">{{ fmt(s.gold) }} {{ $t('common.gold') }}</span>
                </div>
                <div class="small faint" style="margin-top:10px">{{ $t('title.played', { time: fmtTime(s.playTime) }) }} · {{ $t('title.saved', { when: ago(s.lastTick) }) }}<span v-if="s.activity"> · {{ activityLabel(s.activity) }}</span></div>
                <div class="row" style="margin-top:14px">
                  <Button class="grow" :label="mode === 'load' ? $t('title.loadOne') : $t('title.overwrite')" :icon="mode === 'load' ? 'pi pi-play' : 'pi pi-refresh'"
                    :severity="mode === 'load' ? undefined : 'secondary'" @click="pickSlot(i)" />
                  <Button icon="pi pi-trash" severity="danger" text :aria-label="$t('title.deleteTitle')" v-tooltip.top="$t('common.delete')" @click="removeSlot(i)" />
                </div>
              </template>
              <button v-else class="slot-empty" :disabled="mode === 'load'" @click="pickSlot(i)">
                <span class="slot-num">{{ i + 1 }}</span>
                <GameIcon name="quill-ink" :size="30" />
                <b>{{ mode === 'load' ? $t('title.emptySlot') : $t('title.createCharacter') }}</b>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
    <div class="ts-foot">{{ $t('title.footer') }}</div>
  </div>
</template>

<style scoped>
.title-screen { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 16px 60px; overflow: hidden; }
.ts-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 38%, rgba(226, 182, 90, 0.14), transparent 70%), radial-gradient(ellipse 90% 60% at 50% 110%, rgba(224, 85, 75, 0.12), transparent 70%); }
.ts-lang { position: absolute; top: 16px; inset-inline-end: 16px; z-index: 2; }
.ember { position: absolute; bottom: -10px; border-radius: 50%; background: #ffcf7a; box-shadow: 0 0 8px 2px rgba(255, 170, 70, 0.7); opacity: 0; animation: rise linear infinite; }
@keyframes rise { 0% { transform: translate(0, 0); opacity: 0; } 10% { opacity: 0.9; } 100% { transform: translate(40px, -105vh); opacity: 0; } }
.ts-content { position: relative; z-index: 1; width: 100%; max-width: 980px; display: flex; flex-direction: column; align-items: center; gap: 34px; }
.logo { text-align: center; animation: logoIn 1s cubic-bezier(0.2, 0.9, 0.3, 1) both; }
@keyframes logoIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } }
.logo-mark { width: 76px; height: 76px; margin: 0 auto 14px; border-radius: 22px; display: grid; place-items: center; color: #1a1206; background: var(--gold-grad);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 0 60px -6px rgba(226, 182, 90, 0.7); }
.logo-name { margin: 0; font-family: 'Marcellus SC', Georgia, serif; font-weight: 400; font-size: clamp(52px, 10vw, 96px); letter-spacing: 0.12em; line-height: 1; direction: ltr;
  background: var(--gold-grad); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 6px 30px rgba(226, 182, 90, 0.35)); }
.logo-sub { margin-top: 10px; font-size: 14px; letter-spacing: 0.5em; text-transform: uppercase; color: var(--muted); }
.menu { width: min(440px, 100%); display: flex; flex-direction: column; gap: 12px; }
.ts-btn { display: flex; flex-direction: column; gap: 3px; padding: 16px 20px; border-radius: 16px; text-align: start; cursor: pointer; color: var(--ink); font: inherit;
  background: var(--panel); border: 1px solid var(--line); backdrop-filter: blur(14px); transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
.ts-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--line-hi); box-shadow: 0 16px 40px -18px rgba(226, 182, 90, 0.6); }
.ts-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ts-btn.primary { background: linear-gradient(135deg, rgba(226, 182, 90, 0.2), rgba(24, 22, 37, 0.85)); border-color: rgba(226, 182, 90, 0.45); }
.menu-label { display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: 20px; letter-spacing: 0.04em; }
.menu-label .gi { color: var(--gold); }
.menu-meta { font-size: 13.5px; color: var(--muted); padding-inline-start: 30px; }
.hint { text-align: center; font-size: 13px; color: var(--faint); margin: 6px 0 0; }
.slots-wrap { width: 100%; }
.slots-title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 24px; }
.slots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.slot { position: relative; padding: 18px; border-radius: 18px; background: var(--panel); border: 1px solid var(--line); backdrop-filter: blur(14px); min-height: 200px; }
.slot.last { border-color: rgba(226, 182, 90, 0.4); }
.slot.empty { padding: 0; border-style: dashed; }
.slot-name { font-family: var(--font-display); font-size: 21px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slot-num { font-family: var(--font-display); font-size: 28px; color: var(--faint); }
.slot-empty { width: 100%; height: 100%; min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; position: relative;
  border: 0; background: none; color: var(--muted); font: inherit; cursor: pointer; border-radius: 18px; transition: background 0.2s, color 0.2s; }
.slot-empty .slot-num { position: absolute; top: 14px; inset-inline-start: 18px; }
.slot-empty:hover:not(:disabled) { background: rgba(226, 182, 90, 0.06); color: var(--gold-hi); }
.slot-empty:disabled { cursor: default; opacity: 0.6; }
.ts-foot { position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 12px; color: var(--faint); z-index: 1; padding: 0 16px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(6px); }
@media (max-width: 700px) { .slots { grid-template-columns: 1fr; } }
</style>
