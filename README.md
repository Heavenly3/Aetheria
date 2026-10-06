# Aetheria

[![CI](https://github.com/Heavenly3/Aetheria/actions/workflows/ci.yml/badge.svg)](https://github.com/Heavenly3/Aetheria/actions/workflows/ci.yml)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

A fantasy idle RPG for the browser. Built with Vue 3, PrimeVue 4 and Vite.

**[▶ Play in your browser](https://heavenly3.github.io/Aetheria/)** or **[on itch.io](https://3vynia.itch.io/aetheria)**: no download needed. It can also be installed as an app (the install button in the address bar, or "Add to Home Screen" on mobile) and keeps working offline.

![Combat in Aetheria](docs/screenshots/combat.gif)

Available in **English** and **Spanish** (switch from the title screen or Settings).

## Screenshots

<table>
  <tr>
    <td><img src="docs/screenshots/title.png" alt="Title screen"></td>
    <td><img src="docs/screenshots/skill.png" alt="Smithing with filters and an action in progress"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/combat.png" alt="Fighting a red dragon"></td>
    <td><img src="docs/screenshots/tavern.png" alt="Tavern staff working in parallel"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/hero.png" alt="Hero overview with enchanted gear"></td>
    <td><img src="docs/screenshots/ascension.png" alt="Ascension upgrade tree"></td>
  </tr>
</table>

## Getting started

```bash
npm install
npm run dev            # dev server at http://localhost:5173
npm run build          # production build in dist/
npm test               # engine tests (Vitest)
npm run build:single   # one self-contained HTML file in dist-single/
npm run icons          # regenerate src/game/icons.json and validate icon names
npm run check:i18n     # make sure every language has every key
npm run balance        # XP/hour, gold/hour and combat estimates for every level
```

Requires Node.js 18 or newer.

## Features

- **Title screen** with Continue, New game and Load. Four save slots, each saved automatically every 10 seconds, when the tab is hidden and on close.
- **Character creation**: name, portrait and colour, one of 6 roles (Warrior, Ranger, Mage, Artisan, Rogue, Paladin) and one of 4 difficulties.
- **21 skills** across gathering, artisan, support and combat, with per-action mastery and prestige.
- **Hero level (1–100)** fed by 25% of all skill XP. Every level grants attribute points (STR, DEX, INT, VIT, WIS, LCK) and every 2 levels a talent point.
- **Tools**: tiered pickaxes, axes and fishing rods gate advanced resources.
- **Farming**: plots grow in real time, even offline, with optional auto-replant.
- **Combat**: 10 areas, 7 bosses with mercenaries, 6 multi-room dungeons, an endless tower, slayer tasks, prayers and loadouts.
- **Endgame beyond the Abyss**: the Void Rift and the Celestial Spire, aether gear forged at level 90 and boss-only uniques.
- **Pets**: 23 very rare companions from skilling, bosses, slayer tasks and dice. Every pet you own adds a small permanent bonus.
- **Enchanting**: raise each equipment slot from +1 to +10. Higher levels can fail and drop a level unless protected with a starlight shard.
- **Daily and weekly tasks** with a day streak that boosts rewards.
- **Equipment sets**: 13 sets (every metal, leather, dragonhide, wizard, slayer, dragonbane and the endgame regalia) with bonuses for 2, 3, 4 or 5 pieces worn.
- **Bestiary**: every creature you defeat is recorded. Learn its drops, master it for a combat bonus against it, and complete each area for a permanent reward.
- **Festivals**: four seasonal festivals a year (Harvest, Winter's Veil, Spring Bloom and Midsummer Fires) run on their real dates, with a passive bonus, festival tokens and a shop with an exclusive pet, title, portrait and colour.
- **Titles and appearance**: 20 titles shown next to the hero's name, plus extra portraits and colours unlocked by achievements and festivals.
- **Ascension**: start the whole hero over for Aether shards and spend them in a three-branch tree of permanent upgrades.
- **Tavern**: hire staff (11 specialities, 4 rarities, traits and levels) who work in parallel for a wage. Includes 1/4/8 h expeditions, daily orders, drinks, dice and a mystery chest.
- **Action queue** that moves on to the next task by itself, and **chained crafting**: when a recipe runs out, the game makes the missing materials first (mine, smelt, then forge) and goes back to it.
- **Guided tutorial** for new heroes: twelve short steps over the first ten minutes (mine, smelt, fight, meet the tavern), with the next button highlighted. It can be hidden, skipped or restarted from Settings.
- **Light and dark themes**, or follow the device setting.
- **Phone friendly**: a bottom navigation bar, larger touch targets and a layout that fits narrow screens.
- **Backup and transfer**: download the save as a file, load it again anywhere, or send yourself a transfer link that opens the hero on another device. No account or server involved.
- **Quality of life**: search and filters on every skill, item locking, bulk selling, a daily market, random events, charts, sound and browser notifications.
- **Offline progress** up to a cap that grows as you play.

## Project layout

- `src/game/data/`: all game content (skills, items, actions, monsters, quests, achievements, home, tavern). Balance and new content live here.
- `src/game/engine.js`: reactive state and core logic (XP, actions, combat, quests, prestige, offline simulation).
- `src/game/systems.js`: tavern, staff, expeditions, orders, queue, loadouts, prayers, market, events and history.
- `src/game/meta.js`: pets, gear enchanting and daily / weekly tasks.
- `src/game/ascension.js`: ascension (rebirth) and its upgrade tree.
- `src/game/collection.js`: equipment set bonuses, the bestiary, cosmetics and festivals.
- `src/game/loop.js`: game loop, offline progress and autosave.
- `src/game/tutorial.js`: the guided first steps.
- `src/game/transfer.js`: save files and transfer links (the save is deflated and base64url-encoded into the link).
- `src/i18n/`: vue-i18n setup and the `en` / `es` message files. Game data only stores ids; names are looked up at render time, so the journal and notifications follow the selected language.
- `src/components/` and `src/views/`: the UI.
- `public/`: app manifest, service worker (offline play) and icons.
- `scripts/`: icon extraction, the translation checker and the balance report.
- `tests/`: Vitest suites for levels, actions, chained crafting, combat, saves, save transfer, the tutorial, sets, the bestiary, festivals, cosmetics, pets, enchanting, daily tasks, ascension and translations.

## Adding a language

1. Copy `src/i18n/locales/en.js` to a new file (for example `fr.js`) and translate the values. Keep every `{placeholder}` as it is.
2. Register it in `LOCALES` and `messages` in `src/i18n/index.js`.
3. Run `npm run check:i18n`.

## Credits

- Icons from [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## License

[MIT](LICENSE)
