import * as THREE from "three";
import { fbm } from "../shared/hazard-utils.ts";

/**
 * A schematic cross-section for the rock cycle in its landscape: an ocean and sedimentary
 * basin on the left, a coastal plain crossed by a river, foothills with exposed granite, and
 * a mountain range with a volcano on the right. The front face (z = SZ / 2) is the section.
 *
 * 1 scene unit across ≈ 40 km; the block is 50 km deep (DEPTH_KM over BASE). Relief above
 * sea level is exaggerated about 8× so the landscape reads at the same scale as the crust.
 */
export const SX = 7.2,
  SZ = 2.6,
  BASE = -1.6,
  DEPTH_KM = 50,
  FRONT = SZ / 2;
/** Scene units per km of depth. */
export const PER_KM = -BASE / DEPTH_KM;

/** Rock bodies in the section, in scene units (x, y). */
export const BODIES = {
  chamber: { x: 2.45, y: -0.6, a: 0.36, b: 0.17 },
  pluton: { x: 1.05, y: -0.2, a: 0.56, b: 0.52 },
  volcano: { x: 2.45, z: 1.05, r: 0.72, h: 1.02 },
  /** Partial melting at the base of the thickened crust under the volcanic range. */
  meltTop: -1.18,
};

const smooth = THREE.MathUtils.smoothstep;

/** The river runs from the foothills west across the plain to its delta. */
export const riverZ = (x: number) => 0.35 + 0.22 * Math.sin(x * 1.25 + 0.4);

/** Land surface without the volcano's cone: the range the cone was built on. */
export function surface(x: number, z: number, cone = true) {
  const n = fbm(x * 1.3 + 5, z * 1.3 - 2),
    n2 = fbm(x * 3.1 + 1, z * 3.1),
    land = smooth(x, -1.5, -1.05),
    sea = -0.21 + 0.12 * smooth(x, -3.6, -1.2) + 0.01 * (n2 - 0.5),
    plain = 0.03 + 0.02 * (n - 0.5),
    hills = 0.3 * smooth(x, 0.35, 1.4) * (0.7 + 0.6 * n),
    range = 0.5 * smooth(x, 1.3, 2.2) * (0.65 + 0.7 * n2),
    v = BODIES.volcano,
    d = Math.hypot(x - v.x, (z - v.z) * 1.1) / v.r,
    coneHeight = cone && d < 1 ? v.h * (1 - d) ** 1.25 - 0.12 * Math.exp(-((d / 0.13) ** 2)) : 0,
    // A shallow valley follows the river down to the coast.
    valley =
      0.05 *
      Math.exp(-(((z - riverZ(x)) / 0.2) ** 2)) *
      smooth(x, -1.2, -0.6) *
      (1 - smooth(x, 1.5, 2)),
    landHeight = Math.max(plain + hills + range, coneHeight) - valley;
  return sea + (landHeight - sea) * land;
}

/** Temperature (°C) at depth (km) below position x: hotter under the volcanic range. */
export function geotherm(x: number, depthKm: number) {
  const gradient = 17 + 15 * Math.exp(-(((x - BODIES.chamber.x) / 0.95) ** 2));
  return 12 + gradient * Math.max(0, depthKm);
}

/** Pathways through the section, as (x, y) points on the front face, by route index. */
export function routePath(route: number): [number, number][] {
  const s = (x: number) => surface(x, FRONT) + 0.03;
  const along = (x0: number, x1: number, n = 40): [number, number][] =>
    Array.from({ length: n }, (_, i) => {
      const x = x0 + ((x1 - x0) * i) / (n - 1);
      return [x, s(x)];
    });
  const curve = (pts: [number, number][], n = 48): [number, number][] => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    return c.getPoints(n).map((p) => [p.x, p.y]);
  };
  switch (route) {
    case 0: // magma rises from the chamber and crystallizes as the granite pluton
      return curve([
        [2.4, -0.62],
        [2.0, -0.5],
        [1.55, -0.38],
        [1.15, -0.32],
      ]);
    case 1: // exposed granite weathers; the grains are carried down to the sea floor
      return [
        ...along(1.05, -1.2),
        ...curve(
          [
            [-1.2, s(-1.2)],
            [-1.6, s(-1.6) + 0.01],
            [-2.1, s(-2.1)],
          ],
          12,
        ),
      ];
    case 2: // tilted sedimentary beds in the foothills weather and erode
      return along(0.5, -1.9);
    case 3: // metamorphic rock exposed on a high peak weathers and erodes
      return along(3.15, -1.9, 70);
    case 4: // deposition on the sea floor, then burial, compaction and cementation
      return curve([
        [-1.9, s(-1.9) - 0.02],
        [-2.0, -0.32],
        [-2.05, -0.5],
        [-2.1, -0.66],
      ]);
    case 5: // granite carried deeper under the growing range recrystallizes
      return curve([
        [1.05, -0.45],
        [1.25, -0.7],
        [1.5, -0.9],
        [1.75, -1.0],
      ]);
    case 6: // deeply buried basin sediments are caught up under the mountain front
      return curve([
        [0.1, -0.55],
        [0.55, -0.68],
        [1.0, -0.85],
        [1.4, -0.98],
      ]);
    case 7:
      return curve([
        [1.15, -0.62],
        [1.45, -0.95],
        [1.75, -1.2],
        [2.0, -1.32],
      ]);
    case 8:
      return curve([
        [-0.1, -0.62],
        [0.6, -0.9],
        [1.3, -1.18],
        [1.8, -1.36],
      ]);
    default:
      return curve([
        [2.0, -0.95],
        [2.15, -1.1],
        [2.3, -1.24],
        [2.45, -1.36],
      ]);
  }
}
