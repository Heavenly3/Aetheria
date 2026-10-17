/* =========================================================
   ECHOES — the world bosses come back stronger once the story has an ending. Each echo's first
   defeat is kept in the legacy (it survives ascension) and adds a lasting bonus.
   Mixed into G (engine.js); `this` is the engine. Tuning lives in data/echoes.js.
   ========================================================= */
import { ECHOES, ECHO_BONUS } from './data/echoes.js'

export const echoes = {
  // Echoes answer once the hero has chosen how the story ends, in this life or any before
  echoesOpen() { return Object.keys(this.s.legacy?.endings || {}).length > 0 },
  echoBeaten(bossId) { return !!this.s.legacy?.echoes?.[bossId] },
  echoesBeaten() { return ECHOES.filter(e => this.echoBeaten(e.echoOf)).length },
  echoMods(key) { return (ECHO_BONUS[key] || 0) * this.echoesBeaten() },
  // The first defeat of an echo is remembered for good
  echoDefeated(m) {
    const lg = this.s.legacy
    lg.echoes ||= {}
    if (lg.echoes[m.echoOf]) return
    lg.echoes[m.echoOf] = Date.now()
    this.log('trophy', 'log.echoFirst', { monster: '@monster:' + m.id })
    this.emit('echo', { id: m.id, beaten: this.echoesBeaten(), total: ECHOES.length })
  },
}
