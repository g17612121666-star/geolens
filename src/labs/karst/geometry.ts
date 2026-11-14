import * as THREE from "three";
import { landscapeNoise as noise } from "../shared/landscape-noise.ts";

/** The block spans x −3…3 and z −1.5…1.5; the cutaway removes everything in front of CUT. */
export const BLOCK = { x: 3, z: 1.5 },
  CUT = 0.45;
/** The doline: a closed hollow behind the cutaway, draining through a swallow hole at its floor. */
export const DOLINE = { x: -1.1, z: 0.02, radius: 0.62, depth: 0.42 };

const ss = THREE.MathUtils.smoothstep;
export const karstTop = (x: number, z: number) =>
  1.8 -
  DOLINE.depth * Math.exp(-((x - DOLINE.x) ** 2 + (z - DOLINE.z) ** 2) / DOLINE.radius ** 2) +
  0.045 * (noise(x * 7, z * 8) - 0.5);
/** Two families of joints retain their structural direction but not paving-stone spacing. */
export function karstRoof(x: number, z: number, opening: number) {
  const xs = [-2.61, -1.85, -1.02, -0.16, 0.63, 1.57, 2.48],
    zs = [-1.12, -0.33, 0.51, 1.24];
  const dx = Math.min(
    ...xs.map((a, i) =>
      Math.abs(x - a - 0.06 * Math.sin(z * 2.7 + i * 1.71) - 0.035 * (noise(z * 8, i) - 0.5)),
    ),
  );
  const dz = Math.min(
    ...zs.map((a, i) =>
      Math.abs(z - a - 0.055 * Math.sin(x * 2.1 + i * 2.3) - 0.025 * (noise(x * 9, i) - 0.5)),
    ),
  );
  const distance = Math.min(dx, dz),
    width = opening / 2;
  const joint = 0.23 * (1 - ss(distance, width * 0.45, width + 0.035));
  return karstTop(x, z) - joint;
}

/**
 * The cave passage, dissolved along a bedding plane that dips gently toward the spring: its center
 * line across the block (z at each x), half-width and height. It is closed short of the left face,
 * low where it squeezes into a crawl and tallest in a chamber.
 */
export const passageZ = (x: number) => 0.25 + 0.12 * Math.sin(0.9 * x + 0.6);
export const passageHalfWidth = (x: number) => 0.45 + 0.1 * Math.sin(1.6 * x + 1.1);
const opens = (x: number) => ss(x, -2.75, -2.35);
export const passageHeight = (x: number) =>
  opens(x) *
  (0.3 +
    0.36 * Math.exp(-(((x - 0.8) / 0.85) ** 4)) -
    0.13 * Math.exp(-(((x + 1.75) / 0.32) ** 2)) +
    0.05 * (noise(x * 3, 1.3) - 0.5));
/** The bedding plane the passage follows. */
const bedding = (x: number, z: number) =>
  0.24 - 0.075 * (x + 2.7) + 0.03 * (noise(x * 3, z * 5) - 0.5);
/** Across the passage: 1 on its center line, falling to 0 at its walls (an elliptical vault),
 * and 0 everywhere beyond the passage's closed end. */
export function passageProfile(x: number, z: number) {
  const u = (z - passageZ(x)) / passageHalfWidth(x);
  return Math.sqrt(Math.max(0, 1 - u * u)) * opens(x);
}
/** The floor and the roof of the passage meet in solid rock outside it. */
export const caveFloor = (x: number, z: number) => bedding(x, z) - 0.07 * passageProfile(x, z);
export const caveCeiling = (x: number, z: number) => {
  const vault = passageProfile(x, z);
  return (
    bedding(x, z) +
    passageHeight(x) * vault * (1 + 0.12 * (noise(x * 5, z * 6) - 0.5)) +
    0.03 * vault * (noise(x * 13, z * 11) - 0.5)
  );
};

/** Closed slab between independently sampled upper and lower surfaces, from the back of the
 * block to `front` (the cutaway plane, or the front face). */
export function karstSlab(
  top: (x: number, z: number) => number,
  bottom: (x: number, z: number) => number,
  front = BLOCK.z,
  n = 160,
) {
  const p: number[] = [],
    uv: number[] = [],
    ix: number[] = [],
    count = (n + 1) ** 2,
    depth = front + BLOCK.z;
  for (const h of [top, bottom])
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const x = -BLOCK.x + (2 * BLOCK.x * i) / n,
          z = -BLOCK.z + (depth * j) / n;
        p.push(x, h(x, z), z);
        uv.push(i / n, j / n);
      }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i,
        b = a + n + 1;
      ix.push(
        a,
        b,
        a + 1,
        a + 1,
        b,
        b + 1,
        a + count,
        a + 1 + count,
        b + count,
        a + 1 + count,
        b + 1 + count,
        b + count,
      );
    }
  const edge: number[] = [];
  for (let i = 0; i <= n; i++) edge.push(i);
  for (let j = 1; j <= n; j++) edge.push(j * (n + 1) + n);
  for (let i = n - 1; i >= 0; i--) edge.push(n * (n + 1) + i);
  for (let j = n - 1; j > 0; j--) edge.push(j * (n + 1));
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i],
      b = edge[(i + 1) % edge.length];
    ix.push(a, b, a + count, b, b + count, a + count);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}
