# Geolens

Free geography and Earth-science teaching site, mainly for US students: 62 interactive 3D labs, case studies, teacher notes, a glossary, an atlas and weather tools. Deployed on Vercel at https://terralens-kohl.vercel.app. No accounts, no database, no API keys.

## Commands

```bash
npm run dev        # http://localhost:8080 (copies the MapLibre worker first)
npm run typecheck
npm run lint       # must report 0 errors; warnings are tolerated
npm test           # node --test over scripts/**/*.test.mjs
npm run build      # Nitro, Vercel preset, output in .vercel/output/
npm run preview    # http://127.0.0.1:8081
```

Run typecheck, lint, test and build before pushing.

## Layout

- `src/routes/` – TanStack Start file routes. `lab.$slug.tsx` is the shared lab player.
- `src/labs/<slug>/scene.tsx` – one 3D scene per lab, lazily registered in `src/labs/registry.ts`. Scenes render inside `ScienceStudio` (`src/labs/shared/science-kit.tsx`), which auto-fits the camera, and report numbers through `ScienceReadout`.
- `src/lib/labs/content.json` – lab metadata, steps, quiz questions, glossary terms and teacher notes. Quiz `answer` is a zero-based index into `choices`. Glossary definitions live only in `scripts/glossary-definitions.json`.
- `scripts/vite-lab-content.mjs` serves content.json in pieces so each page downloads only what it shows: `LABS`/`LAB_BY_SLUG` in `src/lib/labs/catalog.ts` are summaries (`LabSummary`); a page that shows a lesson gets it from `loadLab(slug)` in its route loader. Never import content.json from page code (`scripts/route-payload.test.mjs` checks).
- `src/lib/labs/standards.ts` – the curriculum standards labs align to (frameworks, codes, short titles). Each lab's `standards` in content.json lists their IDs; `/teachers/standards` shows every lab by standard.
- `src/lib/*-science.ts` – small physical models; each has tests in `scripts/`.
- `src/lib/photo-assign.ts` – which verified photo appears where. List pages show cards from `src/lib/photo-cards.ts` (image and alt text only) and case summaries from `src/lib/case-index.ts`, both built by `scripts/vite-card-data.mjs`; only pages that show a figure's caption and credit use `src/lib/figures.ts`, `src/lib/trip-photos.ts` or the full `src/lib/cases.ts`.
- `public/` – photos, GLB models, textures, map data, fonts.
- `server/middleware/security-headers.ts` – CSP and `X-Robots-Tag`; add any new external origin to the CSP.
- `server/routes/api/enso.ts` – cached proxy for NOAA CPC's ENSO status (CPC sends no CORS headers). Tides (NOAA CO-OPS) and river gauges (USGS Water Data) are fetched from the browser in `src/components/lab/live-data.tsx`. Locally, run the preview with `NODE_USE_ENV_PROXY=1` if the container needs an HTTPS proxy.
- `src/lib/hand-in.ts` – hand-in code format; `HANDIN_LABS` is append-only, so never reorder it.

## Conventions

- American English ("toward", "color", "meter"). Geolens is written mainly for US students aged 11–18 and their teachers, but everyone can use it: lead with US examples and curricula (NGSS, AP Environmental Science, high-school Earth science), and keep UK material (KS3, GCSE, A-level, UK case studies) as a secondary option.
- Standards: list a lab's standards US first (NGSS, APES, APHG, C3), then England's; add a standard to the registry before using it, and tag only what the lab really teaches. A lab with an NGSS high-school expectation also needs the "HS Earth Sci" stage (`scripts/standards.test.mjs` checks).
- Scientific honesty: label exaggerated scales and schematic geometry, and never present an illustration as an observation.
- Quiz questions: spread correct answers across positions, keep the correct option about as long as the distractors, and make every distractor a believable misconception (`scripts/quiz-balance.test.mjs` checks). Fix a question by rewriting option text, never by reordering choices: hand-in codes store answer indices.
- Photos: only use files in `public/photos/verified/` with a record in `scripts/verified-photo-sources.json`. Keep that file, `public/photos/manifest.json` and the assignments in step. Never assign another country's landscape to an atlas place.
- 3D: R3F + drei. Every lab model is built procedurally in its scene; only the Mars and Saturn GLBs in `public/models/scientific/` are loaded (Meshopt + WebP via `scripts/optimize-glbs.sh`; no Draco).
- Shared look: `LabLights` (camera-following key light), `TerrainMaterial` (photo used as brightness detail only, so pass the color you want), `RockMaterial` (`desaturate`, `strata`), `ScienceStudio` (`space` backdrop, `ground` shadow, `horizon` camera limit). Earth globes take `lighting="viewer"` when day and night are not the subject.
- Animation: lab time `t` changes every frame while a lab plays. Read store fields with `useLabState("params", …)` (never the whole store), and name `t` only when the render really depends on it. Motion that only moves, turns or scales something goes in `useLabFrame` (`src/labs/tick.ts`) or `TimeMarkers`; the canvas redraws on scrubs while paused. `Tag`, `Arrow` and `GuideLine` are memoized by value, so build their point lists once (`useMemo`) or pass equal arrays.
- Formatting: Prettier (`.prettierrc`), 100-column lines.
