# TerraLens — environment rendering and loading, 20 September 2026

Public destination: https://terralens-kohl.vercel.app/ (same authorised Vercel project). Original terralens.grok.me is unchanged.

## Implemented scope
- All 62 `/lab/:slug` routes use a common entry gate. The complete scene mounts behind the gate; textures/data resolve, shader compilation finishes, and two animation frames allow camera fitting and rendering before the lesson is revealed. Later parameter changes display a progress bar inside the canvas while controls remain usable.
- Shared ClientCanvas also covers 3D tools/home. Resource percentages count completed, discovered loader items, not bytes or a fabricated overall percentage. Unknown module/preparation phases are indeterminate. A slow-load retry appears after 45 seconds. Failed scenes expose a reload-based retry and keep notes/controls available. Ordinary page scrolling and Ctrl + wheel zoom are preserved.
- Intent preloading starts a lab module when a visitor hovers or focuses its link; the default continental-drift snapshot is warmed too. Save-Data connections skip speculative loading. No up-front download of 62 scenes or all ages.
- Continental drift/plate reconstruction: pre-render 25 historical maps directly from the retained EarthByte/Müller 2019 GeoJSON into 4096 × 2048 lossless WebP. Modern day/bump textures load only at 0 Ma. No browser-side 4K canvas rasterisation or coastline line-mesh construction. Original coordinates/source files are retained and hashed. The 10 Ma selection and teaching limitations are unchanged. Present-day plate-boundary data now participate in Suspense/loading/error handling.
- Earth day/night/bump textures start together instead of serial hook suspension. WebGL capability is tested once per document rather than twice for each lab canvas.
- Volumetric cloud density with sun-side lighting, softer wisps and a flatter condensation base replaces overlapping sphere puffs in Water cycle, Fronts, Rain shadow and ENSO. Tropical cyclone uses soft density fragments with the existing ideal-vortex motion, eye/eyewall and slice semantics; fragments are visual structure, not simulated rainfall.
- Coasts: weathered sedimentary surfaces and irregular rock edges; a connected headland with ground cover; depth-dependent water colour/opacity, small reversible wave displacement, shallow breaking foam and wet margins. Beach/spit land uses photographed 2K beach diffuse/normal/roughness maps. Grass is clustered, and the groyne has individually varied members. Cave/arch/stack/stump, beach drift/groyne, spit extent and True scale are retained. These remain illustrative waves and selected morphology, not a solved coastal sediment budget.
- Shared water tone now varies subtly with the same lesson clock. Dedicated river water is retained.
- Restrained heading/lead entry motion preserves existing typefaces and formula fonts. Reduced motion disables text movement and the loading sweep.
- Common progress treatment also covers basemaps, weather, map overlay data, figures/cover photographs and embedded video-player loading.

## New assets and sources
- `public/geo/reconstruction/coastlines-{10..250}-4k.webp`: 25 files, 11,360,348 bytes combined; source GeoJSON totals 32,776,564 bytes uncompressed. This is a disk-size comparison, not a measured network speed-up: HTTP compression differs by format. At 200 Ma the runtime map is 427,556 bytes and does not require the old 1,372,347-byte modern-day texture, 378,243-byte bump texture or 1,217,425-byte GeoJSON.
- Generator: `scripts/bake-reconstructions.mjs`; manifest: `public/geo/reconstruction/texture-manifest.json`. Exact source SHA256 and image dimensions verified for all 25 maps.
- Cartographic provenance/licence: https://www.earthbyte.org/gplates-2-4-software-and-data-sets/ ; original acquisition references in `public/geo/reconstruction/sources.json`. Reconstructed modern coastline shapes are explicitly distinguished from ancient shorelines and vegetation.
- `public/textures/pbr/aerial_beach_01_{diff,nor_gl,rough}.jpg`: Rob Tuytel / Poly Haven, CC0, 2048 × 2048. Original downloads verified against publisher MD5s; licence/source sidecar: `aerial_beach_01.source.json`. Source: https://polyhaven.com/a/aerial_beach_01 . These are photographed PBR surfaces; no generated field photograph.
- Cloud teaching reference: https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/types-of-clouds . Rendered cloud volumes illustrate condensed droplets/ice, not invisible water vapour or observed weather data.

## Necessary shared changes
`ClientCanvas`, `LabStudio`, scene registry, lab entry boundary, SiteShell intent preloading and text animation; common photo/video/loading components; map/weather loading indicators; coastal material option in shared terrain. Continental drift's old explanatory text incorrectly described straight interpolation/extruded continents and a playback control; it now describes the actual GPlates snapshots and age slider. Navigation wording, brand, About/Privacy and curriculum tags were not redesigned.

