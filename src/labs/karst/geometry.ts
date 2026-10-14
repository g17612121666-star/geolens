import * as THREE from "three";
import { landscapeNoise as noise } from "../shared/landscape-noise.ts";
export const karstTop = (x: number, z: number) =>
  1.8 - 0.58 * Math.exp(-((x + 1) ** 2 + z * z) / 0.22) + 0.045 * (noise(x * 7, z * 8) - 0.5);
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
  const joint = 0.23 * (1 - THREE.MathUtils.smoothstep(distance, width * 0.45, width + 0.035));
  return karstTop(x, z) - joint;
}
export const caveFloor = (x: number, z: number) =>
  0.24 - 0.075 * (x + 2.7) + 0.045 * noise(x * 3, z * 5) + 0.035 * z * z;
export const caveCeiling = (x: number, z: number) =>
  0.68 +
  0.22 * Math.sqrt(Math.max(0, 1 - (z / 1.7) ** 2)) +
  0.07 * (noise(x * 3, z * 4) - 0.5) +
  0.04 * (noise(x * 11, z * 9) - 0.5);
/** Closed slab between independently sampled upper and lower surfaces. */
export function karstSlab(
  top: (x: number, z: number) => number,
  bottom: (x: number, z: number) => number,
  n = 160,
) {
  const p: number[] = [],
    uv: number[] = [],
    ix: number[] = [],
    count = (n + 1) ** 2;
  for (const h of [top, bottom])
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const x = -3 + (6 * i) / n,
          z = -1.5 + (3 * j) / n;
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
