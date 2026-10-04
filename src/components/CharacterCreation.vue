<script setup>
import { ref, computed } from 'vue'
import Stepper from 'primevue/stepper'
import StepList from 'primevue/steplist'
import Step from 'primevue/step'
import StepPanels from 'primevue/steppanels'
import StepPanel from 'primevue/steppanel'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { ROLES, DIFFICULTIES, AVATARS, TINTS, ATTRIBUTES } from '../game/data/character.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

const escape = v => v.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const props = defineProps({ slot: Number })
const emit = defineEmits(['cancel', 'create'])

const NAMES = ['Lyra', 'Aldric', 'Seren', 'Kael', 'Mira', 'Thorne', 'Elowen', 'Darian', 'Isolde', 'Rowan', 'Vesper', 'Bran']
const name = ref('')
const avatar = ref(AVATARS[0])
const tint = ref(TINTS[0])
const role = ref('warrior')
const difficulty = ref('normal')
const step = ref('1')

const r = computed(() => ROLES[role.value])
const d = computed(() => DIFFICULTIES[difficulty.value])
const validName = computed(() => name.value.trim().length >= 2)
const maxAttr = 8
const randomName = () => (name.value = NAMES[Math.floor(Math.random() * NAMES.length)])
const touched = ref(false)
// Suggest the role's portrait and colour until the player picks their own
function pickRole(k) {
  role.value = k
  if (touched.value) return
  if (AVATARS.includes(ROLES[k].icon)) avatar.value = ROLES[k].icon
  tint.value = ROLES[k].color
}
function create() {
  emit('create', { name: name.value.trim().slice(0, 20), avatar: avatar.value, tint: tint.value, role: role.value, difficulty: difficulty.value })
}
</script>

<template>
  <div class="creator">
    <div class="row" style="margin-bottom:18px">
      <div class="grow">
        <h1 class="cc-title">{{ $t('creation.title') }}</h1>
        <div class="muted small">{{ $t('creation.slot', { n: slot + 1 }) }}</div>
      </div>
      <Button :label="$t('common.cancel')" icon="pi pi-times" text severity="secondary" @click="emit('cancel')" />
    </div>

    <div class="cc-layout">
      <Stepper v-model:value="step" linear class="cc-stepper">
        <StepList>
          <Step value="1">{{ $t('creation.steps.identity') }}</Step>
          <Step value="2">{{ $t('creation.steps.role') }}</Step>
          <Step value="3">{{ $t('creation.steps.difficulty') }}</Step>
          <Step value="4">{{ $t('creation.steps.confirm') }}</Step>
        </StepList>
        <StepPanels>
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="stack">
              <label for="cc-name" class="small muted">{{ $t('creation.name') }}</label>
              <div class="row">
                <InputText id="cc-name" v-model="name" maxlength="20" :placeholder="$t('creation.namePlaceholder')" class="grow" autofocus @keyup.enter="validName && activateCallback('2')" />
                <Button icon="pi pi-sync" severity="secondary" outlined :aria-label="$t('creation.randomName')" v-tooltip.top="$t('creation.randomName')" @click="randomName" />
              </div>
              <div class="small muted" style="margin-top:8px">{{ $t('creation.portrait') }}</div>
              <div class="avatars">
                <button v-for="a in AVATARS" :key="a" class="av" :class="{ on: avatar === a }" :aria-label="a" @click="avatar = a; touched = true">
                  <ItemTile :icon="a" :tint="tint" size="md" :tip="false" />
                </button>
              </div>
              <div class="small muted" style="margin-top:8px">{{ $t('creation.colour') }}</div>
              <div class="row wrap">
                <button v-for="c in TINTS" :key="c" class="swatch" :class="{ on: tint === c }" :style="{ background: c }" :aria-label="c" @click="tint = c; touched = true" />
              </div>
            </div>
            <div class="cc-nav"><span /><Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" :disabled="!validName" @click="activateCallback('2')" /></div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="2">
            <div class="roles">
              <button v-for="(ro, k) in ROLES" :key="k" class="role" :class="{ on: role === k }" :style="{ '--c': ro.color }" @click="pickRole(k)">
                <ItemTile :icon="ro.icon" :tint="ro.color" size="md" :tip="false" />
                <div class="grow">
                  <b>{{ ro.name }}</b>
                  <div class="small muted">{{ ro.desc }}</div>
                </div>
              </button>
            </div>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('1')" />
              <Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('3')" />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="stack">
              <button v-for="(df, k) in DIFFICULTIES" :key="k" class="role" :class="{ on: difficulty === k }" :style="{ '--c': df.color }" @click="difficulty = k">
                <ItemTile :icon="df.icon" :tint="df.color" size="md" :tip="false" />
                <div class="grow">
                  <div class="row"><b class="grow">{{ df.name }}</b><span v-if="k === 'normal'" class="tag gold">{{ $t('creation.recommended') }}</span></div>
                  <div class="small muted">{{ df.desc }}</div>
                  <div class="row wrap" style="gap:6px;margin-top:6px">
                    <span class="tag">{{ $t('creation.mult.xp', { v: df.xp }) }}</span>
                    <span class="tag">{{ $t('creation.mult.monster', { v: df.monster }) }}</span>
                    <span class="tag">{{ $t('creation.mult.gold', { v: df.gold }) }}</span>
                    <span class="tag">{{ $t('creation.mult.offline', { v: df.offline }) }}</span>
                  </div>
                </div>
              </button>
            </div>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('2')" />
              <Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('4')" />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="4">
            <p style="margin-top:0" v-html="$t('creation.summary', { name: escape(name.trim()), role: r.name, difficulty: d.name, color: d.color })" />
            <p class="small muted">{{ $t('creation.note', { n: slot + 1 }) }}</p>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('3')" />
              <Button :label="$t('creation.begin')" icon="pi pi-play" @click="create" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>

      <aside class="preview panel pad" :style="{ '--c': r.color }">
        <div class="pv-portrait"><ItemTile :icon="avatar" :tint="tint" size="xl" :tip="false" /></div>
        <div class="pv-name">{{ name.trim() || $t('creation.unnamed') }}</div>
        <div class="row" style="justify-content:center;gap:6px;margin-bottom:16px">
          <span class="tag" :style="{ color: r.color }"><GameIcon :name="r.icon" :size="13" /> {{ r.name }}</span>
          <span class="tag" :style="{ color: d.color }">{{ d.name }}</span>
        </div>
        <div v-for="(a, k) in ATTRIBUTES" :key="k" class="attr-row">
          <GameIcon :name="a.icon" :size="15" :style="{ color: a.color }" />
          <span class="attr-short">{{ a.short }}</span>
          <span class="bar thin grow" :style="{ '--c': a.color }"><i :style="{ width: (r.attrs[k] / maxAttr) * 100 + '%' }" /></span>
          <b class="tnum">{{ r.attrs[k] }}</b>
        </div>
        <div class="section-title" style="margin:18px 0 10px">{{ $t('creation.perks') }}</div>
        <ul class="perks"><li v-for="p in r.perks" :key="p">{{ p }}</li></ul>
        <div class="section-title" style="margin:18px 0 10px">{{ $t('creation.startsWith') }}</div>
        <div class="row wrap" style="gap:6px">
          <span v-for="(l, sk) in r.skills" :key="sk" class="tag">{{ SKILLS[sk].name }} {{ l }}</span>
        </div>
        <div class="row wrap" style="gap:6px;margin-top:8px">
          <span v-for="id in r.equip" :key="id"><ItemTile :item="id" size="sm" /></span>
          <span v-for="(q, id) in r.items" :key="id"><ItemTile :item="id" size="sm" :qty="q" /></span>
          <span v-for="id in ['bronze_pickaxe', 'bronze_axe', 'rod']" :key="id"><ItemTile :item="id" size="sm" /></span>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.creator { position: relative; z-index: 1; width: 100%; max-width: 1080px; }
