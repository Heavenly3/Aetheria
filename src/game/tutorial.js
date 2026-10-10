import { G, state } from './engine.js'

/*
  Guided first steps for a new character, about ten minutes of play, then a short tour of the bigger systems.
  Each step has a goal (a screen to open or something to do) and the elements to highlight,
  matched by their data-tut attribute. Counting goals measure from where the step started,
  so a role that begins with items still has to do the work.
*/
const ores = () => G.qty('copper_ore') + G.qty('tin_ore')

export const TUTORIAL_REWARD = 250

export const STEPS = [
  { id: 'openMining', icon: 'mining', route: '/skill/mining', targets: ['nav:/skill/mining', 'nav:/skill/'] },
  { id: 'startMining', icon: 'ore', targets: ['action:copper_ore', 'action:tin_ore'],
    done: () => state.activity?.type === 'skill' && state.activity.skill === 'mining' },
  { id: 'gatherOre', icon: 'ore', goal: 10, base: ores, count: b => ores() - b },
  { id: 'openSmithing', icon: 'anvil', route: '/skill/smithing', targets: ['nav:/skill/smithing', 'nav:menu'] },
  { id: 'smeltBar', icon: 'metal-bar', goal: 1, targets: ['action:bronze_bar'], base: () => G.qty('bronze_bar'), count: b => G.qty('bronze_bar') - b },
  { id: 'openInventory', icon: 'knapsack', route: '/inventory', targets: ['nav:/inventory'] },
  { id: 'openCombat', icon: 'crossed-swords', route: '/combat', targets: ['nav:/combat'] },
  { id: 'startFight', icon: 'chicken', targets: ['monster:chicken', 'monster:goblin', 'monster:cow'], done: () => state.activity?.type === 'combat' },
  { id: 'winFights', icon: 'broken-skull', goal: 3, base: () => state.stats.kills, count: b => state.stats.kills - b },
  { id: 'openHero', icon: 'laurel-crown', route: '/', targets: ['nav:/'] },
  { id: 'openQuests', icon: 'scroll-unfurled', route: '/quests', targets: ['nav:/quests'] },
  { id: 'openTavern', icon: 'beer-horn', route: '/tavern', targets: ['nav:/tavern', 'nav:menu'] },
  { id: 'openJournal', icon: 'quill-ink', route: '/journal', targets: ['nav:/journal', 'nav:menu'] },
  // A short tour of the bigger systems; the reward waits at the end, but skipping is fine
  { id: 'openGuilds', icon: 'swords-emblem', route: '/guilds', targets: ['nav:/guilds', 'nav:menu'] },
  { id: 'openFarming', icon: 'sprout', route: '/skill/farming', targets: ['nav:/skill/farming', 'nav:/skill/'] },
  { id: 'openCompendium', icon: 'open-book', route: '/bestiary', targets: ['nav:/bestiary', 'nav:menu'] },
]

export const tutorialActive = () => !state.tutorial.done && STEPS[state.tutorial.step]
export const currentStep = () => (state.tutorial.done ? null : STEPS[state.tutorial.step] || null)

export function stepProgress(step = currentStep()) {
  if (!step?.goal) return null
  return Math.max(0, Math.min(step.goal, step.count(state.tutorial.base ?? 0)))
}

function enterStep(i) {
  state.tutorial.step = i
  state.tutorial.base = STEPS[i]?.base ? STEPS[i].base() : null
}

export function startTutorial() {
  state.tutorial.done = false
  enterStep(0)
}

function finish() {
  state.tutorial.done = true
  state.tutorial.base = null
  G.addGold(TUTORIAL_REWARD)
  G.toast('laurels-trophy', 'tutorial.finished', { gold: TUTORIAL_REWARD }, 'success')
}

export function skipTutorial() {
  state.tutorial.done = true
  state.tutorial.base = null
}

// Checks the current goal; returns true when a step was completed
export function checkTutorial(path) {
  const step = currentStep()
  if (!step) return false
  if (state.tutorial.base === null && step.base) state.tutorial.base = step.base()
  const ok = step.route ? path === step.route : step.goal ? stepProgress(step) >= step.goal : step.done()
  if (!ok) return false
  if (state.tutorial.step + 1 >= STEPS.length) finish()
  else enterStep(state.tutorial.step + 1)
  return true
}
