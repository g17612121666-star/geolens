/**
 * Prescribed wind landforms for the aeolian lab, at true scale: 1 unit = 10 m, heights in the
 * same units, wind toward +x. The shapes follow measured barchans and yardangs; they are not
 * solutions of sand transport.
 */

/** Dry sand avalanches when its lee slope passes the angle of repose, about 32–34°. */
export const REPOSE_DEGREES = 32;
const TAN_REPOSE = Math.tan((REPOSE_DEGREES * Math.PI) / 180);

/** A barchan, placed by the brink on its center line (where the slip face begins). */
export interface Barchan {
  x: number;
  z: number;
  /** Height of the brink on the center line. */
  height: number;
  /** From the center line to each horn tip, across the wind. */
  halfWidth: number;
  /** Length of the windward (stoss) slope on the center line. */
  stoss: number;
  /** How far downwind of the central brink the horn tips reach. */
  horn: number;
}

/** The lab's main dune: 4.2 m high and 29 m wide, about 7 times its height, as barchans are. */
export const MAIN_BARCHAN: Barchan = {
  x: 0.1,
  z: 0,
  height: 0.42,
  halfWidth: 1.45,
  stoss: 2.1,
  horn: 1.5,
};

/** A smaller barchan of the same shape, with its central brink at (x, z). */
export const smallBarchan = (x: number, z: number, scale: number): Barchan => ({
  x,
  z,
  height: MAIN_BARCHAN.height * scale,
  halfWidth: MAIN_BARCHAN.halfWidth * scale,
  stoss: MAIN_BARCHAN.stoss * scale,
  horn: MAIN_BARCHAN.horn * scale,
});

/** The main dune with two smaller ones: one off its southern horn, one upwind. */
export const BARCHANS: Barchan[] = [
  MAIN_BARCHAN,
  smallBarchan(1.7, -1.35, 0.4),
  smallBarchan(-2.05, 1.3, 0.33),
];

/** Brink height at q (−1 … 1 from horn tip to horn tip): highest in the middle, low horns. */
const brinkHeight = (d: Barchan, q: number) => d.height * (1 - q * q) ** 1.15;
/** The brink curves downwind toward the horn tips, so the slip face is concave in plan. */
const brinkX = (d: Barchan, q: number) => d.x + d.horn * q * q;

const BRINK_SAMPLES = 129,
  /** Per straight piece of brink: start x, z, height, unit direction, length, slope, offset. */
  SEGMENT = 9;
const brinkCache = new WeakMap<Barchan, Float64Array>();
function brinkSegments(d: Barchan) {
  let segments = brinkCache.get(d);
  if (!segments) {
    segments = new Float64Array((BRINK_SAMPLES - 1) * SEGMENT);
    const at = (i: number) => {
      const q = -1 + (2 * i) / (BRINK_SAMPLES - 1);
      return [brinkX(d, q), d.z + q * d.halfWidth, brinkHeight(d, q)];
    };
    for (let i = 0; i < BRINK_SAMPLES - 1; i++) {
      const [ax, az, ah] = at(i),
        [bx, bz, bh] = at(i + 1),
        length = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2),
        m = (bh - ah) / length,
        c = -m / TAN_REPOSE;
      segments.set(
        [ax, az, ah, (bx - ax) / length, (bz - az) / length, length, m, c / Math.sqrt(1 - c * c)],
        i * SEGMENT,
      );
      segments[i * SEGMENT + 8] = Math.max(ah, bh);
    }
    brinkCache.set(d, segments);
  }
  return segments;
}

/** The brink from horn tip to horn tip, as [x, height, z] points. */
export function brinkLine(d: Barchan, count = 97): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const q = -1 + (2 * i) / (count - 1);
    return [brinkX(d, q), brinkHeight(d, q), d.z + q * d.halfWidth];
  });
}

/**
 * The slip face hangs from the brink at the angle of repose: below every brink point the sand
 * falls away at no more than 32°, the surface a pile of dry sand takes.
 */
