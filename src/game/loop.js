import { reactive } from 'vue'
import { G, state } from './engine.js'

const CATCHUP = 5        // a gap longer than this (seconds) is simulated in one go, e.g. after a sleeping tab
const SUMMARY_MIN = 60   // show the "welcome back" summary after this many seconds away

// Session state: title screen or a game in progress
export const session = reactive({ inGame: false, offline: null, welcome: false })

let timers = []
let listenersBound = false
const saveNow = () => { if (session.inGame) G.save() }

function catchUp(seconds) {
  const hadActivity = !!state.activity || G.farmBusy() || G.workersBusy()
  const sum = G.simulate(seconds)
  if (hadActivity && seconds >= SUMMARY_MIN) session.offline = sum
  G.save()
}

function startLoop() {
  stopLoop()
  let last = performance.now()
  timers.push(setInterval(() => {
    const now = performance.now()
    const dt = (now - last) / 1000
    last = now
    if (dt > CATCHUP) catchUp(dt)
    else G.update(dt)
  }, 100))
  timers.push(setInterval(() => { G.checkAchievements(); G.checkJournal() }, 2000))
  timers.push(setInterval(() => { if (!document.hidden) G.maybeEvent() }, 60_000))
  timers.push(setInterval(() => G.snapshot(), 300_000))
  G.snapshot()
  timers.push(setInterval(saveNow, 10_000))
  if (!listenersBound) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow() })
    window.addEventListener('beforeunload', saveNow)
    listenersBound = true
  }
}
function stopLoop() { timers.forEach(clearInterval); timers = [] }

// Load an existing slot, apply offline progress and start the loop
export function continueGame(slot) {
  if (!G.loadSlot(slot)) return false
  const away = (Date.now() - state.lastTick) / 1000
  if (away > CATCHUP) catchUp(away)
  session.inGame = true
  startLoop()
  return true
}

export function startNewGame(slot, profile) {
  G.newGame(slot, profile)
  session.inGame = true
  session.welcome = true
  startLoop()
}

export function exitToTitle() {
  G.save()
  stopLoop()
  session.inGame = false
  session.offline = null
  G.slot = null
}
