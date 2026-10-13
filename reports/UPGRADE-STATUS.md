# TerraLens classroom upgrade — work in progress

Repository: Zzyyio/terralens9.18. Base: 5207fb6c586ff3175b754dda66de5ce292e0a5e5.
Branch: codex/terralens-classroom-upgrade. No deployment or GitHub publication has been performed.

## Scope and baseline

Keep the existing dark brand, navigation, educational flow, keyboard/projector controls, SI units and classroom disclaimers. Work through P0–P5. Completion requires desktop/mobile production verification, not only a successful build.

`media-baseline.json` is the original, immutable inventory of 1,037 registry slots. There were 417 glossary slots, of which 241 were labelled diagram; 62 lab covers; 62 teacher heroes; 453 term thumbnails. Visual review also found unrelated photographs and illustrations falsely labelled photo. Hash uniqueness did not establish subject accuracy.

## Implemented so far

- Shared map: correct MapLibre tile-load detection, resettable provider fallback, requested-style tracking, overlay restoration, explicit loading/offline/error states and retry. Keyless OpenFreeMap → OSM → local Natural Earth fallback. CARTO was removed after browser testing reproduced its HTTP-200 API-key watermark; see https://carto.com/basemaps/apikey/. Political mode uses OSM. Optional relief and bathymetry retain their own source attribution. Pins handle late asynchronous map initialisation and two-point framing across the antimeridian.
- Live weather: cancellable/debounced requests, a ten-minute bounded cache, timeout and Retry-After handling, explicit missing values, exact 72-hour API requests in UTC/SI, two-place time-aligned comparison, genuine wind barbs, labelled chart scales, hourly scrubber/table, CSV with provenance, shareable coordinates and projector sizing. No fabricated gust/pressure or automatic synthetic forecast fallback.
- Curated media: explicit source pages, authors, licences, alt text and observation captions. `photo` and `scientific-image` are distinct; satellite data visualisations name the measured quantity. Image sources and approved assignments live in `scripts/*photo*.json`. No search result is automatically published.
- Figure captions now preserve source and licence links through the registry and shared Figure component.
- Minimum tooling change: invoke Vite's Node entry point in the existing app-env wrapper so it runs on Windows without losing Grok environment handling.

## Verification completed

- Eleven map/weather regression tests passed: loaded tiles, metadata-only events, repeated/stale errors, offline fallback, manual reset/cleanup, missing values, unit validation, 72 hourly steps, caching, cancellation and 429 cooldown.
- `npm run typecheck` passed after the map and source-registry changes.
- `npm run build` passed. Database migration skipped because DATABASE_URL is absent; no database was provisioned.
- Browser: local weather default basemap, world-map vector/relief/bathymetry, political OSM and Atlas UK locator rendered. Blocking both network basemaps preserved local coastlines and retry; a status-detection edge case found in this test was fixed and needs final retest. Live weather returned 72 actual hourly values with source/grid/UTC metadata. Remaining mobile/production flows still require verification.

## Remaining acceptance work

