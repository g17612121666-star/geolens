/**
 * Small data modules for pages that list labs, cases and trips, derived at build time (and on
 * every change in development) from the files editors keep: the photo register, the photo
 * assignments, the case studies and the field trips. A list page then shows its cards without
 * downloading every photo credit and every case-study text.
 *
 *   virtual:photo-cards  CARDS: image address and alt text for each lab, realm, teacher-note and
 *                        case cover, and for each field-trip photo
 *   virtual:case-index   CASE_SUMMARIES (and by region) and REGIONS, without the case texts
 *
 * The bundled photo register also drops each record's download `url`, which only the download
 * scripts use.
 */
import ts from "typescript";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const at = (path) => join(ROOT, path);
const REGISTER = at("scripts/verified-photo-sources.json");
const SOURCES = [
  REGISTER,
  at("src/lib/verified-photos.ts"),
  at("src/lib/photo-assign.ts"),
  at("src/lib/cases.ts"),
  at("src/lib/field-trips.ts"),
];
const CARDS = "virtual:photo-cards";
const CASES = "virtual:case-index";

/**
 * Evaluates a TypeScript data module and what it imports, the way the tests load them: types are
 * stripped, `@/` means src/, JSON is parsed. Data modules only; nothing here touches a browser.
 */
export function loadData(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  if (file.endsWith(".json")) {
    module.exports = JSON.parse(readFileSync(file, "utf8"));
    return module.exports;
  }
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const require = (spec) => {
    const base = spec.startsWith("@/") ? at(`src/${spec.slice(2)}`) : resolve(dirname(file), spec);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return loadData(candidate, cache);
    }
    throw new Error(`${spec} (from ${file}) is not a data module`);
  };
  new Function("require", "module", "exports", outputText)(require, module, module.exports);
  return module.exports;
}

const card = (photo) => (photo ? { src: photo.src, alt: photo.alt } : undefined);
const cards = (slots) =>
  Object.fromEntries(Object.entries(slots).map(([key, slot]) => [key, card(slot)]));

/** Image address and alt text for every cover a list shows, and for every field-trip photo. */
export function photoCards() {
  const cache = new Map(),
    assign = loadData(at("src/lib/photo-assign.ts"), cache),
    { VERIFIED_PHOTOS } = loadData(at("src/lib/verified-photos.ts"), cache),
    { FIELD_TRIPS } = loadData(at("src/lib/field-trips.ts"), cache);
  const tripPhotos = FIELD_TRIPS.flatMap((trip) => trip.stops.map((stop) => stop.photo));
  return {
    lab: cards(assign.LAB_COVER),
    realm: cards(assign.REALM_COVER),
    teacher: cards(assign.TEACHER_HERO),
    case: cards(assign.CASE_COVER_EXTRA),
    photo: Object.fromEntries(tripPhotos.map((id) => [id, card(VERIFIED_PHOTOS[id])])),
  };
}

/** What lists and filters need about each case study, in the case module's own orders. */
export function caseIndex() {
  const { CASES: all, CASES_BY_REGION, REGIONS } = loadData(at("src/lib/cases.ts"));
  const summary = ({ slug, title, place, region, lede, labs }) => ({
    slug,
    title,
    place,
    region,
    lede,
    labs,
  });
  return {
    CASE_SUMMARIES: all.map(summary),
    CASE_SUMMARIES_BY_REGION: CASES_BY_REGION.map(summary),
    REGIONS,
  };
}

export function cardData() {
  return {
    name: "geolens-card-data",
    enforce: "pre",
    resolveId(id) {
      if (id === CARDS || id === CASES) return `\0${id}`;
    },
    load(id) {
      if (id.split("?")[0] === REGISTER && !/[?&](raw|url)\b/.test(id)) {
        // Still JSON, so Vite's JSON handling applies; only the download address is dropped.
        const records = JSON.parse(readFileSync(REGISTER, "utf8"));
        return JSON.stringify(records.map(({ url: _download, ...record }) => record));
      }
      if (id === `\0${CARDS}`) {
        for (const file of SOURCES) this.addWatchFile(file);
        return `export const CARDS = ${JSON.stringify(photoCards())};`;
      }
      if (id === `\0${CASES}`) {
        this.addWatchFile(at("src/lib/cases.ts"));
        return Object.entries(caseIndex())
          .map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};`)
          .join("\n");
      }
      return null;
    },
    hotUpdate({ file, modules }) {
      if (!SOURCES.includes(file)) return;
      const graph = this.environment.moduleGraph,
        derived = [...modules];
      for (const id of [`\0${CARDS}`, `\0${CASES}`]) {
        const mod = graph.getModuleById(id);
        if (mod) {
          graph.invalidateModule(mod);
          derived.push(mod);
        }
      }
      return derived;
    },
  };
}
