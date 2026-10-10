/*
  Fishing waters. Each one is a single fishing action: every cast lands one fish at random from its
  table (only fish the hero's level allows). Bait, the hero's mastery of the water and luck shift the
  odds towards its finer fish; the glowing lure also makes caskets likelier.
*/
// fish: raw fish id -> weight · rod: rod tier needed · scene: colours of the water in the fishing scene
export const WATERS = [
  { id: 'dawn_river',     icon: 'circling-fish', lvl: 1,  time: 3.2, rod: 1, tint: '#5fa8d3', scene: ['#6ab7d8', '#2f6f99'],
    fish: { raw_shrimp: 50, raw_sardine: 32, raw_trout: 14 } },
  { id: 'mirror_lake',    icon: 'double-fish',   lvl: 20, time: 4,   rod: 2, tint: '#4d9fb0', scene: ['#5fb3c2', '#1f5f72'],
    fish: { raw_sardine: 20, raw_trout: 42, raw_salmon: 30 } },
  { id: 'coral_coast',    icon: 'crab-claw',     lvl: 35, time: 4.8, rod: 3, tint: '#3fb6c6', scene: ['#4fd1d8', '#137a8f'],
    fish: { raw_salmon: 14, raw_tuna: 40, raw_lobster: 32, raw_swordfish: 12 } },
  { id: 'deep_sea',       icon: 'shark-fin',     lvl: 50, time: 6,   rod: 4, tint: '#2f6fdf', scene: ['#2f6fb0', '#0b2a55'],
    fish: { raw_lobster: 18, raw_swordfish: 42, raw_shark: 26, raw_anglerfish: 10 } },
  { id: 'abyssal_trench', icon: 'fish-monster',  lvl: 80, time: 7,   rod: 5, tint: '#5a3fbf', scene: ['#2a2a6a', '#07071f'],
    fish: { raw_shark: 46, raw_anglerfish: 40 } },
]
export const WATER_MAP = Object.fromEntries(WATERS.map(w => [w.id, w]))

// Baits: consumed one per cast while chosen. `power` shifts the odds towards finer fish; `casket` multiplies caskets
export const BAITS = {
  bait_worms: { power: 0.3 },
  feather_fly: { power: 0.6 },
  glow_lure: { power: 1, casket: 2 },
}
export const BAIT_IDS = Object.keys(BAITS)
export const MASTERY_LUCK = 1 / 250 // odds shift per mastery level of the water
