# Geolens

A free, English-language geography and Earth science website for students, teachers and school geography clubs. Explore 62 interactive 3D labs alongside case studies, teaching notes, a glossary, an atlas and live weather tools.

**Website:** [terralens-kohl.vercel.app](https://terralens-kohl.vercel.app/)

This repository contains the complete Geolens redesign, including the source code, photographs, textures, 3D models, map datasets, content, dependency lockfile and verification scripts. It continues the original TerraLens project; the existing website retains its original deployment address.

## Run locally

Use Node.js 22.12+ or Node.js 24 and npm.

```bash
git clone https://github.com/g17612121666-star/geolens.git
cd geolens
npm ci
npm run dev
```

The default development address is `http://localhost:8080`. To choose another port, run `npm run dev -- --port 8085`.

The site runs without a login, API key or database. Map tiles, forecasts and embedded videos need an internet connection. `npm run dev` and `npm run build` first copy the MapLibre worker from `node_modules` into `public/maplibre/` (ignored by Git).

## Check and build

```bash
npm run typecheck
npm run build
npm run preview
```

The production preview defaults to `http://127.0.0.1:8081`. Nitro generates Vercel Build Output API files in `.vercel/output/`.

Tests and lint:

```bash
npm test        # scientific-model and content tests in scripts/*.test.mjs
npm run lint
```

## Deploy to Vercel

With the Vercel CLI installed and an authorized account:

```bash
vercel link
npm run build
vercel deploy --prebuilt --prod
```

Choose the intended project when linking. Local Vercel account/project configuration, generated output, dependency folders, environment secrets and review-image caches are intentionally excluded from Git. They are not needed to reproduce the website from source.

## Project layout

| Directory | Contents |
| --- | --- |
| `src/routes/` | Website pages and shared document shell |
| `src/labs/` | Lab scenes, scientific geometry and shared 3D components |
| `src/lib/labs/content.json` | Reviewed lab metadata, objectives, questions and teaching copy |
| `src/lib/` | Scientific models, cases, glossary, atlas and weather logic |
| `public/` | All runtime photographs, textures, models, map datasets, fonts and icons |
| `scripts/` | Tests, content dictionaries, media preparation and build tooling |
| `server/` | Nitro middleware that sets security headers and search-indexing rules |
| `reports/` | Dated implementation, validation and source-review records |

## Add or update a lab

1. Update its metadata and teaching content in `src/lib/labs/content.json`. Glossary definitions are shared through `scripts/glossary-definitions.json`.
2. Add `src/labs/<slug>/scene.tsx` with a default export. Use the shared lab controls and `useLabTick()` for animation.
3. Register its lazy scene import in `src/labs/registry.ts`.
4. The shared `/lab/<slug>` route supplies the player. Put local runtime assets in `public/` and preserve their source and licence records.
5. Check the scientific behaviour, loading state, small-screen layout and production build before releasing.

## Photographs

Every photograph the site shows lives in `public/photos/verified/` and has a record in `scripts/verified-photo-sources.json` (source page, licence, credit, alt text and caption). `src/lib/photo-assign.ts` maps photos to labs, glossary terms, cases and realms; `scripts/atlas-photo-assignments.json` maps them to atlas places; `public/photos/manifest.json` feeds the image-credits page. When you add or remove a photo, update all of these together.

Source datasets that are only needed to regenerate site files are not committed. `scripts/fetch-reconstruction.py` re-downloads the GPlates coastline snapshots used by `scripts/bake-reconstructions.mjs`.

## Data and media credits

Sources include NASA, USGS, BGS, NOAA, the Met Office, Natural Earth, Open-Meteo and OpenStreetMap/OpenFreeMap. Individual assets have their own source and licence information; free access to the website does not replace those terms.

- [Image credits on the website](https://terralens-kohl.vercel.app/image-credits)
- [Geographic dataset sources](public/geo/SOURCES.md)
- [Texture sources](public/textures/pbr/SOURCES.md)
- [Media review](reports/geolens-media-review.md)

## Delivery records

- [Geolens redesign](reports/GEOLENS-DELIVERY.md)
- [September 2026 production release](reports/GEOLENS-RELEASE-2026-09-21.md)

Historical reports describe the checks performed on their recorded dates; they are not continuous availability guarantees.

## Stack

React 19, TypeScript, TanStack Start/Router, Vite, Nitro, Tailwind CSS, React Three Fiber/Three.js, drei, Zustand and MapLibre GL.
