import * as THREE from "three";
import { landscapeNoise as noise } from "../shared/landscape-noise.ts";
export { landscapeNoise as glacialNoise } from "../shared/landscape-noise.ts";

/**
 * A glaciated valley 6 km long and 4 km wide (1 unit = 1 km; x runs down-valley, z across) and the
 * valley glacier in it. The shapes follow real glacial troughs and glaciers; they are not an
 * ice-flow simulation.
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Sharp-crested noise for ridges and spurs: 1 on the crests. */
const ridged = (x: number, z: number) => 1 - Math.abs(2 * noise(x, z) - 1);

/** The head of the glacier, at the foot of the cirque headwalls. */
export const ICE_HEAD = -2.85;
/** Down-valley position of the terminal moraine's crest, left by the glacier at its longest. */
export const MORAINE_X = 2.62;
/** A smaller moraine left where the snout paused while retreating. */
export const RECESSIONAL_X = 1.75;
/** The tributary valley that hangs above the trough: its center and the lip it drops over. */
export const HANGING = { x: 0.55, lip: 1.05 };
/** Share of the glacier's length above the equilibrium line (its accumulation zone). */
export const ELA_SHARE = 0.45;

/** Glacier length (km) for the lab's Ice extent, 0–1. */
export const iceLength = (extent: number) => 2.2 + 3.1 * extent;

/**
 * Valley-floor height along the valley: a high cirque basin, a rock step where the ice falls
 * steeply (the icefall), then a gentler trough down to the valley mouth.
 */
export function floorHeight(x: number) {
  return 0.22 + 0.55 * ((3 - x) / 6) ** 1.5 + 0.2 * smooth(-1.25, -1.95, x);
}

/** Half-width of the trough floor and lower walls: widest in the cirque basin at the head. */
export const halfWidth = (x: number) =>
  0.9 + 0.2 * smooth(-1.6, -2.6, x) - 0.08 * smooth(1.2, 3, x);

/** Height of the rock and sediment of the valley, without moraines. */
export function valleyBed(x: number, z: number) {
  const w = halfWidth(x),
    a = Math.abs(z),
    r = a / w;
  // A U-shaped trough: a flat floor and walls that steepen upward.
  let h = floorHeight(x) + 0.45 * Math.min(r, 1.25) ** 3;
  // A bench (the shoulder) above the trough, then the upper slopes up to the ridge crests.
  h += 0.07 * smooth(1.1, 1.45, r) + 0.34 * smooth(1.3, 2.15, r) ** 1.4;
  // Spurs and gullies on the upper slopes, cut off square at the trough edge (truncated spurs).
  const upper = smooth(1.08, 1.5, r);
  h += upper * (0.16 * (noise(x * 1.7 + 3, z * 0.55) - 0.5) + 0.1 * ridged(x * 3.1, z * 1.3));
  // Smooth, ice-polished rock with small knobs below.
  h += 0.025 * (noise(x * 5, z * 5) - 0.5);
  // The cirque headwalls, and the rock ridge between the two cirque basins at the head.
  const head = smooth(-2.5, -3.05, x);
  h += 0.75 * head ** 1.3 * (0.85 + 0.3 * noise(z * 2.2, 1.7));
  h += 0.55 * Math.exp(-((z / 0.2) ** 2)) * smooth(-1.95, -2.6, x) * (0.9 + 0.2 * noise(x * 4, 3));
  // A tributary valley, hanging high above the trough floor: it was cut by a smaller glacier
  // that could not deepen its bed as far as the main one did.
  if (z < 0) {
    const across = (x - HANGING.x) / 0.36,
      lip = floorHeight(HANGING.x) + 0.62,
      tributary = lip + 0.3 * Math.max(0, a - HANGING.lip) + 0.45 * across * across;
    h += (Math.min(h, tributary) - h) * smooth(0.95, 1.08, a);
  }
  return h;
}

/** Where the meltwater stream runs across the valley floor below the glacier. */
export const streamZ = (x: number) => 0.1 * Math.sin(x * 2.3) + 0.06 * Math.sin(x * 5.1);

/**
 * Terminal and recessional moraines: arcs of till across the valley floor, bowed down-valley like
 * the snout that built them, and breached where the meltwater stream cuts through.
 */
