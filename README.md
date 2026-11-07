# Oddwater — a slightly impossible aquarium

A 3D freshwater aquarium game built directly on **StarHermit Engine 1.38.0**. Keep a planted community tank thriving and spend the Wonder it earns on fish, plants and three small impossibilities.

## The aquarium

Start with eight neon tetras, six harlequin rasboras, four peppered corys and one pearl gourami in a planted 180 L community tank. Fish school with their own species, avoid one another and the tank boundaries, forage at different depths, and chase sinking food when hungry. The fish use four FLUX → TRELLIS textured models with flexible body and tail animation, light scattering and four visual detail levels.

The simulation tracks hunger, fish health, organic waste, ammonia, nitrite, nitrate, dissolved oxygen, algae and biological filtration. Uneaten food becomes waste. Filter bacteria process ammonia into nitrite and nitrate; plants take up nitrate, and water changes dilute it.

Healthy fish earn **Wonder**. Complete the keeper's journal, welcome new fish groups, add plants, and awaken an orbiting pearl, an underwater moon and an upside-down tea party.

The scene includes a voxel collision simulation for 3,000 pebbles, swaying translucent leaves, textured driftwood and rocks, and the StarHermit engine’s GPU FFT water, focused caustics, planar reflections, refraction and light shafts on High/Ultra. Fresnel-shaded filter bubbles rise and wobble before sending ripples across the surface.

Seven cherry/Amano shrimp, three nerite/ramshorn snails and three small aquatic insects browse the tank. Click them to inspect them. Water changes and clicking empty gravel disturb the substrate.

Turn Sound on for MOSS aquarium ambience and care sounds, plus a 90-second YuE instrumental track. The engine’s Options controls music and effects volume. Existing aquarium saves remain compatible.

## Controls

| Action | Control |
| --- | --- |
| Orbit | Drag the aquarium |
| Zoom | Mouse wheel; + / − buttons on phones |
| Inspect a fish | Click or tap it |
| Feed | F or Feed button |
| Change 30% of the water | W or Water change button |
| Plant | P or Plant button; costs 8 Wonder |
| Awaken a dream | D or Dream button |
| Pause | Space or pause button |
| Time speed | 1×, 5×, 20× buttons |
| Instructions | Help button; H on keyboard |
| Graphics, sound, controls and accessibility | Gear button; F1 or F10 |
| Mobile journal and fish shop | Tank notes → Journal / Fish |

At 1×, a simulated hour takes 80 seconds. Progress saves every 12 seconds, on care/reward actions, and when the game is suspended or closed. There is no offline time catch-up.

## Run with StarHermit

Download the official **1.38.0** developer runtime using the [engine tutorial](https://wiki.starhermit.com/docs/tutorials/starhermit-engine.html). Run these commands from this repository:

```sh
starhermit .
starhermit check .
starhermit types .
```

The manifest is at the repository root, ready for StarHermit's game discovery and packaging. The engine is not bundled with the source.

### Browser build

The checked-in `index.html` is the official generated loader. It pins the engine release by integrity hash and uses the official engine origin with the official wiki fallback.

Serve this repository over HTTPS or localhost to play the checked-in browser build. To regenerate an upload package after editing the game:

```sh
starhermit package --web . --out dist
```

Serve or upload `dist/` over HTTPS or localhost. Ordinary non-local HTTP origins cannot start the engine's web runtime.

### Native package

```sh
starhermit package --native .
```

### Type checking

`starhermit types .` generates `.starhermit/starhermit.d.ts` from the pinned runtime. Then run TypeScript 5 or later against `tsconfig.json`:

```sh
npx --package typescript tsc -p .
```

## Source

- `src/simulation.ts` — aquarium chemistry, fish state, food and schooling movement.
- `src/main.ts` — scene geometry, materials, fish animation, input, HUD, care tools, journal, fish shop, dreams, audio and saves.
- `starhermit.txt` — engine pin, entry module, capabilities and action bindings.
- `index.html` and `starhermit-files.json` — official web loader and generated package index.

The nitrogen cycle is a forgiving, accelerated game approximation. Species are procedural models; temperature is maintained at 25 °C by the simulated heater. Purchases use earned in-game Wonder. Progress is stored locally; this build does not provide online multiplayer or cloud saves.

## Validation

The original playable build passed the official engine's 120-frame package check, strict TypeScript checking, native Vulkan rendering and scripted 1440×900 desktop / 390×844 mobile feeding, journal reward and dream-unlock interactions. Model checks covered 30 simulated hours, fish bounds, overfeeding penalties, water-change dilution and pellet consumption/expiration.

The 1.1 remaster passes strict TypeScript, the official 120-frame package check, three voxel-physics tests and native gameplay/rendering checks at Low, Balanced, High and Ultra. Desktop and phone browser startup are checked against the packaged game; generated models, sound, water interaction and resident purchases are also exercised. See [spec.md](spec.md) for the release record.

## Publish

Run `npm run package` after changes, commit the generated loader and file index with the source, then run `npm run publish:starhermit`. The shared uploader uses the existing `../.env` publishing credentials and records the deployed game in `publication.json`. See [spec.md](spec.md) for artwork, graphics tiers and validation details.

## License

[LICENSE](LICENSE) is copied verbatim from [StarHermit Engine's license](https://github.com/HypeDriven/starhermit-engine/blob/main/LICENSE): **PolyForm Noncommercial License 1.0.0**, including Hype Driven Development Inc.'s additional permission for games kept publicly available and in running order on StarHermit.com. See the complete license for its terms.

Copyright 2026 Hype Driven Development Inc.
