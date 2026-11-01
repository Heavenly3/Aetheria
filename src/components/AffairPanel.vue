<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { G, state } from '../game/engine.js'
import { AFFAIRS, AFFAIR_TRIES } from '../game/data/affairs.js'
import { TASK_TYPES } from '../game/data/guilds.js'
import { ITEMS } from '../game/data/items.js'
import { fmt, fmtTime } from '../game/format.js'
import { tm } from '../i18n/index.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import VoiceNote from './VoiceNote.vue'
import EnigmaDeduction from './EnigmaDeduction.vue'
import EnigmaCipher from './EnigmaCipher.vue'
import EnigmaBeam from './EnigmaBeam.vue'
import EnigmaAstrolabe from './EnigmaAstrolabe.vue'
import EnigmaBalance from './EnigmaBalance.vue'
import EnigmaEcho from './EnigmaEcho.vue'

// The guild affair in the hall: offered, followed up through its leads, and settled in its own window
const props = defineProps({ now: { type: Number, default: 0 } })
const { t } = useI18n()
const a = computed(() => (props.now, G.affair()))
const kind = computed(() => (a.value ? AFFAIRS[a.value.kind] : null))
const ENIGMAS = { deduction: EnigmaDeduction, cipher: EnigmaCipher, beam: EnigmaBeam, astrolabe: EnigmaAstrolabe, balance: EnigmaBalance, echo: EnigmaEcho }
// Whoever brings it speaks in a voice that suits their trade
const VOICE_OF = { warrior: 'captain', ranger: 'huntress', mage: 'selene', artisan: 'smith', rogue: 'shade', paladin: 'priest' }
const voice = computed(() => VOICE_OF[a.value?.giverRole] || 'keeper')
const names = computed(() => G.journalNames())

const leadText = l => (l.type === 'talk'
  ? t('affairs.leadTalk', { who: t(`journal.people.${l.who}.name`, names.value) })
  : tm({ key: `guilds.tasks.${l.type}`, params: { n: fmt(l.target), monster: '@monster:' + l.monster, skill: '@skill:' + l.skill, item: '@item:' + l.item } }))
const leadIcon = l => (l.type === 'deliver' ? ITEMS[l.item]?.icon : TASK_TYPES[l.type].icon)
const reward = computed(() => (props.now, G.affairRewardNow()))
const nextIn = computed(() => Math.max(0, (state.guilds.affairAt || 0) - props.now))
const triesLeft = computed(() => (a.value ? AFFAIR_TRIES[a.value.level] + (a.value.enigma.kind === 'echo' ? a.value.lives || 0 : 0) - a.value.tries : 0))
const counted = computed(() => a.value && !['beam', 'astrolabe'].includes(a.value.enigma.kind))
const wait = computed(() => (props.now, G.affairWait()))

function accept() { if (G.acceptAffair()) play('quest') }
function hint() { if (G.affairHint()) play('coin') }

const open = ref(false)
const note = ref('')
function answer(v) {
  const r = G.settleAffair(v)
  if (!r) return
  if (r === 'solved') {
    play('quest')
    open.value = false
  } else if (r === 'lost') {
    play('bad')
    open.value = false
    G.toast('cross-mark', 'affairs.lost', {}, 'warn')
  } else { play('bad'); note.value = t('affairs.wrong') }
}
// The reward is told when the affair is settled
let off
onMounted(() => { off = G.on('affairClosed', e => { if (e.solved && e.reward) G.toast(AFFAIRS[e.kind].icon, 'affairs.solved', { marks: e.reward.marks, rep: e.reward.rep, gold: fmt(e.reward.gold) }, 'rare') }) })
onUnmounted(() => off?.())
</script>