- P0: finish map failure/retry/browser tests and removal of all wrong images across every surface.
- P1: 311 source-reviewed images now serve all 417 glossary terms, 62 covers, 62 teacher heroes, 453 term thumbnails, 8 realms, 35 cases, 184 Atlas places and 2 Earth-motion observations. Audit: 1,223 slots, zero missing files/diagram kinds/missing provenance. Sources were visually reviewed in contact sheets; final page sampling and responsive QA remain. Legacy automatic diagram generators are retired. public/photos/manifest.json and reports/media-replacements.json are regenerated from current assignments.
- P2: Earth-motion now uses Meeus/NOAA solar geometry with UTC signs, polar events, valid dates/leap years, linked terminator/time, comparison, chart, share and CSV; six numerical tests pass. Map studio uses actual Bird PB2002 plate polygons and 5,824 classified boundary steps, Natural Earth boundaries, geodesic measurement with dateline tests, working shared-view state, presets and legends. Atlas climate is sampled at 184 locators from Beck 1991–2020 V3 1 km data, replacing text inference; all-place comparison and source-aware cards added. Final desktop/mobile error/interaction QA is still required.
- P3: implemented accent-insensitive search, realm and initial filters, URL-linked term reading, 12-item pages, related labs, recall/reveal and local revision marks. Final mobile and persistence checks remain.
- P4: 62/62 scene entry points now use replacement scientific geometry; none remain on the legacy GLB path. This is an implementation count, not an acceptance claim. See model-replacements.json. Closed shell/cut geometry, geographic UV alignment, Kepler orbit, contours, GPlates reconstruction, equilibrium-tide potential, eclipse shadow geometry, conservative storm routing and radial well drawdown are implemented. Required eight-lab visual checks and all-scene mobile/production checks remain incomplete.
- P5: realm/stage/curriculum and text filtering, four timed classroom stages, direct projector/stage links, source-backed matching figures, opt-in live model rehearsal, copy/download outline, large text and print styles implemented. Mobile filtering/copy and embedded model loading verified; final regenerated-production checks remain.
- Final build and desktop/mobile production QA; source/model replacement list and minimum shared changes.

## Reproduce locally

1. In `D:\Claude\terralens-work`, run `npm ci`, then `npm run dev`.
2. Open `http://127.0.0.1:8080/tools/live-weather`, `/tools/map`, `/atlas`, `/explore` and `/glossary`.
3. `node --test --test-isolation=none scripts/map-fallback.test.mjs`.
4. `node scripts/audit-media.mjs`, `npm run typecheck`, `npm run build`.
5. Media maintenance: review candidates, edit explicit approval/assignment JSON, run `python scripts/approve-photo-candidates.py`, then the Pillow-enabled `scripts/download-verified-photos.py`, inspect downloads, and run `node scripts/sync-reviewed-media.mjs`.

Do not run the legacy automatic diagram generators to refill missing photographs.

## Current P4 checks (19 September 2026)

- TypeScript check passes after the groundwater, hydrograph and drainage-basin replacements.
- Eleven geometry/lunar/hydrology tests pass; the six existing solar tests also passed with the lunar changes.
- Browser: water-cycle transfer labels no longer overlap; latest closed substrate still needs a fresh screenshot. Lunar and solar eclipse close-ups render; node/distance interaction and mobile QA remain. Hydrograph urban cover 0.2 → 1 changes peak 0.59 → 3.04 m³/s and lag 3.10 → 1.05 h; the storm scrubber updates rain/discharge together.
- Shared fixes: reset-view orientation, control-bar/readout space, input-safe keyboard handling, explicit-play support with reduced motion, duplicate term keys, clipboard error handling, correct toggle state. Eclipse obscuration is an optional Earth shader path; regression of the other Earth views is pending.
- Removed two mismatched Seasons video assignments from Moon phases and Eclipses. Existing topic sources and navigation remain.

## Additional P4 work and checks

- Added rain-shadow parcel thermodynamics, static Airy ice loading, grey-layer radiation balance, exact f-plane wind response, thermal circulation, zonal-mean cells, pressure-centre circulation, frontal occlusion, point-source seismic fronts and symmetric spreading with an explicitly invented polarity record.
- Browser checks: greenhouse switch changed equilibrium from 14.9 °C to −18.6 °C at albedo 0.3, with balanced top-of-atmosphere fluxes; Southern Hemisphere + friction gave u = −8 and v = +4 m/s; coastal hour 15 versus 3 reversed thermal flow. Frontal occlusion and three-cell geometry render. Fixed coincident frontal volume surfaces, clipped labels and over-bright water reflections. Later seismic/material changes still need rechecking.
- 44 focused tests passed together, then two spreading tests passed. The combined suite and production build must be rerun after the remaining replacements. Source replacement count is not a visual/scientific acceptance count.
- Minimum shared changes: camera framing includes labelled anchors and responds to true-scale, slice and explode; zero-length arrows disappear; arrowheads remain visible in unlit Earth scenes.


