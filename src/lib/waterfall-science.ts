import { landscapeNoise as noise } from "../labs/shared/landscape-noise.ts";
import { waterfallBed, waterfallLip } from "./fluvial-science.ts";

/**
 * The ground around a waterfall that is retreating through a resistant sandstone cap over weaker
 * mudstone (1 unit = 10 m; x runs downstream, z across). Upstream of the lip the river runs in a
 * shallow channel cut into the cap; downstream it runs along the floor of the gorge the fall has
 * left behind. The shapes are chosen to show the process; they are not a simulation.
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Top of the sandstone cap: everything above it is cap rock, everything below weaker mudstone. */
export const CAP_BASE = 1.42;
/** How far the cap overhangs the undercut mudstone below the lip. */
export const OVERHANG = 0.2;

/** Height of the land surface of the plateau the river crosses. */
export const plateauHeight = (x: number, z: number) =>
  1.8 -
  0.015 * (x + 3) +
  0.035 * (noise(x * 1.3 + 2, z * 1.3) - 0.5) * smooth(0.5, 1.2, Math.abs(z));

/** Half-width of the gorge at its rim: older reaches downstream have had longer to widen. */
export function gorgeHalfWidth(x: number, progress: number) {
  const lip = waterfallLip(progress);
  return 1.0 + 0.14 * smooth(lip, lip + 3.5, x) + 0.14 * (noise(x * 1.1, 7.3) - 0.5);
}

/**
 * Signed distance from the gorge rim: negative inside the gorge. The gorge ends upstream in a
 * horseshoe-shaped head whose upstream edge is the lip.
 */
export function gorgeDistance(x: number, z: number, progress: number) {
  const lip = waterfallLip(progress),
    head = gorgeHalfWidth(lip, progress),
    center = lip + head,
    wobble = 0.05 * (noise(x * 2.6 + 1, z * 2.6) - 0.5) + 0.06 * (noise(x * 6 + 4, z * 6) - 0.5);
  if (x >= center) return Math.abs(z) - gorgeHalfWidth(x, progress) + wobble;
  return Math.hypot(x - center, z) - head + wobble;
}

/**
 * Cross-section of a gorge wall, by distance inward from the rim: a vertical cliff in the cap, a
 * steep face in the mudstone, then a talus apron of fallen blocks at about 35° down to the floor.
 */
export function gorgeWall(inside: number, floor: number, rim: number) {
  if (inside <= 0) return rim;
  if (inside < 0.03) return rim + (CAP_BASE - rim) * (inside / 0.03);
  const mud = (inside - 0.03) / 0.22;
  if (mud < 1) return CAP_BASE + (floor + 0.2 - CAP_BASE) * mud ** 1.25;
  const talus = Math.min(1, (inside - 0.25) / 0.34);
  return floor + 0.2 * (1 - talus) ** 1.4;
}

/** The plunge pool: a hollow scoured into the gorge floor at the foot of the fall. */
export function poolDepth(x: number, z: number, progress: number) {
  const lip = waterfallLip(progress);
  return 0.16 * Math.exp(-(((x - lip - 0.62) / 0.32) ** 2) - (z / 0.4) ** 2);
}

/** The gorge floor: falling gently downstream, with the plunge pool at the foot of the fall. */
export function gorgeFloor(x: number, z: number, progress: number) {
  const lip = waterfallLip(progress);
  return 0.38 - 0.012 * Math.max(0, x - lip) - poolDepth(x, z, progress);
}

/** Where the river runs across the plateau: it winds a little, then goes straight over the lip. */
export function channelZ(x: number, progress: number) {
  const lip = waterfallLip(progress);
  return x < lip ? 0.12 * Math.sin(1.4 * (x - lip)) : 0;
}

/** Ground height of the waterfall scene. */
export function waterfallTerrain(x: number, z: number, progress: number) {
  const lip = waterfallLip(progress),
    plateau = plateauHeight(x, z),
    // The river's channel across the plateau, cut a little way into the cap.
    channel =
      waterfallBed(Math.min(x, lip - 0.001), progress) +
      0.42 * Math.max(0, Math.abs(z - channelZ(x, progress)) - 0.18) ** 1.4,
    rim = Math.min(plateau, channel),
    inside = -gorgeDistance(x, z, progress);
  if (inside <= 0) return rim;
  return Math.min(rim, gorgeWall(inside, gorgeFloor(x, z, progress), rim));
}
