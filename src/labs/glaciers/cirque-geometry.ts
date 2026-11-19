import * as THREE from "three";
import { landscapeNoise as noise } from "../shared/landscape-noise.ts";

/**
 * Three cirques cut into one peak, 6 × 6 km (1 unit = 1 km). Each cirque is a bowl with a flat,
 * slightly overdeepened floor and a headwall that steepens upward; where neighboring headwalls
 * meet they leave knife-edged arêtes, and where all three meet, a pyramidal horn. An invented
 * example, not a surveyed mountain.
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const ridged = (x: number, z: number) => 1 - Math.abs(2 * noise(x, z) - 1);

/** Distance of each cirque's center from the summit, and the radius of its bowl. */
export const CIRQUE_CENTER = 1.2,
  CIRQUE_RADIUS = 1.08;
/** Each cirque's direction from the summit and the height of its floor. */
export const CIRQUES = [0, 1, 2].map((k) => ({
  angle: (k * 2 * Math.PI) / 3 + 0.35,
  floor: 0.74 + 0.05 * Math.sin(k * 2.1 + 0.4),
}));
export type Cirque = (typeof CIRQUES)[number];
/** Height of the valley floor around the peak. */
export const VALLEY_FLOOR = 0.32;

/** The peak before glaciers cut into it: steep near the top, flattening onto the valley floor. */
function massif(x: number, z: number) {
  const r = Math.hypot(x, z),
    angle = Math.atan2(z, x);
  return (
    VALLEY_FLOOR +
    2.05 * Math.max(0, 1 - r / 3.2) ** 1.1 +
    0.3 * Math.max(0, 1 - r / 0.5) ** 1.6 +
    0.12 * (ridged(x * 1.6 + 2, z * 1.6) - 0.5) * smooth(0.25, 0.8, r) * (1 - smooth(1.8, 2.9, r)) +
    // Ribs and gullies running down the slopes.
    0.07 *
      (ridged(angle * 7 + noise(x, z), r * 1.8) - 0.5) *
      smooth(0.3, 1, r) *
      (1 - smooth(2.2, 3, r)) +
    0.02 * (noise(x * 4, z * 4) - 0.5)
  );
}

/** Position relative to a cirque: out from its center along its axis, and across the axis. */
export function cirqueFrame(c: Cirque, x: number, z: number) {
  const ca = Math.cos(c.angle),
    sa = Math.sin(c.angle);
  return { along: x * ca + z * sa - CIRQUE_CENTER, across: -x * sa + z * ca };
}

/** The point at (along, across) in a cirque's frame. */
export function fromCirqueFrame(c: Cirque, along: number, across: number): [number, number] {
  const ca = Math.cos(c.angle),
    sa = Math.sin(c.angle),
    r = along + CIRQUE_CENTER;
  return [r * ca - across * sa, r * sa + across * ca];
}

/** A cirque bowl: an overdeepened floor and a headwall that steepens upward, open downslope. */
function bowl(c: Cirque, x: number, z: number) {
  const { along, across } = cirqueFrame(c, x, z),
    d = Math.hypot(along / (along > 0 ? 1.25 : 1), across) / CIRQUE_RADIUS;
  return c.floor - 0.08 * Math.exp(-((d / 0.42) ** 2)) + 1.9 * d ** 3.5;
}

/**
 * The trough the cirque glacier cut below its mouth when it was larger: it starts at the cirque's
 * rock lip and falls away to the valley floor.
 */
function outlet(c: Cirque, x: number, z: number) {
  const { along, across } = cirqueFrame(c, x, z),
    width = 0.5 + 0.12 * Math.max(0, along - CIRQUE_RADIUS);
  if (along < CIRQUE_RADIUS * 0.45) return Infinity;
  return (
    c.floor +
    0.06 -
    0.5 * smooth(CIRQUE_RADIUS * 0.75, CIRQUE_RADIUS * 1.6, along) +
    0.9 * Math.abs(across / width) ** 2.6
  );
}

/** Small moraine arcs across each outlet trough, left where the cirque glacier's snout paused. */
function moraines(x: number, z: number) {
  let h = 0;
  for (const c of CIRQUES) {
    const { along, across } = cirqueFrame(c, x, z),
      arc = (along - CIRQUE_RADIUS * 1.2 + 0.6 * across * across) / 0.06;
    h = Math.max(h, 0.03 * Math.exp(-arc * arc) * (1 - smooth(0.35, 0.55, Math.abs(across))));
  }
  return h;
}