<template>
  <div v-if="a" class="panel pad affair" :class="a.status">
    <div class="row" style="align-items:flex-start">
      <ItemTile :icon="kind.icon" tint="#8a6a2a" size="md" :tip="false" />
      <div class="grow" style="min-width:0">
        <div class="small muted">{{ $t('affairs.title') }} · <span class="lvl" :class="'l' + a.level">{{ $t(`affairs.levels.l${a.level}`) }}</span></div>
        <div class="card-name">{{ $t(`affairs.kinds.${a.kind}.name`) }}</div>
        <div class="small muted">{{ $t('affairs.brings', { name: a.giver }) }}</div>
      </div>
    </div>
    <VoiceNote class="intro-line" :text="`“${$t(`affairs.kinds.${a.kind}.intro`)}”`" :voice="voice" :who="a.giver" />

    <!-- Offered -->
    <template v-if="a.status === 'offered'">
      <div v-if="reward" class="row wrap small reward">
        <span class="faint">{{ $t('affairs.rewardIf') }}</span>
        <span class="tag gold"><GameIcon name="star-medal" :size="12" /> {{ reward.marks }}</span>
        <span class="tag">+{{ reward.rep }} {{ $t('guilds.rep').toLowerCase() }}</span>
        <span class="tag"><GameIcon name="two-coins" :size="12" /> {{ fmt(reward.gold) }}</span>
      </div>
      <div class="row" style="gap:8px;margin-top:12px">
        <Button :label="$t('affairs.accept')" icon="pi pi-check" size="small" @click="accept" />
        <Button :label="$t('affairs.decline')" size="small" severity="secondary" outlined v-tooltip.top="$t('affairs.declineTip')" @click="G.declineAffair()" />
      </div>
    </template>

    <!-- Under way -->
    <template v-else>
      <div class="section-title" style="margin:14px 0 8px">{{ $t('affairs.leads') }}</div>
      <div class="stack" style="gap:8px">
        <div v-for="(l, i) in a.leads" :key="i" class="lead" :class="{ done: G.taskMet(l) }">
          <div class="row small" style="gap:8px">
            <ItemTile :icon="leadIcon(l)" size="xs" :tip="false" />
            <span class="grow">{{ leadText(l) }}</span>
            <i v-if="G.taskMet(l)" class="pi pi-check ok-text" />
            <b v-else class="tnum">{{ fmt(G.taskCur(l)) }}/{{ fmt(l.target) }}</b>
          </div>
          <div v-if="!G.taskMet(l)" class="bar thin" style="margin-top:5px"><i :style="{ width: (G.taskCur(l) / l.target) * 100 + '%' }" /></div>
        </div>
      </div>
      <p v-if="G.affairReady()" class="small ok-text" style="margin:12px 0 0"><i class="pi pi-search" /> {{ $t('affairs.ready') }}</p>
      <div class="row wrap" style="gap:8px;margin-top:12px">
        <Button :label="$t('affairs.settle')" icon="pi pi-key" size="small" :disabled="!G.affairReady()" @click="open = true; note = ''" />
        <Button :label="$t('affairs.hint', { name: a.giver })" icon="pi pi-question-circle" size="small" severity="secondary" outlined
          :disabled="!G.canHint() || !G.affairReady()" v-tooltip.top="$t('affairs.hintTip', { n: G.hintCost() })" @click="hint" />
        <span v-if="counted" class="small muted tnum">{{ $t('affairs.triesLeft', { n: triesLeft }) }}</span>
      </div>
      <div v-if="reward" class="row wrap small reward">
        <span class="faint">{{ $t('affairs.rewardIf') }}</span>
        <span class="tag gold"><GameIcon name="star-medal" :size="12" /> {{ reward.marks }}</span>
        <span class="tag">+{{ reward.rep }} {{ $t('guilds.rep').toLowerCase() }}</span>
        <span class="tag"><GameIcon name="two-coins" :size="12" /> {{ fmt(reward.gold) }}</span>
      </div>
    </template>

    <Dialog v-model:visible="open" modal :header="$t(`affairs.kinds.${a.kind}.name`)" style="width: min(760px, calc(100vw - 24px))">
      <p class="question">{{ $t(`affairs.kinds.${a.kind}.question`) }}</p>
      <div v-if="wait > 0" class="small bad-text" style="margin-bottom:10px"><i class="pi pi-hourglass" /> {{ $t('affairs.wait', { time: fmtTime(Math.ceil(wait / 1000)) }) }}</div>
      <component :is="ENIGMAS[a.enigma.kind]" :affair="a" :disabled="wait > 0" @answer="answer" />
      <div class="row wrap" style="gap:8px;margin-top:14px">
        <span v-if="note" class="small bad-text grow">{{ note }}</span>
        <span v-else class="grow" />
        <Button :label="$t('affairs.hint', { name: a.giver })" icon="pi pi-question-circle" size="small" severity="secondary" text
          :disabled="!G.canHint()" v-tooltip.top="$t('affairs.hintTip', { n: G.hintCost() })" @click="hint" />
        <span v-if="counted" class="small muted tnum">{{ $t('affairs.triesLeft', { n: triesLeft }) }}</span>
      </div>
    </Dialog>
  </div>
  <p v-else-if="G.myGuild() && nextIn > 0" class="small faint next-affair"><i class="pi pi-hourglass" /> {{ $t('affairs.next', { time: fmtTime(Math.ceil(nextIn / 1000)) }) }}</p>
</template>

<style scoped>
.affair { margin-top: 18px; border-color: color-mix(in srgb, var(--gold) 45%, var(--line)); background: linear-gradient(160deg, color-mix(in srgb, var(--gold) 7%, var(--panel)), var(--panel)); }
.intro-line { margin-top: 12px; font-style: italic; color: var(--ink-2); line-height: 1.5; }
.lvl { font-weight: 800; }
.lvl.l0 { color: var(--ok); }
.lvl.l1 { color: var(--gold); }
.lvl.l2 { color: var(--danger); }
.lead { padding: 8px 10px; border-radius: 10px; background: var(--tint-1); }
.lead.done { opacity: 0.8; }
.reward { gap: 6px; margin-top: 12px; align-items: center; }
.question { margin-top: 0; font-weight: 700; }
.next-affair { margin: 14px 0 0; }
</style>
