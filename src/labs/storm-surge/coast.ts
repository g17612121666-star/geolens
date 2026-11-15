/**
 * The shelf and coast of the storm-surge lab. 1 scene unit = 20 km across the shelf; heights
 * in meters are multiplied by `f / 20000` in the scene.
 */
import { fbm } from "../shared/hazard-utils.ts";

export const X0 = -2.5,
  COAST = 2.5,
  LAND = 3.5,
  HALF = 1.1,
  NX = 120,
  NZ = 22;

/** Sea floor and land in meters: a flat shelf, a short beach, dunes, then a low coastal plain. */
export function floorMetres(x: number, z: number, depth: number) {
  if (x < COAST - 0.14)
    return -depth + 0.35 * Math.sin(x * 40 + 3 * Math.sin(z * 4)) * (fbm(x * 2, z * 2) + 0.3);
  if (x < COAST + 0.06) {
    const u = (x - (COAST - 0.14)) / 0.2;
    return -depth + (depth + 1.2) * u * u * (3 - 2 * u);
  }
  const inland = x - COAST - 0.06,
    dune = 3.2 * Math.exp(-(((inland - 0.07) / 0.05) ** 2)) * (0.8 + 0.4 * fbm(z * 6, 1));
  return (
    1.2 +
    dune +
    Math.min(1, inland / 0.25) * 2 +
    4 * Math.max(0, inland - 0.55) +
    1.2 * (fbm(x * 3, z * 3) - 0.5)
  );
}

/**
 * How far inland the water at the coast reaches in the row at z: scanning inland from the shore,
 * land stays flooded while it is lower than the water level, and the first ground higher than
 * the water (a dune crest, or the rising plain) holds it back. This is a "bathtub" estimate: it
 * assumes the surge lasts long enough to fill the low land; the model stops at the coastline.
 */
export function floodLimit(level: number, z: number, depth: number) {
  let x = COAST - 0.02;
  while (x < LAND && floorMetres(x, z, depth) < level) x += 0.004;
  return Math.min(x, LAND);
}
/** Rows across the coast for the flood sheet and its waterline. */
export const FLOOD_ROWS = 44,
  FLOOD_STEPS = 48;
