/*
  What bosses say in the arena: a line when the fight begins, one for each phase and one when they
  fall. The texts live in the locales under `bossLines.<boss>.<kind>`. Echoes speak as the boss they
  echo. A boss of the story speaks with its character's voice (data/journal.js); the Great Naga
  speaks with Morwen's, as the story tells.
*/
export const BOSS_LINE_KINDS = ['intro', 'enraged', 'desperate', 'defeat']

export const BOSS_VOICES = {
  goblin_king: 'goblin',
  warren_chief: 'goblin',
  troll_lord: 'troll',
  skeleton_king: 'skeleton',
  kraken: 'kraken',
  necromancer: 'necromancer',
  naga: 'morwen',
  winter_queen: 'winter',
  bronze_wyrm: 'wyrm',
  ancient_dragon: 'ancient',
  void_emperor: 'king',
  rift_warden: 'warden',
  aether_sovereign: 'firstKing',
}

// A boss says each of its lines at most this often, so a boss fought all afternoon is not a chatterbox
export const BOSS_LINE_COOLDOWN = 10 * 60e3
