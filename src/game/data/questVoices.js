/*
  Who speaks for each quest: the voice of the person who gives it (see voices.js). People of the story
  keep the voice they have in the journal. Their thanks on hand-in live in the locales under
  `questThanks.<id>`.
*/
export const QUEST_VOICES = {
  first_steps: 'smith',
  cook_assistant: 'farmer',
  goblin_trouble: 'captain',
  lumberjack: 'farmer',
  smith_apprentice: 'smith',
  green_thumb: 'granny',
  wolf_hunt: 'huntress',
  arcane_studies: 'selene',
  thief_guild: 'shade',
  herbalist: 'druid',
  bone_collector: 'priest',
  undead_menace: 'captain',
  gemcutter: 'merchant',
  agile_explorer: 'youth',
  slayer_initiate: 'slayer',
  sea_terror: 'captain',
  tower_climber: 'slayer',
  dragon_threat: 'edmund',
  master_smith: 'smith',
  abyss_gates: 'selene',
  dragon_slayer: 'edmund',
  void_herald: 'selene',
  heavens_fall: 'oracle',
  guild_initiation: 'keeper',
  angler_tales: 'oldman',
  third_crop: 'farmer',
  full_house: 'keeper',
  the_fence: 'shade',
  superior_hunt: 'slayer',
  tower_guardians: 'oldman',
  master_craftsman: 'smith',
  deep_waters: 'oldman',
}

// How the tavern keeper greets a hero coming back, by how long they were away (hours)
export const WELCOME_AFTER = [[1, 'short'], [8, 'hours'], [30, 'day'], [24 * 4, 'days'], [Infinity, 'long']]
export const welcomeKind = seconds => WELCOME_AFTER.find(([h]) => seconds / 3600 < h)[1]
