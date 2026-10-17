/* =========================================================
   TRIALS — a rule chosen for the next life when ascending. A life lived under it until the hero can
   ascend again completes the trial: more shards that time, and a lasting bonus of its own.
   ========================================================= */

// reward: lasting mods for completing the trial once (same keys as everything else, see engine `mod`)
export const TRIALS = [
  { id: 'fasting', icon: 'fishbone', color: '#e0a03a', reward: { heal: 0.15, maxHp: 3 } },
  { id: 'arcane', icon: 'wizard-staff', color: '#4d96ff', reward: { magicDmg: 0.05, magicAcc: 0.05 } },
  { id: 'selfmade', icon: 'anvil-impact', color: '#e07a5f', reward: { gold: 0.06 } },
  { id: 'frail', icon: 'glass-heart', color: '#d62839', reward: { defense: 0.05 } },
]
export const TRIAL_MAP = Object.fromEntries(TRIALS.map(t => [t.id, t]))
// Shards for the ascension that completes a trial
export const TRIAL_SHARDS = 1.5
// A frail life has this share of the usual health
export const FRAIL_HP = 0.5
