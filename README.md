# Oddwater — a slightly impossible aquarium

**[▶ Play Oddwater on StarHermit](https://dashboard.starhermit.com/play/141f9640-ec24-41b9-86b0-0115fd956448)**

A 3D freshwater aquarium game built directly on **StarHermit Engine 1.39.0**. Keep a planted community tank thriving, get to know its residents, grow a nursery, and spend earned Wonder on equipment, fish, plants and three small impossibilities.

## The aquarium

Start with eight neon tetras, six harlequin rasboras, four peppered corys and one pearl gourami in a planted 180 L community tank. Fish school with their own species, avoid one another and the tank boundaries, forage at different depths, and chase sinking food when hungry. The fish use four FLUX → TRELLIS textured models with flexible body and tail animation, light scattering and four visual detail levels.

The simulation tracks hunger, fish health, organic waste, ammonia, nitrite, nitrate, dissolved oxygen, algae and biological filtration. Uneaten food becomes waste. Filter bacteria process ammonia into nitrite and nitrate; plants take up nitrate, and water changes dilute it.

Healthy fish earn **Wonder**. Complete the keeper's journal, welcome new fish groups, add plants, and awaken an orbiting pearl, an underwater moon and an upside-down tea party.

The scene includes a voxel collision simulation for 3,000 pebbles, swaying translucent leaves, textured driftwood and rocks, and the StarHermit engine’s GPU FFT water, focused caustics, planar reflections, refraction and light shafts on High/Ultra. Fresnel-shaded filter bubbles rise and wobble before sending ripples across the surface.

The tank starts with seven cherry/Amano shrimp, three nerite/ramshorn snails and three small aquatic insects. Their energy, growth and shrimp moult cycles persist alongside the fish. Click them to inspect them. Water changes and clicking empty gravel disturb the substrate.

Turn Sound on for MOSS aquarium ambience and care sounds, plus a 90-second YuE instrumental track. The engine’s Options controls music and effects volume. Existing aquarium saves remain compatible.

## The keeper’s notebook

Open **Notebook** or press **J**. Flakes reach the schools, sinking pellets reach corys, and algae wafers feed shrimp and snails. Use Place food (or T) to choose where a meal lands. Upgrade and rinse the filter, improve aeration, and balance a real day/night light schedule against plant growth and algae.

Mature stems yield cuttings for free planting. With 11 plants, improved filtration, a settled school and calm water, prepare a nursery for 18 Wonder. Eggs need 12 calm tank hours; welcome the juveniles, then watch them grow. Named fish gain trust when fed. Inspect all ten species for the field guide, complete repeating keeper projects and milestones, and read your tank’s dated log.

Fish can be renamed in their inspection card. Rehoming requires confirmation and keeps minimum social groups together, leaving room for later generations. Existing aquariums migrate automatically without losing their fish, Wonder, plants, dreams or journal rewards.

Open **Habitat** in the notebook to arrange three small beds: growing moss, decomposing leaf litter, permanent pebble refuges or open gravel. Residents seek their preferred feeding and resting places. Mature moss and settled water support cherry shrimp broods; welcome the shrimplets, watch them grow, and share extra adults while keeping four breeders. Patient observation earns four behavior field notes: meals, night rest, moulting and young.

## Controls

| Action | Control |
| --- | --- |
| Orbit | Drag the aquarium |
| Zoom | Mouse wheel; + / − buttons on phones |
| Inspect a fish | Click or tap it |
| Feed the selected food | F or Feed button |
| Keeper notebook: care, habitats, goals, guide and log | J or Notebook button |
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

Download the official **1.39.0** developer runtime using the [engine tutorial](https://wiki.starhermit.com/docs/tutorials/starhermit-engine.html). Run these commands from this repository:

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

- `src/ecology.ts` — persistent microhabitats, resident growth, moults, shrimp broods and behavior discoveries.
- `src/habitats.ts` — visible moss, leaf litter and refuges.
- `src/simulation.ts` — aquarium chemistry, fish state, food and schooling movement.
- `src/main.ts` — scene geometry, materials, fish animation, input, HUD, care tools, journal, fish shop, dreams, audio and saves.
- `starhermit.txt` — engine pin, entry module, capabilities and action bindings.
- `index.html` and `starhermit-files.json` — official web loader and generated package index.

The nitrogen cycle is a forgiving, accelerated game approximation. Fish use generated textured models; invertebrates are procedural. temperature is maintained at 25 °C by the simulated heater. Purchases use earned in-game Wonder. Progress is stored locally; this build does not provide online multiplayer or cloud saves.

## Validation

The original playable build passed the official engine's 120-frame package check, strict TypeScript checking, native Vulkan rendering and scripted 1440×900 desktop / 390×844 mobile feeding, journal reward and dream-unlock interactions. Model checks covered 30 simulated hours, fish bounds, overfeeding penalties, water-change dilution and pellet consumption/expiration.

The gameplay updates add habitat, colony, behavior, save-migration and ecosystem tests, and a complete scripted project-to-nursery playthrough. It retains strict TypeScript, the official package check, voxel-physics checks and native rendering checks at Low, Balanced, High and Ultra. Desktop and phone browser startup are checked against the packaged game; generated models, sound, water interaction and resident purchases are also exercised. See [spec.md](spec.md) for the release record.

## Publish

Run `npm run package` after changes, commit the generated loader and file index with the source, then run `npm run publish:starhermit`. The shared uploader uses the existing `../.env` publishing credentials and records the deployed game in `publication.json`. See [spec.md](spec.md) for artwork, graphics tiers and validation details.

## License

[LICENSE](LICENSE) is copied verbatim from [StarHermit Engine's license](https://github.com/HypeDriven/starhermit-engine/blob/main/LICENSE): **PolyForm Noncommercial License 1.0.0**, including Hype Driven Development Inc.'s additional permission for games kept publicly available and in running order on StarHermit.com. See the complete license for its terms.

Copyright 2026 Hype Driven Development Inc.
