/*
  Slayer: the hero picks one of three hunting tasks (easy, standard or hard). While on a task, a
  Superior version of the target can step up, dropping slayer sigils used to imbue slayer gear.
  Points buy permanent perks, blocked creatures and supplies.
*/
// size: kills asked · pick: slice of the hunting pool the target comes from (0 = weakest, 1 = strongest)
// pts / gold / xp: rewards on completion, as multipliers
export const TASK_KINDS = {
  easy:     { icon: 'run',            size: [10, 18], pick: [0, 0.5],     pts: 1,   gold: 1,   xp: 0.5 },
  standard: { icon: 'crossed-swords', size: [18, 32], pick: [0.25, 0.85], pts: 1.6, gold: 1.5, xp: 1 },
  hard:     { icon: 'death-skull',    size: [32, 55], pick: [0.6, 1],     pts: 2.8, gold: 2.5, xp: 2 },
}
export const TASK_KIND_IDS = Object.keys(TASK_KINDS)

export const SUPERIOR_CHANCE = 0.03 // per creature that steps up while it is the task
export const SIGILS = [1, 3] // slayer sigils a Superior drops
export const REROLL_COST = 5 // points to see three new offers
export const BLOCK_COST = 60
export const BLOCK_MAX = 5
export const STREAK_CHEST_EVERY = 25 // a gem chest every so many tasks in a row, and a starlight shard every other time

export const SLAYER_PERKS = [
  { id: 'extend',   icon: 'hourglass',      cost: 150 }, // tasks are 50% longer and pay 50% more points
  { id: 'bounty',   icon: 'two-coins',      cost: 180 }, // +50% gold from tasks
  { id: 'superior', icon: 'crowned-skull',  cost: 220 }, // Superiors twice as likely
  { id: 'insight',  icon: 'all-seeing-eye', cost: 260 }, // +15% Slayer XP
]
export const PERK_MAP = Object.fromEntries(SLAYER_PERKS.map(p => [p.id, p]))
// Helmets that strengthen the hero against the task, and by how much
export const TASK_HELMS = { slayer_helm: 0.15, slayer_helm_i: 0.25 }
