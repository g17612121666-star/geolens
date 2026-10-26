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
- `src/lib/labs/content.json` – lab metadata, steps, quiz questions, glossary and teacher notes. Quiz `answer` is a zero-based index into `choices`.
- `src/lib/*-science.ts` – small physical models; each has tests in `scripts/`.
- `src/lib/photo-assign.ts` – which verified photo appears where.
- `public/` – photos, GLB models, textures, map data, fonts.
- `server/middleware/security-headers.ts` – CSP and `X-Robots-Tag`; add any new external origin to the CSP.

## Conventions

- American English ("toward", "color", "meter"). Geolens is written mainly for US students aged 11–18 and their teachers, but everyone can use it: lead with US examples and curricula (NGSS, AP Environmental Science, high-school Earth science), and keep UK material (KS3, GCSE, A-level, UK case studies) as a secondary option.
- Scientific honesty: label exaggerated scales and schematic geometry, and never present an illustration as an observation.
- Quiz questions: spread correct answers across positions, keep the correct option about as long as the distractors, and make every distractor a believable misconception.
- Photos: only use files in `public/photos/verified/` with a record in `scripts/verified-photo-sources.json`. Keep that file, `public/photos/manifest.json` and the assignments in step. Never assign another country's landscape to an atlas place.
- 3D: R3F + drei. Every lab model is built procedurally in its scene; only the Mars and Saturn GLBs in `public/models/scientific/` are loaded (Meshopt + WebP via `scripts/optimize-glbs.sh`; no Draco).
- Shared look: `LabLights` (camera-following key light), `TerrainMaterial` (photo used as brightness detail only, so pass the color you want), `RockMaterial` (`desaturate`, `strata`), `ScienceStudio` (`space` backdrop, `ground` shadow, `horizon` camera limit). Earth globes take `lighting="viewer"` when day and night are not the subject.
- Formatting: Prettier (`.prettierrc`), 100-column lines.
