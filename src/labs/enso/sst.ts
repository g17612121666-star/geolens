import * as THREE from "three";

/** The ocean block: x from west (−2.5, toward Indonesia) to east (2.5, toward Peru); z runs
 * across the equator (z = 0), so the top face reads like a map of the equatorial Pacific. */
export const OCEAN = { west: -2.5, east: 2.5, depth: 1.6 };

/**
 * Idealized sea-surface temperature (°C). Warm water pools in the west; in the east the
 * coldest water lies in a tongue along the equator, where upwelling is strongest. `west`
 * and `east` are the section's equatorial temperatures at each end. Teaching values only.
 */
export function seaSurfaceTemperature(x: number, z: number, west: number, east: number) {
  const u = THREE.MathUtils.smoothstep((x - OCEAN.west) / (OCEAN.east - OCEAN.west), 0.22, 0.95),
    tongue = 0.55 + 0.45 * Math.exp(-((z / 0.32) ** 2));
  return west + (east - west) * u * tongue;
}

/** Where the `level` isotherm crosses latitude z, or null if it does not. */
export function isothermX(level: number, z: number, west: number, east: number) {
  const at = (x: number) => seaSurfaceTemperature(x, z, west, east);
  let a = OCEAN.west,
    b = OCEAN.east;
  const ta = at(a) - level,
    tb = at(b) - level;
  if (ta === 0) return a;
  if (Math.sign(ta) === Math.sign(tb)) return null;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (Math.sign(at(m) - level) === Math.sign(ta)) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

const STOPS: [number, string][] = [
  [20, "#22549e"],
  [23, "#2a8fb0"],
  [25.5, "#4fae74"],
  [27, "#e2c445"],
  [28.5, "#ec8a35"],
  [30, "#d2432f"],
];
const RAMP = STOPS.map(([t, hex]) => [t, new THREE.Color(hex)] as const);
/** Map colors for sea-surface temperature, as on a satellite temperature chart. */
export function sstColor(temp: number, out = new THREE.Color()) {
  if (temp <= RAMP[0][0]) return out.copy(RAMP[0][1]);
  for (let i = 1; i < RAMP.length; i++)
    if (temp <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1],
        [t1, c1] = RAMP[i];
      return out.copy(c0).lerp(c1, (temp - t0) / (t1 - t0));
    }
  return out.copy(RAMP[RAMP.length - 1][1]);
}
/** CSS gradient for the readout's color key, matching `sstColor`. */
export const SST_GRADIENT = `linear-gradient(90deg, ${STOPS.map(
  ([t, hex]) => `${hex} ${(((t - 20) / 10) * 100).toFixed(0)}%`,
).join(", ")})`;
