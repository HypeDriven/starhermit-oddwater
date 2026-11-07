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

## Small worlds (1.3)

The fifth Notebook tab, **Habitat**, adds Layout, Colony and Field notes pages on desktop and phone. Three fixed foreground beds can hold open gravel (free), a moss garden (12 Wonder), leaf litter (6) or a pebble refuge (16). Replacement costs the full price; applying an unchanged habitat refuses payment, except renewing leaf litter below 50%. Moss begins at 15% maturity, grows 2.5 percentage points per daylight tank hour / 0.4 at night, and provides increasing shelter. Leaf litter supplies grazing food while decaying over 48 tank hours and adding a little organic waste. Refuges provide permanent cover. The 3D scene reflects placement, moss growth and remaining leaves, resting directly on the voxel gravel surface.

The original 13 invertebrates now have persistent distinct IDs, energy and growth. Shrimp moult every 20 tank hours and recover for 1.5 hours; juveniles grow faster with good water, food and cover. Residents seek moss, leaf litter, wafers and resting places; recovering shrimp slow down, juveniles remain near cover, and ramshorn snails / nymphs rest at night. Individual wafer nutrition persists. Their aggregate energy and population affect grazing in the chemistry model. This is a forgiving game approximation: residents are not killed by neglect.

A cherry shrimp brood costs 12 Wonder and needs four adult cherries, moss at 35% maturity, oxygen at least 6, 82% harmony, grazer energy at least 50%, and space below the 13-shrimp limit. Sixteen settled tank hours produce two claimable shrimplets at 32% growth. Losing prerequisites pauses the brood. Welcoming is idempotent and respects capacity. Sharing two extra adult cherries retains four adults, awards no currency, removes their visual state and makes room for later broods. Amano larvae and nerite young require different water conditions, so neither breeds here.

Inspect a resident directly or use Colony → Watch, then **Record behavior** to discover wafer browsing, actual night rest, moult recovery and juvenile growth. Each unique note earns 5 Wonder; repeats cannot farm rewards. Two additional permanent milestones reward six home-raised shrimp and all four notes. Notes and colony events enter the existing bounded tank log.

Save schema 3 remains in `oddwater-v1` and accepts schemas 1–3. Existing aquariums gain the original crew and three unmodified beds. Habitat maturity, brood progress, individuals, next resident ID, lifetime counts and field notes persist. Restoration validates species, IDs, numeric bounds, habitat kinds and note identifiers. All ecology time stops when paused, with no offline catch-up.

## Keeper progression (1.2)

The Notebook button / **J** opens four pages: Care, Goals, Guide and Log. Care includes meal, equipment and nursery sections. The same pages are available on phones, with a scaled layout on short displays. Opening the modal removes underlying interactive widgets; the tank remains visible behind it.

- **Diet and attachment.** Flakes, sinking pellets and algae wafers have different descent rates and feeding preferences. The Place food action / T lets the player target an area of the tank. Correct meals raise individual fish trust; trust reduces stress and draws fish toward the viewing glass. School size, cover, crowding, oxygen and long lighting periods affect comfort. Fish have persistent names and can be renamed in their inspection card.
- **Equipment and light.** The filter has two upgrades (24 / 48 Wonder), sponge load and a rinse action that preserves bacteria. The air return has two upgrades (18 / 36 Wonder), improving oxygen recovery and visibly increasing bubbles. A 6 / 8 / 10 / 12-hour photoperiod drives real daylight, plant growth, algae and rest. The existing lighting button cycles Auto / Moonlight / Daylight as a viewing preview without changing the ecosystem schedule.
- **Planting.** Stem maturity follows nutrients and light. At 60% maturity, trimming produces two free cuttings and reduces maturity by 45 percentage points. Planting spends a cutting before charging the usual 8 Wonder. Full planting/cutting baskets refuse the action without spending resources.
- **Nursery.** A complete mature school or adult pair, 11 plants, the first filter upgrade, room for two fish, and 82% harmony unlock a nursery for 18 Wonder. Eggs appear among the plants. Twelve tank hours of sufficient harmony, oxygen and cover produce two juveniles; adverse conditions pause development. Welcomed juveniles start at 32% growth and grow with care, using scaled versions of the existing species models.
- **Knowledge and projects.** First observation of each of ten resident species earns 3 Wonder. Seven one-time milestones and repeating keeper projects add longer goals: varied meals, taking cuttings, sustained harmony and raising juveniles. Claims are idempotent; each project records a fresh baseline. A bounded 30-entry tank log records observations, care, upgrades, nursery events and rehoming.
- **Stewardship.** Confirmed rehoming removes that fish’s simulation and visual state while retaining minimum school sizes. This makes room for later nursery projects at the 35-fish capacity. New fish receive distinct IDs after removals. The clean-up crew seeks wafers and contributes to algae/detritus cycling through a simulated energy budget.

