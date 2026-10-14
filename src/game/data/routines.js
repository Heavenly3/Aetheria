/*
  Routines: rules the hero follows while the game is open, of the form "when this happens, do that".
  A condition (`when`) is checked every couple of seconds; when it holds, its action (`then`) runs.
  - Actions that change what the hero is doing (a skill, a fight, an omen hunt, stopping) only start
    when nothing is going on, unless the rule may interrupt. Rules are tried top to bottom, and the
    first one that changes the activity wins that moment.
  - Quick actions (serving patrons, harvesting, selling…) just happen, with a short wait before the
    same rule can fire again.
  Each condition and action lists the parameters it takes, which the routines screen asks for.
*/
export const MAX_RULES = 12
export const QUICK_WAIT = 20e3 // ms before a quick action can fire again
export const MANUAL_PAUSE = 3 * 60e3 // after the player picks something by hand, interrupting rules wait this long
export const LOG_SIZE = 10

// params: what each one needs (item, n, pct, weather, skill+action, monster, kind)
export const CONDITIONS = {
  always: { icon: 'sparkles', params: [] },
  idle: { icon: 'hourglass', params: [] },
  itemBelow: { icon: 'knapsack', params: ['item', 'n'] },
  itemAtLeast: { icon: 'knapsack', params: ['item', 'n'] },
  weather: { icon: 'sun', params: ['weather'] },
  night: { icon: 'night-sleep', params: [] },
  day: { icon: 'sun', params: [] },
  omen: { icon: 'crystal-ball', params: [] },
  patrons: { icon: 'beer-horn', params: ['n'] },
  farmReady: { icon: 'wheat', params: [] },
  noSlayerTask: { icon: 'death-skull', params: [] },
  festival: { icon: 'laurel-crown', params: [] },
}
// activity: whether it changes what the hero is doing
export const ACTIONS_LIST = {
  skill: { icon: 'gears', activity: true, params: ['skill', 'action'] },
  fight: { icon: 'crossed-swords', activity: true, params: ['monster'] },
  huntOmen: { icon: 'crystal-ball', activity: true, params: [] },
  stop: { icon: 'hourglass', activity: true, params: [] },
  serve: { icon: 'beer-horn', params: [] },
  harvest: { icon: 'wheat', params: [] },
  collectYard: { icon: 'farmer', params: [] },
  sell: { icon: 'two-coins', params: ['item', 'n'] },
  sellJunk: { icon: 'fishbone', params: [] },
  slayerTask: { icon: 'death-skull', params: ['kind'] },
}
export const SLAYER_KINDS = ['easy', 'standard', 'hard']

// Ready-made rules; `make` fills in what suits the hero right now
export const TEMPLATES = ['cookWhenLow', 'fishInRain', 'mineWhenIdle', 'servePatrons', 'huntOmens', 'slayerTask', 'collectYard', 'sellJunk']