/** Ground height of the cirque block. */
export function cirqueHeight(x: number, z: number) {
  let h = massif(x, z);
  for (const c of CIRQUES) h = Math.min(h, bowl(c, x, z), outlet(c, x, z));
  return Math.max(VALLEY_FLOOR - 0.02, h) + moraines(x, z);
}

/** The height of a cirque's rock lip: the highest point on the way out from its floor. */
export function lipHeight(c: Cirque) {
  let top = -Infinity;
  for (let a = 0; a <= CIRQUE_RADIUS * 1.5; a += 0.01) {
    const [x, z] = fromCirqueFrame(c, a, 0);
    top = Math.max(top, cirqueHeight(x, z));
    if (cirqueHeight(x, z) < top - 0.05) break;
  }
  return top;
}

/**
 * Surface of a cirque glacier: thickest against the headwall, where drifting snow collects, and
 * thinning out to the lip. `t` runs from 0 at the back of the bowl to 1 just beyond its mouth.
 */
export function cirqueIceSurface(c: Cirque, x: number, z: number) {
  const { along, across } = cirqueFrame(c, x, z),
    t = (along + CIRQUE_RADIUS) / (2.25 * CIRQUE_RADIUS),
    d = Math.hypot(along / (along > 0 ? 1.25 : 1), across) / CIRQUE_RADIUS;
  // Only inside the bowl, ending just beyond its lip.
  if (t < 0 || t > 1 || d > 0.97 || along > CIRQUE_RADIUS * 0.72) return { surface: -Infinity, t };
  return {
    surface: c.floor + 0.04 + 0.4 * (1 - t) ** 1.25 - 0.06 * (across / CIRQUE_RADIUS) ** 2,
    t,
  };
}

/** A draped sheet for one cirque glacier, with the attributes `IceMaterial` expects. */
export function cirqueIceGeometry(c: Cirque) {
  const na = 150,
    nc = 130,
    a0 = -CIRQUE_RADIUS * 1.02,
    a1 = CIRQUE_RADIUS * 1.5,
    half = CIRQUE_RADIUS * 1.05,
    position: number[] = [],
    depth: number[] = [],
    along: number[] = [],
    edge: number[] = [],
    index: number[] = [];
  for (let i = 0; i <= na; i++) {
    const a = a0 + ((a1 - a0) * i) / na,
      row: { x: number; z: number; ground: number; top: number; t: number; q: number }[] = [];
    for (let j = 0; j <= nc; j++) {
      const q = -half + (2 * half * j) / nc,
        [x, z] = fromCirqueFrame(c, a, q),
        ground = cirqueHeight(x, z),
        { surface, t } = cirqueIceSurface(c, x, z);
      row.push({ x, z, ground, top: surface, t, q });
    }
    // The glacier's edges across this row, for the debris along them.
    const inside = row.filter((p) => p.top > p.ground),
      lo = inside.length ? Math.min(...inside.map((p) => p.q)) : 0,
      hi = inside.length ? Math.max(...inside.map((p) => p.q)) : 0;
    for (const p of row) {
      position.push(p.x, Math.max(p.ground, p.top) + 0.003, p.z);
      depth.push(Number.isFinite(p.top) ? p.top - p.ground : -1);
      along.push(THREE.MathUtils.clamp(p.t, 0, 1));
      edge.push(Math.max(0, Math.min(p.q - lo, hi - p.q)));
    }
  }
  const stride = nc + 1;
  for (let i = 0; i < na; i++)
    for (let j = 0; j < nc; j++) {
      const k = i * stride + j;
      index.push(k, k + 1, k + stride, k + 1, k + stride + 1, k + stride);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute("iceDepth", new THREE.Float32BufferAttribute(depth, 1));
  g.setAttribute("along", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("edge", new THREE.Float32BufferAttribute(edge, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * A tarn: the lake left in a cirque's overdeepened floor once its glacier has gone, filled to the
 * height of its rock lip. A draped sheet whose `iceDepth` attribute is the water depth.
 */
export function tarnGeometry(c: Cirque) {
  const level = lipHeight(c) - 0.004,
    n = 60,
    half = CIRQUE_RADIUS * 0.9,
    position: number[] = [],
    depth: number[] = [],
    index: number[] = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const [x, z] = fromCirqueFrame(c, -half + (2 * half * i) / n, -half + (2 * half * j) / n);
      const { along, across } = cirqueFrame(c, x, z),
        inBowl = Math.hypot(along / (along > 0 ? 1.25 : 1), across) / CIRQUE_RADIUS < 0.72;
      position.push(x, level, z);
      depth.push(inBowl ? level - cirqueHeight(x, z) : -1);
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * (n + 1) + j;
      index.push(k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute("iceDepth", new THREE.Float32BufferAttribute(depth, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