## Ocean, carbon and soil batch (19 September 2026)

- Replaced Wilson-cycle, storm-surge and tsunami geometry; wind/pressure setup and long-wave propagation use disclosed equations. Tsunami source displacement and propagation are separate teaching stages, not a solved rupture model.
- Added five geographic surface gyres, ENSO thermocline/Walker states, overturning section plus a separate linear density experiment, a conservative five-store carbon budget, three non-compulsory soil-horizon examples, a catena, three weathering mechanisms and periglacial section/network views.
- The carbon reservoirs and fluxes, ENSO temperatures/depths and soil depths are explicitly invented teaching inputs. They must not be represented as field measurements or calibrated forecasts. The thermohaline density formula is a local linear approximation, not TEOS-10.
- Latest focused suite: 60/60 tests passed together. TypeScript passed through periglacial. A broad run of the repository's unrelated template tooling tests also encountered subprocess/symlink EPERM and missing .grok skill files; it did not pass and is not counted as application validation. The changed Windows startup wrapper passed 10/12 tests with subprocess permission; two existing fixture/environment failures remain: an exact app-env expectation omits VITE_INDEXABLE, and Windows cannot create the test symlink. Runtime command invocation, overrides, exit status and signal propagation passed.
- Browser observations: zero wind plus zero pressure drop produces zero setup; Wilson open/closing sections render; ENSO 0 to +1 changes eastern SST 24 to 27 C and thermocline 60 to 110 m; at 4 C, lowering parcel Absolute Salinity 35 to 32 g/kg changes density contrast +1.23 to -1.11 kg/m3. Geographic gyre orientation was corrected to keep north upright. Carbon label spacing and soil albedo were adjusted after screenshots; final production/mobile checks are pending.
- Minimum shared changes: static parameter experiments suppress inert playback and time shortcuts; fullscreen follows the actual browser event; mobile copy-link failures are visible. New closed water/prism components keep scientific geometry reusable.
- The ocean/soil batch reached 47/62 scene entry points. Subsequent progress is recorded below; this historical count is not acceptance. No deployment or GitHub write has occurred.


- Added a simplified Bishop initial-slope calculation and a rigid circular slump illustration, an ideal tropical vortex with independently checked gradient-wind pressure, five landforms compared at common scale, and paired conservative annual river regimes with snow and reservoir storage. Six additional focused tests passed (two each for slump, cyclone and annual regimes); full combined rerun pending.
- The 43-scene production build completed at 13:49 local time and runs on port 8081. Later changes (44–47, global 44 px mobile label targets, decimal precision and mobile carbon layout) currently run only on port 8080. Desktop production carbon labels were verified; mobile overlap was found and the responsive fix was verified in development. It still needs a refreshed production check.

## Geomorphology batch (19 September 2026)

- Replacement entry points now include river erosion (waterfall/gorge, pothole and V-valley), three river-capture stages, point-bar/floodplain/delta comparisons with a separate Stokes settling calculation, a thick valley glacier, actual cave/arch openings with beach transport and spit views, a karst cutaway, and barchan/yardang forms. All prescribed geometry is distinguished from solved rates or surveyed landforms.
- Corrected warm/cold surface-current branch indices against geographic motion. Tropical cloud-wall geometry now stays within its stated 12 km depth. Glacier margin changes do not reverse ice motion. Associated cirque/arête/horn coverage still needs a dedicated geometry view rather than only explanatory text.
- Shared camera fix: send scene revision through the Canvas render tree, defer fitting until geometry commits, and prevent OrbitControls from overwriting the fitted target. In development, switching pothole to valley and back now frames the new object without pressing Reset view.
- Focused tests: 70/70 passed together, including grain-size scaling and low-Reynolds applicability, dune slip-face slope/volume translation, waterfall retreat and branch directions. TypeScript passed before the final camera-prop change; rerun pending. This does not supersede the separate template-tooling test limitations above.
- Browser: desktop waterfall, pothole and valley render; mobile headland switches between a cave with a back wall and a through-going arch. Wider desktop/mobile acceptance, new flow interactions and scientific review remain incomplete.
- A 54-scene production build completed at 14:35 local time. Preview restarted on http://127.0.0.1:8081. This supersedes the earlier 43-scene preview. Development continues on port 8080. No deployment or GitHub write.