Save schema 2 uses the existing `oddwater-v1` storage slot. Migration accepts both schemas, preserves old aquarium state and journal claims, fills new fields, validates finite bounds, and clears transient food particles. New progression, names, nursery progress, juvenile growth and project baselines survive reloads. Time advances only while playing and unpaused.

## Packaging and publishing

`npm run package` regenerates the loader and file index. Set `STARHERMIT` to another installed 1.38.0 runtime if needed. Type-check using the runtime's generated declarations and TypeScript 5 or later.

`npm run publish:starhermit` uses `../tools/upload-game.mjs`, the shared uploader, and credentials in `../.env`. It packages exactly the files indexed at a clean Git HEAD, creates the listing once, updates the existing game on subsequent releases, and records its ID, URL, source commit and archive hash in `publication.json`. Development documentation, tools, tests, the original cover and publication receipts stay out of the upload. Never ship credentials.

## Artwork provenance

Cover generated with the built-in imagegen tool. Prompt: a peaceful slightly impossible planted freshwater aquarium with neon tetras, harlequin rasboras, peppered corys, one pearl gourami, branching driftwood, aquatic leaves, gravel, and a luminous pearl orbiting a tiny underwater moon. Cinematic 3D key art in deep teal, moss green, pale lime and pearl gold, gentle caustics; no people, ocean coral, text, logos or watermarks. The SVG icon is authored in the repository; PNGs are rendered from it with `rsvg-convert`.

## Verification

`npm test` runs 15 ecosystem/save/progression tests, eight habitat/colony regressions and three voxel-physics regressions, validates every indexed package hash, invokes the official package check, and drives desktop, phone, notebook, complete fish and shrimp nursery progression, habitat placement, behavior recording, water/audio and Ultra rendering scripts. `tests/native/residents.play` also checks inspection and fish purchases. `npm run test:browser` starts the packaged game before any user gesture and checks care, sound activation, Options and all notebook pages at 1366 × 768 desktop and 390 × 844 / DPR 3 phone sizes. Screenshots and asset-generation receipts are retained under development-only `art/`.

The 1.1 release was checked on 2026-11-07: strict TypeScript, voxel physics, official package validation, native Low/Balanced/High/Ultra rendering, feeding/rewards/dreams, water-change gravel disturbance, day/night lighting, audio controls and fish purchases passed. Standard desktop and phone browser startup passed with no game console errors or warnings. Driver-only warnings from software WebGL are filtered. Startup audio loads in the background so the browser does not wait for audio unlock before showing the aquarium.

The forced-High browser capture exceeded the software renderer's screenshot timeout while the machine's hardware GPU was reserved by another benchmark; full High/Ultra effects were verified with the native runtime. These are functional rendering checks, not a 60 FPS certification. Ultra's maximum-feature water is intentionally demanding.

Oddwater's public URL remains https://141f9640-ec24-41b9-86b0-0115fd956448.starhermit.com/index.html. `publication.json` records the current published version, verified file hashes, source commit and archive hash.

Version 1.1 published on 2026-11-07 from source commit `b12b62f`. All 47 indexed production files matched their SHA-256 hashes and the library cover matched `cover.jpg`. Production browser checks passed on desktop and phone, including startup without input, care, sound activation and Options, with no game console errors or warnings.

The 1.2 validation includes 15 model/migration tests, three pebble-physics tests, the original care and dream flows, all notebook pages at desktop/phone sizes, a complete project-to-nursery playthrough, food placement, renaming and confirmed rehoming. Native rendering passed at Low, Balanced, High and Ultra. Desktop/phone browser tests use the engine’s actual accessible control bounds and require notebook controls to exist, with no game console errors or warnings.

Version 1.2 published on 2026-11-07 from source commit `fd9bf37`. All 48 indexed production files matched their release hashes. Desktop and phone production tests passed care, sound, Options and every notebook page with no game console errors or warnings. The publication receipt records the game ID, release hash and verification results.

The 1.3 validation covers 26 model/physics regressions (15 aquarium, eight ecology, three gravel), the official 120-frame package check, all existing care/notebook/nursery flows, habitat placement, a complete shrimp brood and juvenile behavior observation. Native Low/Balanced/High/Ultra checks passed. A separate fully stocked High test with 35 fish, 36 plants, 13 shrimp and all dreams rendered with no skipped objects. Desktop and phone packaged browser checks passed all notebook and Habitat pages with no game console errors or warnings. Review images and reports are in `art/review/1.3/`.

The final UI pass also completed the full shrimp grow/share/rebreed cycle, verified readable observation notifications above inspection cards, and exercised Habitat controls at both 390- and 320-pixel phone widths. All 50 indexed runtime files match the final package hashes.

Version 1.3 published on 2026-11-07 from source commit `9ee0bf7`. All 50 indexed production files and the library cover matched the release. Production desktop and phone checks passed startup, care, sound, Options, all notebook pages, and Habitat / Colony / Field notes with no game console errors or warnings. The final publication receipt and browser report record the verified release.
