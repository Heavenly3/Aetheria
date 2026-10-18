import { reactive } from 'vue'
import { G, state } from './engine.js'
import { BACKUP_EVERY } from './backup.js'

const CATCHUP = 5        // a gap longer than this (seconds) is simulated in one go, e.g. after a sleeping tab
const SUMMARY_MIN = 60   // show the "welcome back" summary after this many seconds away

// Session state: title screen or a game in progress
// catching: how far the offline progress being worked out has got (0 to 1), or null
export const session = reactive({ inGame: false, offline: null, welcome: false, catching: null })

let timers = []
let listenersBound = false
const saveNow = () => { if (session.inGame) G.save() }
// A copy in the backup store too, when leaving or hiding the game
const backupNow = () => { if (session.inGame) G.backupNow() }

let catching = false
async function catchUp(seconds) {
  const hadActivity = !!state.activity || G.farmBusy() || G.workersBusy()
  catching = true
  try {
    const sum = await G.simulateAsync(seconds, p => { session.catching = p })
    if (hadActivity && seconds >= SUMMARY_MIN && state.settings.offlineSummary !== false) session.offline = sum
    G.save()
  } finally {
    catching = false
    session.catching = null
  }
}

function startLoop() {
  stopLoop()
  let last = performance.now()
  timers.push(setInterval(() => {
    const now = performance.now()
    if (catching) { last = now; return }
    const dt = (now - last) / 1000
    last = now
    // A long gap (a sleeping tab) is worked out like time away; the loop waits for it
    if (dt > CATCHUP) catchUp(dt).finally(() => { last = performance.now() })
    else G.update(dt)
  }, 100))
  timers.push(setInterval(() => { if (catching) return; G.checkAchievements(); G.checkJournal(); G.ensureContracts(); G.ensurePatrons(); G.tickRealm(); G.runRoutines(); G.checkUnlocks(); G.tickRecords() }, 2000))
  timers.push(setInterval(() => { if (!document.hidden) G.maybeEvent() }, 60_000))
  timers.push(setInterval(() => G.snapshot(), 300_000))
  G.snapshot()
  timers.push(setInterval(saveNow, 10_000))
  timers.push(setInterval(backupNow, BACKUP_EVERY))
  backupNow()
  // After twenty minutes of play, maybe remind the player to keep a copy outside the browser
  timers.push(setTimeout(() => { if (G.backupReminderDue()) { state.settings.remindedAt = Date.now(); G.emit('backupReminder') } }, 20 * 60e3))
  if (!listenersBound) {
    document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); backupNow() } })
    window.addEventListener('beforeunload', saveNow)
    listenersBound = true
  }
}
function stopLoop() { timers.forEach(clearInterval); timers = [] }

// Load an existing slot, apply offline progress and start the loop
export async function continueGame(slot) {
  if (catching || !G.loadSlot(slot)) return false
  const away = (Date.now() - state.lastTick) / 1000
  if (away > CATCHUP) await catchUp(away)
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
  G.backupNow()
  stopLoop()
  session.inGame = false
  session.offline = null
  G.slot = null
}