## Final replacement and Teachers batch (19 September 2026)

- All 62 scene entry points are replaced. The last eight add latitude/declination insolation, proportional geological time, conservative soil loss, branching rock transformations, independent hotspot tracks, km/AU/light-year comparisons, JPL orbital elements with radius views, and actual Beck climate-family cells. Glacier now also has an explicit cirque/arête/horn view.
- High-resolution additions: 4096-pixel NASA Mercury enhanced-colour map, 6000-pixel NASA Jupiter map, and NASA/JPL Mars and Saturn GLBs with 2048/4096-pixel material atlases. Public provenance and hashes: public/textures/planets/sources.json. Rejected 720-pixel candidate textures are research files only. Venus and ice giants explicitly use modelled cloud materials, not claimed photographs.
- Climate globe uses the official Beck V3 0.1-degree classification; decoded palette/index provenance is in public/textures/climate-families.json. Nuuk 64.18 N, 51.72 W was independently sampled as class 29 (ET); this replaces the mismatched Greenland EF reference beside the tundra example.
- Teachers retains the existing title/voice and curriculum tags. Notes now read actual scripts, limits, sources and question counts. Check no longer pads topic questions with unrelated generated distractors. All four classroom stages have reproducible URLs; Check opens the question drawer. Outlines include stages, misconception corrections, pitfalls, answer key and sources. No login.
- Shared corrections: manual progress includes both 0 and 1 while playback wraps; camera framing includes instance transforms; projector headings allow 48 pixels more model height; drawers have explicit widths; print hides controls and uses dark text on white.
- Validation: 77 focused model/map/weather tests passed together, then 3 teaching/state tests passed. TypeScript passed through the initial Teachers implementation; later content/layout edits need a final rerun. Production build completed at 15:35 local time and preview is on port 8081; subsequent earth-interior copy, climate reference, solar comparison spacing and print fixes remain development-only until the next build.
- Browser evidence: Teachers realm filtering, text search, lesson opening, Check deep-link, mobile copy-outline and opt-in model loading work; mobile page width 375 equals scroll width, with no failed images. Print emulation found and prompted a body-background specificity fix. Climate A and E models render with actual classification cells. The older development HMR error while a file was being replaced is historical, not a current runtime failure.
- Still incomplete: required eight-lab final qualitative review; all-lab production/mobile checks; comprehensive original-diagram semantic audit plus 30 glossary page samples; final tool failure paths and final delivery report. Implementation totals are not acceptance totals.


## Semantic and cross-device review (19–20 September 2026)

