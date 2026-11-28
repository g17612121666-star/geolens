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

Run typecheck, lint, test and build before pushing. GitHub Actions runs the same four on every pull request and on `main` (`.github/workflows/checks.yml`).

## Layout

- `src/routes/` – TanStack Start file routes. `lab.$slug.tsx` is the shared lab player.
- `src/labs/<slug>/scene.tsx` – one 3D scene per lab, lazily registered in `src/labs/registry.ts`. Scenes render inside `ScienceStudio` (`src/labs/shared/science-kit.tsx`), which auto-fits the camera, and report numbers through `ScienceReadout`.
- `src/lib/labs/content.json` – lab metadata, steps, quiz questions, glossary terms and teacher notes. Quiz `answer` is a zero-based index into `choices`. Glossary definitions live only in `scripts/glossary-definitions.json`.
- `scripts/vite-lab-content.mjs` serves content.json in pieces so each page downloads only what it shows: `LABS`/`LAB_BY_SLUG` in `src/lib/labs/catalog.ts` are summaries (`LabSummary`); a page that shows a lesson gets it from `loadLab(slug)` in its route loader. Never import content.json from page code (`scripts/route-payload.test.mjs` checks).
- `src/lib/labs/standards.ts` – the curriculum standards labs align to (frameworks, codes, short titles). Each lab's `standards` in content.json lists their IDs; `/teachers/standards` shows every lab by standard.
- `src/lib/labs/courses.ts` – the teacher Courses page (`/teachers/courses`): each course's units and the standards in them, in teaching order.
- `public/labs/thumbs/` – the model pictures on lab cards, taken by `scripts/capture-lab-thumbs.mjs <base-url> <slug>` from a running site; retake a lab's picture when its model changes. `public/home/earth-*.webp` is the home globe's still picture (`scripts/capture-home-earth.mjs`). The home page's real-place model pictures are in `public/home/models/` (`scripts/capture-home-models.mjs`), and its earthquake map's land and plate boundaries in `public/home/world-map.json` (`scripts/make-home-map.mjs`, Equal Earth projection in `src/lib/equal-earth.ts`).
- `src/lib/*-science.ts` – small physical models; each has tests in `scripts/`.
- `src/lib/photo-assign.ts` – which verified photo appears where. List pages show cards from `src/lib/photo-cards.ts` (image and alt text only) and case summaries from `src/lib/case-index.ts`, both built by `scripts/vite-card-data.mjs`; only pages that show a figure's caption and credit use `src/lib/figures.ts`, `src/lib/trip-photos.ts` or the full `src/lib/cases.ts`.
- `public/` – photos, GLB models, textures, map data, fonts.
- `server/middleware/security-headers.ts` – CSP and `X-Robots-Tag`; add any new external origin to the CSP.
- `server/routes/api/enso.ts` – cached proxy for NOAA CPC's ENSO status (CPC sends no CORS headers). Tides (NOAA CO-OPS) and river gauges (USGS Water Data) are fetched from the browser in `src/components/lab/live-data.tsx`. Live weather (`src/lib/weather.ts`) uses the National Weather Service's forecast grid for US places and Open-Meteo (free for non-commercial use) elsewhere or when the NWS does not answer. Locally, run the preview with `NODE_USE_ENV_PROXY=1` if the container needs an HTTPS proxy.
- `src/lib/hand-in.ts` – hand-in code format; `HANDIN_LABS` is append-only, so never reorder it.
- Spanish: `src/lib/i18n-es.ts` translates interface text keyed by the English (`useT()` from `src/lib/i18n.ts`); a lab's Spanish text, including its 3D labels and results, is `src/lib/labs/es/<slug>.json`, loaded only when a reader picks Spanish. Every lab has one, and a new lab needs one too (`scripts/spanish-labs.test.mjs`); without it a lab would stay wholly English under a short Spanish notice (`LangScope`).

## Conventions

- American English ("toward", "color", "meter"). Geolens is written mainly for US students aged 11–18 and their teachers, but everyone can use it: lead with US examples and curricula (NGSS, AP Environmental Science, high-school Earth science), and keep UK material (KS3, GCSE, A-level, UK case studies) as a secondary option.
- Standards: list a lab's standards US first (NGSS, APES, APHG, C3, TEKS), then England's; add a standard to the registry before using it, and tag only what the lab really teaches. Texas TEKS codes follow the Texas Administrative Code: `8.10C` is grade 8, knowledge and skills 10, expectation C; `ESS.8E` is Earth Systems Science and `WG.4B` World Geography Studies. A lab with an NGSS high-school expectation also needs the "HS Earth Sci" stage (`scripts/standards.test.mjs` checks).
- Scientific honesty: label exaggerated scales and schematic geometry, and never present an illustration as an observation.
- Quiz questions: spread correct answers across positions, keep the correct option about as long as the distractors, and make every distractor a believable misconception (`scripts/quiz-balance.test.mjs` checks). Fix a question by rewriting option text, never by reordering choices: hand-in codes store answer indices.
- Spanish: neutral Latin American Spanish with "tú" and US number style (6,371 km; 29.5 días). A Spanish lab file mirrors its English lab: the same steps, questions and choices in the same order and every control key, but no answers, which come from the English lab so hand-in codes still match (`scripts/spanish-labs.test.mjs`). Every literal `t("…")`, and every `msg("…")` that marks text defined outside a component, needs an entry in `i18n-es.ts` (`scripts/i18n.test.mjs`); in scenes, where `t` is lab time, name the translator `tr`. The page is `lang="en"` except while it shows a translated lab; Spanish parts carry `lang="es"`.
- Photos: only use files in `public/photos/verified/` with a record in `scripts/verified-photo-sources.json`. Keep that file, `public/photos/manifest.json` and the assignments in step. Never assign another country's landscape to an atlas place.
- 3D: R3F + drei. Every lab model is built procedurally in its scene; only the Mars and Saturn GLBs in `public/models/scientific/` are loaded (Meshopt + WebP via `scripts/optimize-glbs.sh`; no Draco).
- Shared look: `LabLights` (camera-following key light), `TerrainMaterial` (photo used as brightness detail only, so pass the color you want), `RockMaterial` (`desaturate`, `strata`), `ScienceStudio` (`space` backdrop, `ground` shadow, `horizon` camera limit). Earth globes take `lighting="viewer"` when day and night are not the subject.
- Page surfaces: `.ink-band` (`src/styles.css`) is the deep green of the footer and of the home page's hero and earthquake map, the same in both themes; it re-scopes the color tokens for everything inside it. The header turns ink while an element marked `data-ink-top` is under it (`src/lib/ink-header.ts`). Home page cards share one style: `rounded-[10px]`, a hairline border, `bg-basalt`, and `zoom-card`/`zoom-img` for the hover.
- Animation: lab time `t` changes every frame while a lab plays. Read store fields with `useLabState("params", …)` (never the whole store), and name `t` only when the render really depends on it. Motion that only moves, turns or scales something goes in `useLabFrame` (`src/labs/tick.ts`) or `TimeMarkers`; the canvas redraws on scrubs while paused. `Tag`, `Arrow` and `GuideLine` are memoized by value, so build their point lists once (`useMemo`) or pass equal arrays. A `<shaderMaterial>` copies its `uniforms` prop when it mounts; if the values change later, give it `ref={liveUniforms(uniforms)}` (`src/lib/shader-uniforms.ts`).
- Formatting: Prettier (`.prettierrc`), 100-column lines.
