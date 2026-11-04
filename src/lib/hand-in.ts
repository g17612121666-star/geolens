/**
 * Hand-in codes: a student's result for one lab packed into 10 characters, so a teacher can
 * collect results without accounts or a server. The code holds the lab, the first answer chosen
 * for each of the five quiz questions, the day, and whether the prediction and the written
 * explanation were completed. It never holds a name or any written text.
 *
 * Layout (48 bits, then a 2-bit pad to fill 10 base-32 characters):
 *   version 3 · lab 7 · answers 5 × 3 (0 = unanswered, 1–4 = choice) · day 13 · flags 2 · check 8
 * The check value catches typos; it is not a lock, so a determined student could forge a code.
 */

/** Append-only: a lab's number must never change once codes have been issued. */
export const HANDIN_LABS = [
  "seasons",
  "rotation",
  "moon-phases",
  "earth-interior",
  "plate-boundaries",
  "contours",
  "rivers",
  "water-cycle",
  "solar-system",
  "sun-earth",
  "universe-scale",
  "geologic-time",
  "eclipses",
  "tides",
  "solar-altitude",
  "continental-drift",
  "hotspots",
  "seafloor-spreading",
  "atmosphere-layers",
  "energy-budget",
  "thermal-circulation",
  "wind",
  "three-cell",
  "fronts",
  "cyclone-anticyclone",
  "climate-types",
  "drainage-basin",
  "hydrograph",
  "river-hydrology",
  "ocean-currents",
  "thermohaline",
  "carbon-cycle",
  "enso",
  "landform-types",
  "river-erosion",
  "river-deposition",
  "river-capture",
  "coasts",
  "glaciers",
  "karst",
  "folds-faults",
  "aeolian",
  "rock-cycle",
  "soil-profile",
  "soil-texture",
  "weathering",
  "soil-erosion",
  "earthquakes",
  "volcanoes",
  "tsunami",
  "tropical-cyclone",
  "graticule",
  "map-projections",
  "grid-references",
  "mass-movement",
  "rain-shadow",
  "groundwater",
  "isostasy",
  "wilson-cycle",
  "soil-catena",
  "periglacial",
  "storm-surge",
] as const;

const VERSION = 1;
const EPOCH = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
/** Crockford base 32: no I, L, O or U, so codes survive handwriting. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type HandIn = {
  slug: string;
  /** First choice for each question (0-based), or null if unanswered. */
  answers: (number | null)[];
  /** Calendar day the code was made (UTC). */
  date: Date;
  predicted: boolean;
  explained: boolean;
};

function crc8(bits: number[]) {
  let crc = 0;
  for (const bit of bits) {
    const top = ((crc >> 7) & 1) ^ bit;
    crc = (crc << 1) & 0xff;
    if (top) crc ^= 0x07;
  }
  return crc;
}

function push(bits: number[], value: number, width: number) {
  for (let i = width - 1; i >= 0; i--) bits.push((value >> i) & 1);
}

function take(bits: number[], at: number, width: number) {
  let value = 0;
  for (let i = 0; i < width; i++) value = (value << 1) | bits[at + i];
  return value;
}

export function encodeHandIn(h: HandIn): string {
  const lab = HANDIN_LABS.indexOf(h.slug as (typeof HANDIN_LABS)[number]);
  if (lab < 0) throw new Error(`No hand-in number for lab ${h.slug}`);
  const day = Math.max(0, Math.min(8191, Math.floor((h.date.getTime() - EPOCH) / DAY)));
  const bits: number[] = [];
  push(bits, VERSION, 3);
  push(bits, lab, 7);
  for (let i = 0; i < 5; i++) {
    const a = h.answers[i];
    push(bits, a == null ? 0 : Math.min(4, a + 1), 3);
  }
  push(bits, day, 13);
  push(bits, h.predicted ? 1 : 0, 1);
  push(bits, h.explained ? 1 : 0, 1);
  push(bits, crc8(bits), 8);
  push(bits, 0, 2);
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[take(bits, i, 5)];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/** Reads a code typed by hand; returns null if it is not a valid Geolens code. */
export function decodeHandIn(input: string): HandIn | null {
  const clean = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (clean.length !== 10) return null;
  const bits: number[] = [];
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    push(bits, v, 5);
  }
  if (take(bits, 0, 3) !== VERSION) return null;
  if (crc8(bits.slice(0, 40)) !== take(bits, 40, 8)) return null;
  const slug = HANDIN_LABS[take(bits, 3, 7)];
  if (!slug) return null;
  const answers = Array.from({ length: 5 }, (_, i) => {
    const v = take(bits, 10 + i * 3, 3);
    return v === 0 ? null : v - 1;
  });
  if (answers.some((a) => a !== null && a > 3)) return null;
  return {
    slug,
    answers,
    date: new Date(EPOCH + take(bits, 25, 13) * DAY),
    predicted: bits[38] === 1,
    explained: bits[39] === 1,
  };
}

/** Finds every code in pasted text, keeping whatever else is on the line (usually a name). */
export function findHandIns(text: string) {
  const out: { line: string; label: string; code: string; result: HandIn | null }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const candidates = [...line.matchAll(/\b([0-9A-Za-z]{5})(-?)([0-9A-Za-z]{5})\b/g)];
    // Prefer a token that decodes; otherwise flag one that looks like a mistyped code. A plain
    // ten-letter word such as "Washington" is part of the label, not a code.
    const match =
      candidates.find((m) => decodeHandIn(m[0]) !== null) ??
      candidates.find((m) => m[2] === "-" || /\d/.test(m[0]));
    if (!match) continue;
    const code = `${match[1]}-${match[3]}`.toUpperCase();
    const label = line
      .replace(match[0], "")
      .replace(/^[\s,;:\t–-]+|[\s,;:\t–-]+$/g, "")
      .trim();
    out.push({ line, label, code, result: decodeHandIn(code) });
  }
  return out;
}