- All 241 former diagram replacements were visually inspected in 11 labelled contact sheets. This uncovered weak associations rather than merely missing files. Nine additional real sources and 23 term-specific corrections now cover Aquitard, Beheaded stream, Barrier island, Basin, Curie point, Fissure eruption, International Date Line, Nival, Neap tide/Quadrature, Gores, Eustatic, ka, True scale, Long profile and radiation quantities. The ambiguous unused CERES image was retired from the source registry. There are now 319 reviewed sources and 1,223 current slots. The 417 glossary slots have no diagram kinds, missing files or missing provenance. Contact sheets and source hashes have been regenerated.
- Desktop glossary pages 1–3: 36 terms reviewed in the actual UI; images loaded and widths did not overflow. Corrections from these pages were applied afterwards and need the final production recheck. Mobile accent-insensitive search (`arete`), recall/reveal and persisted revision marks worked. Pagination now focuses and scrolls to the start of the new results.
- Required-lab review: desktop Earth interior, Seasons, Rivers, Water cycle and Contours; mobile Earth interior, Seasons, Plate boundaries, Atmosphere, Water cycle, Rivers and Volcanoes. These are checks on mixed development versions, not all 8 on both production viewports. Wave overlays, mantle state and radii, zero-tilt daylight, 0 Ma/200 Ma reconstruction, atmospheric lapse-rate response, a 10,000 m³ water budget, contour interval/spot height and central/fissure switching were exercised. Rivers' latest channel/label correction still needs cold-load confirmation.
- New views: Seasons has an Earth close-up; Atmosphere separates the layer globe and temperature profile. Mobile Earth-interior and atmosphere labels use numbered legends. Fixed an asynchronous texture/material recompilation failure that had left the plate globe white. Modern plates use NASA Earth imagery; reconstructions remain explicitly classified model geometry. Keyed volcanic vent branches prevent disappearing ground after switching.
- Performance: tide and ocean-section animation now updates existing vertex buffers. Canvas shadows use supported PCF rather than the removed PCFSoft mode. Tag occlusion now hides a label as a whole instead of punching dark rectangles through the model; this shared change needs final regression.
- Earth-motion: CSV includes selected UTC time, subsolar longitude and current solar altitude. Undefined polar daylight remains blank in exports/curves and undefined in comparisons. Invalid shared fields identify their default fallback. Browser verified the exact-pole, zero-tilt case. Deterministic SVG precision removes server/client floating-point hydration differences found in solar/tsunami charts.
- Weather: actual API returned 72 hourly steps and aligned Tokyo/Sydney readings. An intercepted 429 response produced a disabled countdown; B's data and the map remained available. Interception was cleared; Retry weather subsequently loaded Tokyo and an aligned comparison. Weather/solar CSV and teacher outline emitted browser download events with expected names/byte counts; the in-app browser did not expose a completed-download event, so this is not a disk-save assertion.
- Teachers: large text measured 20 px, outline download was triggered, and print controls hide. Print emulation exposed another dark ancestor background despite a white body; html and the outer teacher wrapper are now included in the print reset. Final screenshot recheck remains.
- Typecheck and all 80 focused tests passed together before the last channel/label-only fixes. A production build completed at 16:34 on 19 September. The browser run was interrupted before double-provider fallback confirmation; after restart no old browser tabs or local preview listeners remained. Rebuild and final production QA continue. No commit, push, PR, deployment or external write has occurred.

## Local delivery — 20 September 2026

Current delivery and reproducible verification are recorded in [DELIVERY.md](DELIVERY.md). The 05:07 production build on port 8081 includes all 62 scene entries, the river-regime Float32/NaN correction, reviewed script-to-step synchronisation, responsive model framing, compact river labels, collapsed advanced map controls, selected-hour weather wind markers, and a square mobile Earth-motion view. Typecheck/build and 82 focused tests passed. The science test entry point is now scripts/test-science.mjs and works after Git commits as well as before.

All 62 labs were mount-checked on desktop and mobile. GPlates data-dependent loading was allowed to complete before visual checks. Original-diagram contact-sheet findings and the three subsequent glossary corrections were resolved and rechecked. Double-provider offline map fallback, online retry, actual 72-hour data, 429 recovery, teacher print and the main mobile paths were exercised. The latest phone weather markers distinguish A/B, align the chosen UTC hour, and remove B cleanly; Earth-motion renders a complete globe at 333 x 333 instead of clipping its sides. Full 62-model independent scientific certification is not implied by the mount check; the required eight have separate interaction/visual review.

No commit, push, PR, deployment, or production database change was made. The preview is local. Earlier pending-check notes above are historical; see the final delivery report for limitations and exact check coverage.
