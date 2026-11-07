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

## Living water remaster (1.1)

The original four fish species now use distinct FLUX.2 klein references reconstructed by TRELLIS image-large. Source images, masters and generation receipts live in `art/fish/sources/`; `tools/remaster/fish.json` records prompts and seeds. The preparation pipeline normalizes the actual model axes to +X forward, repairs texture format to PNG, and uses UV-preserving mesh simplification. Models and textures are shared between fish; each fish has an independent continuous body/tail bending phase. Live graphics changes replace the models while retaining the simulation.

The tank includes seven cherry/Amano shrimp, three nerite/ramshorn snails and three aquatic insects (mayfly nymphs and a water boatman). They walk, graze, swim and paddle independently. The nerite climbs the front glass. Clicking a resident opens its species card. Grazers make a small contribution to algae and leftover-food removal.

### Water and tissue lighting

`src/water/` adapts the StarHermit Engine 1.38 `ocean-gpu` reference's four-cascade GPU FFT, refracted wave caustics and planar reflection. The upstream MIT notice is included. Aquarium-scale capillary waves, filter-outlet ripples and care-action rings replace ocean surf. The bounded surface uses water's 1.333 refractive index and Schlick Fresnel, scene-color refraction and depth-dependent Beer–Lambert absorption. A finite water volume adds subtle refractive distortion and bounded light shafts; opaque scene depth terminates each ray at the fish, plants or rocks. Instanced bubbles have Fresnel rims, concentrated specular highlights, varied radii, helical drift, wobble and surface ripples.

Plants and fish use custom engine light hooks for subsurface diffusion and thin-tissue transmission: leaf thickness varies near the central vein; fish fins and tails transmit more light than their bodies. Transmission depends on actual incident light direction/color, shadowing, tissue thickness and absorption. Engine 1.38's unsupported MeshPhysicalMaterial scattering/transmission fields are not used. Wave-focused caustics compose with tissue lighting on the same materials.

### Pebble physics

`VoxelBed` simulates 3,000 pebbles under gravity at 60 Hz with a bounded 62 × 12 × 27 voxel broad phase, linked cell occupants, sphere contacts, restitution, friction and tank-floor/wall constraints. Settled beds sleep. Water changes and clicks on empty substrate wake and disturb nearby stones. Graphics tiers change the drawn subset; the same physics bed remains underneath. Invertebrates use its sampled surface height.

### Graphics budgets

The engine detects hardware, controls render resolution/frame pacing and supplies live Auto adjustments. All levels keep identical aquarium and gravel simulation, residents, care actions and rewards.

| Tier | Fish triangles per species, at most | Texture side | Gravel drawn | Bubbles | Shadow | Water |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Low | 1,800 | 256 | 600 | 40 | Off | Analytic ripples and Fresnel surface |
| Balanced | 4,000 | 512 | 1,500 | 85 | 1,024 | Adds finite water optics and 8-step shafts |
| High | 8,000 | 768 | 3,000 | 150 | 2,048 | Four 256² FFT cascades / 4 frames; 512² caustics; reflection / 6 frames; 16-step shafts |
| Ultra | 16,000 | 1,024 | 3,000 | 240 | 4,096 | FFT and reflection / 2 frames; larger reflection; 24-step shafts |

Actual generated triangle counts and asset hashes are recorded in `assets/fish/models.json`. High/Ultra retain 8/16-sample ambient occlusion and half/full-resolution bloom. Advanced water uses 13 render targets within the engine's 16-target limit. The engine handles anti-aliasing, resolution limits and saved preferences.

### Sound

MOSS generated quiet filter ambience, feeding, water pouring and a dream chime; bindings are in `sfx/manifest.txt`. YuE generated the original 90-second instrumental `music/reverie.ogg`. Prompts/seeds/receipts live in `tools/remaster/`; lossless masters live under development-only `art/audio/sources/`. Runtime Opus clips are loudness-normalized, faded and use the engine's music/effects buses. Sound starts only when the player turns it on.

## Packaging and publishing

`npm run package` regenerates the loader and file index. Set `STARHERMIT` to another installed 1.38.0 runtime if needed. Type-check using the runtime's generated declarations and TypeScript 5 or later.

`npm run publish:starhermit` uses `../tools/upload-game.mjs`, the shared uploader, and credentials in `../.env`. It packages exactly the files indexed at a clean Git HEAD, creates the listing once, updates the existing game on subsequent releases, and records its ID, URL, source commit and archive hash in `publication.json`. Development documentation, tools, tests, the original cover and publication receipts stay out of the upload. Never ship credentials.

## Artwork provenance

Cover generated with the built-in imagegen tool. Prompt: a peaceful slightly impossible planted freshwater aquarium with neon tetras, harlequin rasboras, peppered corys, one pearl gourami, branching driftwood, aquatic leaves, gravel, and a luminous pearl orbiting a tiny underwater moon. Cinematic 3D key art in deep teal, moss green, pale lime and pearl gold, gentle caustics; no people, ocean coral, text, logos or watermarks. The SVG icon is authored in the repository; PNGs are rendered from it with `rsvg-convert`.

## Verification

`npm test` runs three voxel-physics regressions, validates every indexed package hash, invokes the official 120-frame package check, and drives native desktop, phone, water/audio and Ultra rendering scripts. `tests/native/residents.play` also checks inspection and fish purchases. `npm run test:browser` starts the packaged game before any user gesture and checks care, sound activation and Options at 1366 × 768 desktop and 390 × 844 / DPR 3 phone sizes. Screenshots and asset-generation receipts are retained under development-only `art/`.

The 1.1 release was checked on 2026-11-07: strict TypeScript, voxel physics, official package validation, native Low/Balanced/High/Ultra rendering, feeding/rewards/dreams, water-change gravel disturbance, day/night lighting, audio controls and fish purchases passed. Standard desktop and phone browser startup passed with no game console errors or warnings. Driver-only warnings from software WebGL are filtered. Startup audio loads in the background so the browser does not wait for audio unlock before showing the aquarium.

The forced-High browser capture exceeded the software renderer's screenshot timeout while the machine's hardware GPU was reserved by another benchmark; full High/Ultra effects were verified with the native runtime. These are functional rendering checks, not a 60 FPS certification. Ultra's maximum-feature water is intentionally demanding.

Oddwater's public URL remains https://141f9640-ec24-41b9-86b0-0115fd956448.starhermit.com/index.html. `publication.json` records the current published version, verified file hashes, source commit and archive hash.
