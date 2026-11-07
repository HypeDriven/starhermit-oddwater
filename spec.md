# Oddwater

A peaceful 3D freshwater aquarium with a slightly impossible imagination. Tend a planted 180 L community tank, earn Wonder through healthy fish and journal tasks, add compatible fish groups and plants, and awaken three surreal dreams. Purchases use earned Wonder. Aquarium progress saves locally, with no offline catch-up.

## Release conventions

The StarHermit listing is named **Oddwater**. `starhermit.txt` pins engine 1.38.0, declares keyboard/gamepad controls, and names `cover.jpg`. The official runtime generates `index.html` and `starhermit-files.json`; never hand-edit the loader. Both browser and native play use the same TypeScript source.

- `cover.jpg`: 1200 × 675 landscape library art; the high-resolution original is `coverart.png` (development only).
- `favicon.svg`, `favicon.png`: a pale lime and cyan fish, aquatic leaves and a gold pearl on deep teal; the generated loader names the raster favicon.
- `icon.png`: 256 × 256 launcher icon from the same SVG.
- `LICENSE.md`: root license, matching the engine license in `LICENSE`.
- The gear button, F1 or F10 opens the engine Options: graphics, frame limit, sound, remappable controls and accessibility. Graphics changes take effect during play and follow the engine's saved preferences.
- Help (`?` or H) explains care, controls and progression; the journal provides the first goals.

## Graphics

The engine detects hardware, applies its render resolution and frame pacing, and exposes the current graphics level. Oddwater follows its Low / Balanced / High / Ultra tiers and live Auto adjustments. All tiers retain the same fish, plants, care actions, simulation and rewards.

| Tier | Gravel instances | Bubbles | Shadow map | Ambient occlusion | Bloom resolution |
| --- | ---: | ---: | ---: | --- | --- |
| Low | 600 | 12 | Off | Off | Off |
| Balanced | 1500 | 24 | 1024 | Off | Off |
| High | 3000 | 36 | 2048 | 8 samples, half resolution | Half |
| Ultra | 3000 | 48 | 4096 | 16 samples, ¾ resolution | Full |

The engine chooses anti-aliasing and limits resolution per graphics level. Shadows also respect its supported level. The game reuses geometry and visual objects when changing settings.

## Packaging and publishing

`npm run package` regenerates the loader and file index. Set `STARHERMIT` to another installed 1.38.0 runtime if needed. Type-check using the runtime's generated declarations and TypeScript 5 or later.

`npm run publish:starhermit` uses `../tools/upload-game.mjs`, the shared uploader, and credentials in `../.env`. It packages exactly the files indexed at a clean Git HEAD, creates the listing once, updates the existing game on subsequent releases, and records its ID, URL, source commit and archive hash in `publication.json`. Development documentation, tools, tests, the original cover and publication receipts stay out of the upload. Never ship credentials.

## Artwork provenance

Cover generated with the built-in imagegen tool. Prompt: a peaceful slightly impossible planted freshwater aquarium with neon tetras, harlequin rasboras, peppered corys, one pearl gourami, branching driftwood, aquatic leaves, gravel, and a luminous pearl orbiting a tiny underwater moon. Cinematic 3D key art in deep teal, moss green, pale lime and pearl gold, gentle caustics; no people, ocean coral, text, logos or watermarks. The SVG icon is authored in the repository; PNGs are rendered from it with `rsvg-convert`.

## Verification

`tests/native/desktop.play` exercises feeding, a journal reward, water change, planting, the first dream, Help and Options. `tests/native/mobile.play` exercises phone care and journal actions and Options. `tests/native/graphics.play` provides a representative aquarium scene for checks at each graphics tier. These use the official runtime's `--render-check --guest --script` path. Browser startup and layouts are checked using `../tools/engine-web-smoke.mjs` at desktop and phone sizes.

Validation on 2026-11-07: strict TypeScript and the official 120-frame package check passed. `npm test` passed desktop gameplay at Balanced, phone gameplay at Low, and native rendering at High and Ultra. Chrome desktop (1366 × 768) and phone (390 × 844, DPR 3) both reached the running state with no console errors or warnings. Screenshots were inspected, and the phone title/counter spacing was corrected. These are functional/rendering checks, not a 60 FPS hardware certification.
