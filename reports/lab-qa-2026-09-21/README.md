# Lab audit — 21 September 2026

Browser: Codex in-app browser, separate background tab. Measured viewport: 1280 × 720. Local development server: http://localhost:8085. URLs were collected from the rendered Explore directory.

All 62 lab routes reached `data-lab-entry="ready"`, displayed a named heading and a nonzero canvas, and showed no application error. Browser console error log was empty. Several CDP navigation deadlines occurred; each affected destination was recovered and verified. Carbon-cycle cold load was revisited successfully. This is a route-load and representative interaction audit, not exhaustive correctness testing of every parameter combination.

## Representative checks

- Carbon cycle: Photosynthesis selection updated the visible flux; fossil-fuel slider keyboard change 0.20 → 0.25 changed burned carbon from 80 → 100 Pg while the total stayed 12000 Pg.
- Check tab: an incorrect answer showed “Take another look”; correcting it showed “That’s right.”
- Teacher panel and Controls dialog opened and displayed their content. Controls correctly described Ctrl + scroll for zoom.
- Screenshots inspected during this audit: atmosphere, contours, eclipses, glaciers, river deposition, river regime, soil erosion and storm surge. Saved image files: soil-erosion.png and storm-surge.png.
- Short-screen issue found and fixed: redundant objective/instructions used too much vertical space. Desktop short screens now show the main title; instructions remain in the guide.
- Eclipse initial physical overview appeared too small at this viewport. The root agent visually verified the revised default: it opens the existing lunar shadow close-up, labels it “Lunar shadow close-up” and provides a 261 px high canvas at 1280 × 720.
- Most canvases after the fix are about 300–360 px high. Pages with additional educational charts or rich control rows intentionally use less height (for example river regime 225 px, hydrograph 205 px, solar system 213 px).
- All 245 Check explanations were rewritten in `scripts/geolens-check-feedback.json`, validated against the existing question counts, and applied by the root agent. The ambiguous eclipse question 4 prompt was also corrected.
- Final root-agent visual recheck at 1280 × 720: atmosphere 317 px, climate 268 px and coasts 261 px canvas heights. These measurements supersede the initial pre-fix measurements; atmosphere line and transparent-face contrast was also strengthened while retaining its geometry.

## Route results

| Route | Result | Canvas CSS px |
|---|---|---|
| atmosphere-layers | PASS, final root recheck | 856 × 317 |
| carbon-cycle | PASS | 856 × 337 |
| climate-types | PASS, final root recheck | 856 × 268 |
| coasts | PASS, final root recheck | 856 × 261 |
| continental-drift | PASS | 856 × 249 |
| contours | PASS | 856 × 293 |
| cyclone-anticyclone | PASS | 856 × 337 |
| drainage-basin | PASS | 856 × 353 |
| rotation | PASS | 856 × 353 |
| energy-budget | PASS | 856 × 337 |
| earth-interior | PASS | 856 × 357 |
| earthquakes | PASS | 856 × 337 |
| eclipses | PASS | 856 × 261 |
| enso | PASS | 856 × 337 |
| folds-faults | PASS | 856 × 337 |
| fronts | PASS | 856 × 337 |
| geologic-time | PASS | 856 × 315 |
| glaciers | PASS | 856 × 333 |
| graticule | PASS | 856 × 357 |
| grid-references | PASS | 856 × 357 |
| groundwater | PASS | 856 × 337 |
| hotspots | PASS | 856 × 317 |
| isostasy | PASS | 856 × 341 |
| karst | PASS | 856 × 337 |
| landform-types | PASS | 856 × 341 |
| map-projections | PASS | 856 × 357 |
| mass-movement | PASS | 856 × 317 |
| moon-phases | PASS | 856 × 225 |
| ocean-currents | PASS | 856 × 317 |
| periglacial | PASS | 856 × 337 |
| plate-boundaries | PASS | 856 × 295 |
| rain-shadow | PASS | 856 × 337 |
| river-capture | PASS | 856 × 337 |
| river-deposition | PASS | 856 × 281 |
| river-erosion | PASS | 856 × 317 |
| rivers | PASS | 856 × 353 |
| river-hydrology | PASS | 856 × 225 |
| rock-cycle | PASS | 856 × 304 |
| seafloor-spreading | PASS | 856 × 337 |
| soil-catena | PASS | 856 × 341 |
| soil-erosion | PASS | 856 × 337 |
| soil-profile | PASS | 856 × 341 |
| soil-texture | PASS | 856 × 357 |
| solar-altitude | PASS | 856 × 353 |
| solar-system | PASS | 856 × 213 |
| hydrograph | PASS | 856 × 205 |
| storm-surge | PASS | 856 × 341 |
| sun-earth | PASS | 856 × 279 |
| thermal-circulation | PASS | 856 × 337 |
| thermohaline | PASS | 856 × 304 |
| three-cell | PASS | 856 × 337 |
| tides | PASS | 856 × 337 |
| tropical-cyclone | PASS | 856 × 241 |
| tsunami | PASS | 856 × 241 |
| universe-scale | PASS | 856 × 337 |
| volcanoes | PASS | 856 × 297 |
| water-cycle | PASS | 856 × 281 |
| weathering | PASS | 856 × 337 |
| seasons | PASS | 856 × 305 |
| wilson-cycle | PASS | 856 × 341 |
| aeolian | PASS | 856 × 317 |
| wind | PASS | 856 × 337 |
