# Coastal rock surface correction — 20 September 2026

## Problem and change

The public headland had regular dark stripes and long triangular folds around the arch, resembling stretched fabric. Its extruded front caps had large, sparse triangles; displacing their boundary vertices without retessellating the caps exposed fan-shaped creases. A periodic bedding shader, nonphysical screen-space normal adjustment and separate line overlays amplified the effect. A detached grass cover also crossed the rock surface.

- `src/labs/coasts/cliff-geometry.ts`: weld the solid, subdivide long edges consistently across adjacent faces, then apply a continuous non-periodic weathering field. The arch has a real opening, finite normals, watertight faces and a solid roof. No beveled triangle fan remains. Arch: 11,388 vertices / 22,776 triangles; cave front: 6,229 / 12,458.
- `src/labs/coasts/coastal-rock.tsx`: photographed rock albedo, surface-height and roughness maps; three-direction projection avoids stretched cap UVs. Randomised sampling phase prevents a visibly tiled grid. Surface-height gradients use Three's surface-gradient bump mapping instead of adding arbitrary screen-direction vectors. The wet foot is darker.
- `src/labs/coasts/coast.tsx`: remove detached cover and drawn stripes, refine irregular outlines, distribute grass with decorrelated coordinates and place it on the actual weathered top. Preserve cave back wall, arch opening, separate stack and stump, timing controls, rotation, Ctrl + wheel zoom and teaching labels. Beach transport and spit geometry are unchanged.

## Asset provenance

`public/textures/pbr/rock_face_{diff,disp,rough}.webp`: [Rock Face, Poly Haven](https://polyhaven.com/a/rock_face), Greg Zaal (photography), Dario Barresi (processing), CC0. Original 2048 × 2048 maps verified against the publisher's MD5 values; converted at the same resolution to WebP quality 90. Combined size: 1,005,368 bytes. Source URLs, original MD5 values, output dimensions and SHA-256 values are recorded in `rock_face.source.json`.

These are photographed material surfaces on a constructed teaching model, not a field photograph or a reconstruction of a named headland. Texture patch scale uses the publisher's 2.4 m width and the existing common 10 m scene scale. No new AI images or placeholder diagrams.

## Verification

- TypeScript check and production build.
- `node --experimental-strip-types scripts/test-coastal-geometry.mjs`: both incident faces agree on every edge; no degenerate triangles; finite positions/normals; one through-hole retained; sample sight lines pass through the arch while roof sight lines intersect solid rock; geometry is bounded for mobile.
- Development browser: all four stages, zoomed front view, orbit to sides/back, real cave back wall, clear arch opening, no visible fabric folds. No console errors.
- Mobile 390 × 844: full model visible, no horizontal overflow, controls remain usable.
- Fresh production preview on port 8081: headland loads to a complete frame; Beach transport and Spit and bay also render; no console errors. Loading progress is shown while resources arrive.
- Public alias: updated headland visibly rendered, loading indicators cleared, zero broken images and no console errors. All three published texture files and their source sidecar match local bytes exactly; HTTP 200. Evidence: `coastal-rock-public-verification.json`.

## Preview

Open `/lab/coasts` and select Rocky headland. Compare Cave, Arch, Stack and Stump; drag to rotate and use Ctrl + wheel to inspect the surface close up. Switch to Beach transport or Spit and bay to check the adjacent modes. Resource preparation remains behind the existing loading progress view.

No shared scene, navigation, brand, teaching taxonomy, About or Privacy changes. Original `terralens.grok.me` is untouched; release targets the authorised `terralens-kohl.vercel.app` alias.

## Release

Production READY: `dpl_cj8d7WoCPTQ2cZVvnFdciFmGe24G`.

- Public: https://terralens-kohl.vercel.app/lab/coasts
- Immutable: https://terralens-92ab1sloj-harryxin0919s-projects.vercel.app
- Prior production, retained for rollback: `dpl_J8Za4VwgJk3juc8dYZYZ3JhuEaET` / https://terralens-47rrrhgd4-harryxin0919s-projects.vercel.app
- Logs: `coastal-rock-build.log`, `coastal-rock-typecheck.log`, `coastal-rock-geometry.log`, `coastal-rock-vercel-production.log`.

No Git commit or push was made. Existing worktree changes were preserved.