export function moraineHeight(x: number, z: number) {
  let h = 0;
  for (const [crest, height, width] of [
    [MORAINE_X, 0.075, 0.11],
    [RECESSIONAL_X, 0.035, 0.07],
  ]) {
    const w = halfWidth(crest),
      along = (x - (crest - 0.38 * (z / w) ** 2)) / width,
      span = 1 - smooth(0.85, 1.1, Math.abs(z) / w),
      breach = 1 - 0.9 * Math.exp(-(((z - streamZ(crest)) / 0.08) ** 2));
    h = Math.max(
      h,
      height * Math.exp(-along * along) * span * breach * (0.8 + 0.4 * noise(x * 9, z * 9)),
    );
  }
  return h;
}

/** The ground surface: rock, outwash and moraines. */
export const land = (x: number, z: number) => valleyBed(x, z) + moraineHeight(x, z);

/**
 * Ice thickness on the valley's center line, from u = 0 at the head to 1 at the snout: close to
 * the parabolic profile of an ice mass that deforms under its own weight, so the surface always
 * falls down-glacier and ends in a steep snout.
 */
function centerThickness(u: number) {
  return 0.3 * (1 - u) ** 0.45;
}

/**
 * Height of the glacier surface at (x, z) for a glacier of the given length, or −Infinity beyond
 * it. There is ice wherever this is above the ground. The surface is gently concave across the
 * snowy basin and convex across the tongue below the equilibrium line.
 */
export function iceSurface(x: number, z: number, length: number) {
  const u = (x - ICE_HEAD) / length;
  if (u < 0 || u > 1) return -Infinity;
  const r = Math.min(1.3, Math.abs(z) / halfWidth(x)),
    // Raised edges in the snowy basin; lowered edges on the tongue, where the ice near the
    // warmer valley walls melts faster. The center line itself falls steadily down-glacier.
    camber = r * r * (0.05 - 0.19 * smooth(0.3, 0.6, u)),
    // Below the equilibrium line the medial moraine stands up as a low ridge: its debris
    // shields the ice beneath it from the sun, so that ice melts more slowly.
    medial = 0.014 * Math.exp(-((z / 0.07) ** 2)) * smooth(-1.95, -1.7, x) * smooth(0.42, 0.6, u);
  return floorHeight(x) + centerThickness(u) + camber + medial;
}

/** Ice thickness at (x, z): zero outside the glacier. */
export const iceThickness = (x: number, z: number, length: number) =>
  Math.max(0, iceSurface(x, z, length) - land(x, z));

/** Where the glacier's edges cross the valley at x: its lowest and highest z. */
export function iceMargins(x: number, length: number): [number, number] {
  const edge = (sign: number) => {
    let inside = sign * 0.3;
    if (iceThickness(x, inside, length) <= 0) return inside;
    let outside = sign * 1.6;
    for (let k = 0; k < 40; k++) {
      const m = (inside + outside) / 2;
      if (iceThickness(x, m, length) > 0) inside = m;
      else outside = m;
    }
    return inside;
  };
  return [edge(-1), edge(1)];
}

/**
 * The glacier as a draped sheet over the valley. Each vertex carries the ice thickness there
 * (`iceDepth`, ≤ 0 off the ice, where the material discards it), how far down the glacier it
 * lies (`along`, 0 at the head and 1 at the snout) and how far it is from the glacier's nearer
 * edge (`edge`, km).
 */
export function glacierIceGeometry(length: number) {
  const nx = 230,
    nz = 110,
    x0 = ICE_HEAD - 0.02,
    x1 = ICE_HEAD + length + 0.03,
    half = 1.45,
    position: number[] = [],
    thickness: number[] = [],
    along: number[] = [],
    edge: number[] = [],
    index: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx,
      [lo, hi] = iceMargins(x, length);
    for (let j = 0; j <= nz; j++) {
      const z = -half + (2 * half * j) / nz,
        ground = land(x, z),
        top = iceSurface(x, z, length);
      position.push(x, Math.max(ground, top) + 0.003, z);
      thickness.push(Number.isFinite(top) ? top - ground : -1);
      along.push((x - ICE_HEAD) / length);
      edge.push(Math.max(0, Math.min(z - lo, hi - z)));
    }
  }
  const stride = nz + 1;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const a = i * stride + j;
      index.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute("iceDepth", new THREE.Float32BufferAttribute(thickness, 1));
  g.setAttribute("along", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("edge", new THREE.Float32BufferAttribute(edge, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