.cc-title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 34px; background: var(--gold-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cc-layout { display: grid; grid-template-columns: 1fr 330px; gap: 18px; align-items: start; }
.cc-stepper { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; backdrop-filter: blur(14px); }
.cc-stepper :deep(.p-steppanels) { background: transparent; padding: 18px 2px 0; }
.cc-stepper :deep(.p-steppanel) { background: transparent; }
.cc-nav { display: flex; justify-content: space-between; margin-top: 22px; }
.avatars { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
.av { padding: 4px; border-radius: 14px; border: 2px solid transparent; background: none; cursor: pointer; display: grid; place-items: center; }
.av.on { border-color: var(--gold); box-shadow: 0 0 18px -4px rgba(226, 182, 90, 0.6); }
.swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.15); cursor: pointer; }
.swatch.on { border-color: #fff; box-shadow: 0 0 0 3px rgba(226, 182, 90, 0.5); }
.roles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.role { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border-radius: 14px; text-align: start; color: var(--ink); font: inherit; cursor: pointer;
  background: rgba(255, 255, 255, 0.025); border: 1px solid var(--line); transition: all 0.18s; }
.role:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.role.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 10%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 40%, transparent); }
.role b { font-size: 16px; }
.preview { position: sticky; top: 20px; }
.pv-portrait { display: grid; place-items: center; margin-bottom: 10px; }
.pv-name { text-align: center; font-family: var(--font-display); font-size: 24px; margin-bottom: 8px; }
.attr-row { display: flex; align-items: center; gap: 8px; margin: 7px 0; font-size: 13px; }
.attr-short { width: 32px; color: var(--muted); font-weight: 700; }
.perks { margin: 0; padding-inline-start: 18px; color: var(--muted); font-size: 14px; line-height: 1.6; }
@media (max-width: 900px) { .cc-layout { grid-template-columns: 1fr; } .preview { position: static; } .roles { grid-template-columns: 1fr; } .avatars { grid-template-columns: repeat(4, 1fr); } }
</style>