## Verification
- TypeScript check passed.
- 102 existing science and interaction regression checks passed (`reports/round3-science-tests.log`).
- All 25 raster dimensions and source checksums verified.
- Production build passed; final smoke checks and deployment details appended below.
- Browser failure injection: blocked the 200 Ma map, observed the explicit Retry 3D view state with usable notes, restored the request and successfully retried. Test network blocking/cache overrides were restored.
- Continental drift: 200 Ma, 0 Ma and 250 Ma render; modern textures are absent from the initial 200 Ma resource list. Do not interpret source-file reduction as a device-independent timing claim.

## Reproduce locally
1. `npm.cmd run dev` serves http://127.0.0.1:8080 ; `npm.cmd run build` then `npm.cmd run preview -- --host 127.0.0.1 --port 8081` tests the production build. Restart the preview process after rebuilding.
2. Open `/lab/continental-drift` in a fresh tab. The entry page must remain until the complete map is visible. Switch age to 0 and 250 Ma; changing ages may show canvas progress without hiding the slider. A 200 Ma start should request a single historical WebP and the shared lighting resource, not earth-day/bump or historical GeoJSON.
3. Compare `/lab/coasts` headland stages, Beach transport and Spit and bay. Scrub Process, toggle Groyne and True scale. Check foam/water respond without changing the sediment accounting claims.
4. Open `/lab/water-cycle`, `/lab/fronts`, `/lab/rain-shadow`, `/lab/enso`, `/lab/tropical-cyclone`; play/pause/scrub and inspect cloud form, labels and the cyclone slice.
5. Test 390 × 844 and desktop; reduce-motion preference; regular wheel versus Ctrl + wheel. Check `/tools/live-weather`, `/tools/map`, `/atlas`, `/explore` and the homepage card showcase for loading feedback and resolved assets.

## Coverage boundary
All 62 labs inherit the entry/progress fix. Rendering work this round concentrates on coasts and the cloud-bearing scenes, with additional shared water improvements. This is not a claim that every model was individually rebuilt or newly scientifically certified in this round.

## Release and completed checks
- Published successfully: `dpl_J8Za4VwgJk3juc8dYZYZ3JhuEaET`, READY, production.
- Public alias: https://terralens-kohl.vercel.app/ ; immutable deployment: https://terralens-47rrrhgd4-harryxin0919s-projects.vercel.app/ . Previous production `dpl_5Krr5NZNKweeRBUU7GdVdUjoZwDK` remains a rollback reference.
- Final build: 20 September 2026, 11:16:14 local; `reports/round3-release-build.log`.
- All 62 lab routes returned 200 with an entry gate and progress markup after restarting the preview server: `reports/round3-all-lab-routes.json`. This checks route rendering, not all 62 WebGL interactions.
- Browser scenes checked: Continental drift (200/0/250 Ma plus a blocked-resource/retry test), Coasts (headland, beach, spit extent), Water cycle, Fronts, Rain shadow, Tropical cyclone, Earth's interior and Seasons. All reached scene-ready; figures checked in these flows had no broken image.
- 390 × 844: Coasts beach/spit and Tropical cyclone rendered without horizontal overflow; changing spit extent updated the selected value and retained scene-ready.
- Reduced motion: Earth's interior rendered completely with heading animation `none`; after restoring the preference, Seasons reported `text-arrive`. The temporary viewport, blocked URL rule, cache override and emulated motion preference were reset.
- Local preview once kept obsolete server module references while a new build replaced its files. Restarting the preview fixed this; the full route check was rerun on the matching final version.
- Public HTTP checks: homepage, Explore, Coasts, Water cycle, Tropical cyclone, Continental drift, Live weather, Map studio and Atlas all 200, correct public canonical origin, no authentication wall. Published 200 Ma map and beach albedo hashes exactly match local files: `reports/round3-public-verification.json`.
- Public browser checks: Coasts and Tropical cyclone fully rendered, zero broken images and no unexpected public-page console errors in the observed flows. Loading failure errors recorded earlier were deliberately injected on localhost and are not production errors.
- No commit/push to the original GitHub repository; deployment uses the authorised linked Vercel project.

- Final follow-up fixes the reserved height of a pending figure so its progress bar cannot collapse. Final image component JS, historical map and beach albedo all match the public alias byte-for-byte. The first round-3 deployment `dpl_8niX9WeVrY7Ymx6AeKiWZ4FaPx4S` is an additional rollback point.
- Public Continental drift also reached scene-ready with zero broken images. Homepage globe reached scene-ready; the showcase had 124 cards (62 plus the seamless-loop copy), zero playback buttons, no broken images, and no observed public-page console errors.