function slipFace(d: Barchan, x: number, z: number) {
  if (x > d.x + d.horn + d.height / TAN_REPOSE) return 0;
  const g = brinkSegments(d);
  let best = 0;
  for (let i = 0; i < g.length; i += SEGMENT) {
    // Along one straight piece of brink, the highest cone over (x, z) springs from the point
    // where the brink's rise and the cone's fall balance.
    const dx = x - g[i],
      dz = z - g[i + 1],
      across = Math.abs(dx * g[i + 4] - dz * g[i + 3]);
    if (g[i + 8] - TAN_REPOSE * across <= best) continue;
    const along = dx * g[i + 3] + dz * g[i + 4],
      s = Math.min(g[i + 5], Math.max(0, along - g[i + 7] * across)),
      h = g[i + 2] + g[i + 6] * s - TAN_REPOSE * Math.sqrt((along - s) ** 2 + across * across);
    if (h > best) best = h;
  }
  return best;
}

/** Which part of a barchan (x, z) lies on. */
export type DunePart = "floor" | "stoss" | "slip";

/** A point on a dune: its height, the part of the dune, and how far up the windward slope it
 * lies (0 at the toe, 1 at the brink). */
export interface DunePoint {
  h: number;
  part: DunePart;
  u: number;
}
const FLAT: DunePoint = { h: 0, part: "floor", u: 0 };

/** Height of a barchan at (x, z), and the part of the dune there. */
export function barchanAt(d: Barchan, x: number, z: number): DunePoint {
  const q = (z - d.z) / d.halfWidth;
  if (q <= -1 || q >= 1) return FLAT;
  const xb = brinkX(d, q);
  if (x <= xb) {
    // The windward slope rises smoothly from its toe and flattens into the crest at the brink.
    const toe = d.x - d.stoss * Math.sqrt(1 - q * q);
    if (x <= toe) return FLAT;
    const u = (x - toe) / (xb - toe);
    return { h: brinkHeight(d, q) * u * u * (3 - 2 * u), part: "stoss", u };
  }
  const h = slipFace(d, x, z);
  return h > 0 ? { h, part: "slip", u: 1 } : FLAT;
}

export const barchanHeight = (d: Barchan, x: number, z: number) => barchanAt(d, x, z).h;

/** The tallest dune at (x, z) with every dune moved `shift` downwind, and the part it shows. */
export function duneField(x: number, z: number, shift: number) {
  let top = FLAT;
  for (const d of BARCHANS) {
    const here = barchanAt(d, x - shift, z);
    if (here.h > top.h) top = here;
  }
  return top;
}

/** A yardang, placed by its upwind head and center line. */
export interface Yardang {
  x: number;
  z: number;
  length: number;
  width: number;
  height: number;
}

/** Five ridges of soft, bedded rock, 3–7 m high and four to six times as long as wide. */
export const YARDANGS: Yardang[] = [
  { x: -2.15, z: -0.12, length: 3.9, width: 0.86, height: 0.66 },
  { x: -2.6, z: -1.25, length: 3.2, width: 0.66, height: 0.5 },
  { x: -1.7, z: 1.05, length: 3.4, width: 0.72, height: 0.56 },
  { x: 0.75, z: -1.55, length: 1.6, width: 0.34, height: 0.28 },
  { x: 0.95, z: 1.75, length: 1.5, width: 0.3, height: 0.26 },
];

/** Upturned-hull profile along the wind (a = 0 upwind, 1 downwind): blunt steep head, long tapering tail. */
export function yardangProfile(a: number) {
  return a <= 0 || a >= 1 ? 0 : a < 0.25 ? (a / 0.25) ** 0.5 : ((1 - a) / 0.75) ** 1.2;
}

/** Half-width in plan along the ridge, as a share of the widest: a rounded head, then a taper. */
export function yardangPlan(a: number) {
  if (a <= 0 || a >= 1) return 0;
  return a < 0.18 ? Math.sqrt(1 - ((0.18 - a) / 0.18) ** 2) : ((1 - a) / 0.82) ** 0.75;
}

/** Height of the yardang field: flat-topped ridges with steep, wind-cut sides. */
export function yardangHeight(x: number, z: number) {
  let h = 0;
  for (const y of YARDANGS) {
    const a = (x - y.x) / y.length,
      half = (y.width / 2) * yardangPlan(a);
    if (half <= 0) continue;
    const r = Math.abs(z - y.z) / half;
    if (r < 1) h = Math.max(h, y.height * yardangProfile(a) * (1 - r ** 4) ** 0.35);
  }
  return h;
}
