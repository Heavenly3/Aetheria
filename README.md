# Aetheria

A fantasy idle RPG for the browser, inspired by [Idle Fantasy](https://github.com/tristinbaker/IdleFantasy). Built with Vue 3, PrimeVue 4 and Vite.

Available in **English** and **Spanish** (switch from the title screen or Settings).

## Getting started

```bash
npm install
npm run dev            # dev server at http://localhost:5173
npm run build          # production build in dist/
npm run build:single   # one self-contained HTML file in dist-single/
npm run icons          # regenerate src/game/icons.json and validate icon names
npm run check:i18n     # make sure every language has every key
```

Requires Node.js 18 or newer.

## Features

- **Title screen** with Continue, New game and Load. Four save slots, each saved automatically every 10 seconds, when the tab is hidden and on close.
- **Character creation**: name, portrait and colour, one of 6 roles (Warrior, Ranger, Mage, Artisan, Rogue, Paladin) and one of 4 difficulties.
- **21 skills** across gathering, artisan, support and combat, with per-action mastery and prestige.
- **Hero level (1–100)** fed by 25% of all skill XP. Every level grants attribute points (STR, DEX, INT, VIT, WIS, LCK) and every 2 levels a talent point.
- **Tools**: tiered pickaxes, axes and fishing rods gate advanced resources.
- **Farming**: plots grow in real time, even offline, with optional auto-replant.
- **Combat**: 8 areas, 5 bosses with mercenaries, 5 multi-room dungeons, an endless tower, slayer tasks, prayers and loadouts.
- **Tavern**: hire staff (11 specialities, 4 rarities, traits and levels) who work in parallel for a wage. Includes 1/4/8 h expeditions, daily orders, drinks, dice and a mystery chest.
- **Action queue** that moves on to the next task by itself.
- **Quality of life**: search and filters on every skill, item locking, bulk selling, a daily market, random events, charts, sound and browser notifications.
- **Offline progress** up to a cap that grows as you play.

## Project layout

- `src/game/data/`: all game content (skills, items, actions, monsters, quests, achievements, home, tavern). Balance and new content live here.
- `src/game/engine.js`: reactive state and core logic (XP, actions, combat, quests, prestige, offline simulation).
- `src/game/systems.js`: tavern, staff, expeditions, orders, queue, loadouts, prayers, market, events and history.
- `src/game/loop.js`: game loop, offline progress and autosave.
- `src/i18n/`: vue-i18n setup and the `en` / `es` message files. Game data only stores ids; names are looked up at render time, so the journal and notifications follow the selected language.
- `src/components/` and `src/views/`: the UI.
- `scripts/`: icon extraction and the translation checker.

## Adding a language

1. Copy `src/i18n/locales/en.js` to a new file (for example `fr.js`) and translate the values. Keep every `{placeholder}` as it is.
2. Register it in `LOCALES` and `messages` in `src/i18n/index.js`.
3. Run `npm run check:i18n`.

## Credits

- Icons from [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Inspired by [Idle Fantasy](https://github.com/tristinbaker/IdleFantasy) by Tristin Baker.

## License

[MIT](LICENSE)
