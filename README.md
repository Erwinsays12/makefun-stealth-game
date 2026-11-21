# Lamplight — a thief in the night museum

[![Make the best stealth game](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/Erwinsays12/makefun-stealth-game/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/Erwinsays12/makefun-stealth-game/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

An original top-down stealth game that plays offline in a desktop browser from static files — no build step, no network request. Entry for the [best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759) on make.fun.

## The game

You are Wren, a thief slipping through the night museum. Pocket every treasure in each of the three wings, then reach the green exit — unseen.

- **Guards patrol with cones of sight.** Their cones are cut by walls, crates and bushes, so what you see is what they can see.
- **Detection gives you a chance.** A guard who half-sees you comes to look; one who sees you clearly gives chase. Break line of sight and they search, then give up.
- **Cover you can read at a glance.** Crates block sight, bushes hide you, lamplight exposes you, and running is loud enough to hear.
- **A pebble buys a way through.** Click (or press Q) to throw one and pull a guard off your route — three per wing.
- **Three wings, one quiet night.** The Marble Hall, the Gallery of Moths and the Vault Wing, each with its own patrols. Finish without ever being spotted for the Ghost rating.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Does |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak — slower, quieter, harder to spot |
| Click / Q | Throw a pebble to distract a guard |
| P | Pause |
| M | Mute |
| R | Restart the wing |
| Enter | Start / continue |

All sound is synthesized live with WebAudio — footsteps, the alarm sting, loot chimes and a low night drone. No audio files, no external assets.

## Layout

- `game/` — the game itself: `index.html` plus ES modules under `game/src/`
  - `config.js` — tuning: speeds, sight, hearing, detection
  - `levels.js` — the three wings, built from coordinates
  - `world.js` — the rules: the thief, guard AI, sight and hearing
  - `render.js` — the museum, the cones, the lamplight, the HUD
  - `audio.js` — synthesized sound, no files
  - `input.js` — keyboard and mouse
  - `shots.js` — the staged scenes behind `?shot=`
- `screenshots/` — four real renders of the game in a browser
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes the dossier
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
