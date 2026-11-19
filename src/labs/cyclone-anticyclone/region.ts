import * as THREE from "three";
import { fbm } from "../shared/hazard-utils";

const smooth = THREE.MathUtils.smoothstep;
/** The map is 6.8 units across: about 2,000 km, so 1 unit ≈ 300 km. */
export const MAP_SIZE = 6.8;
/** Cloud base and the height that cloud tops reach above it (heights exaggerated). */
export const CLOUD_BASE = 0.3,
  CLOUD_DEPTH = 0.42;

/** An illustrative coast: land to the west and north, open ocean to the southeast. */
export function coast(x: number, z: number) {
  return (
    (x + 3.0) * 0.714 +
    (z - 2.6) * 0.7 +
    0.36 * (fbm(x * 0.5 + 3, z * 0.5 - 2) - 0.5) +
    0.12 * (fbm(x * 1.7, z * 1.7 + 5) - 0.5)
  );
}

/** Ground and seabed height: a coastal plain rising to a belt of uplands (relief exaggerated). */
export function ground(x: number, z: number) {
  const s = -coast(x, z);
  if (s < 0) return Math.max(-0.075, -0.004 + 0.022 * s - 0.05 * smooth(-s, 0.5, 1.4));
  const ridge = Math.exp(-(((s - 2.3) / 0.75) ** 2));
  return (
    0.004 +
    0.022 * smooth(s, 0, 1.1) +
    ridge * (0.045 + 0.07 * fbm(x * 1.3 + 2, z * 1.3)) +
    0.012 * (fbm(x * 4.2, z * 4.2) - 0.5) * smooth(s, 0, 0.3)
  );
}
/** Height of the land or sea surface, for draping lines over the map. */
export const surface = (x: number, z: number) => Math.max(0, ground(x, z));
