# River refinement — 2026-09-20

User feedback: water appeared too scarce, banks looked unnatural, water looked like a bright strip, and trees formed bank-side rows.

## Changes

- Fixed the geometric cause: the former independently sized water ribbon did not reach the channel banks. One bed cross-section now determines terrain, water depth and both wet edges.
- Increased visible channel breadth, replaced uniform steep valley walls with an open lower-course floodplain and gently rising valley sides, and distinguished gentler inside-bend margins from steeper outside banks.
- Kept stage changes qualitative. No calculated discharge rating, erosion rate or flood footprint is implied. Stage stays below the illustrative bankfull rim throughout the 0.2–1.6 control range.
- Added a dedicated river material: depth-dependent colour and shallow transparency, small advected optical ripples, restrained highlights and surface flow streaks. All motion reads the reversible lesson time.
- Scattered mixed woodland, shrubs and grass into irregular patches; roots avoid the largest wet channel. Heights vary. Gravel positions are irregular rather than parallel rows.
- Retained the concave long profile, discharge slider, labels, projection layout and vertical exaggeration toggle. Both views disclose enlarged channel breadth and vegetation.

## Scope

`rivers/scene.tsx`, `rivers/vegetation.ts`, new `rivers/water-material.tsx`, the river-specific functions in shared `river-terrain.ts`, and the corresponding lesson text. The shared waterfall ribbon implementation was preserved.

## Verification

- Type check passed during development.
- 102 scientific regression checks passed, including stage/bed intersection on both banks, agreement with the actual indexed terrain triangles, submerged section, expanding wetted width, upward finite geometry, equal-relief footprint, dry rooted woodland, and the existing waterfall/glacier tests.
- Development desktop: rendered; rotation, low/high discharge, backward time scrubbing and equal-relief view checked. No captured runtime errors.
- Production build and 390×844 mobile view rendered; no horizontal overflow or captured runtime errors. Details and wider verification limits are in ROUND2-DELIVERY.md.

This remains an idealised educational landscape, not a surveyed river or a hydraulic forecast.
