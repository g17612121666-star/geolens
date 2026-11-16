import * as THREE from "three";

/** A finite illustrative release from the center of the tank, not a calculated settling speed. */
export function densityParcelHeight(t: number, densityDifference: number) {
  const direction = Math.abs(densityDifference) < 0.005 ? 0 : Math.sign(densityDifference);
  return -1 - direction * 0.76 * Math.max(0, Math.min(1, t));
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/**
 * Schematic temperature (°C) of the water at x across the section (tropical coast at the left,
 * polar coast at the right) and depth in meters: a warm surface layer over a sharp thermocline,
 * above cold deep water at about 2 °C. The warm layer thins toward the pole until the cold water
 * reaches the surface, where it can sink. Shapes are illustrative, not a measured section.
 */
export function waterTemperature(x: number, depthM: number) {
  const across = clamp((x + 2) / 4, 0, 1),
    surface = 27 - 26 * across ** 1.3,
    thermocline = 50 + 800 * (1 - across) ** 1.2;
  return DEEP_T + (surface - DEEP_T) * Math.exp(-depthM / thermocline);
}
const DEEP_T = 2;
/** Depth (m) of an isotherm at x, or null where the water there is colder all the way up. */
export function isothermDepth(x: number, celsius: number) {
  const surface = waterTemperature(x, 0);
  if (surface <= celsius || celsius <= DEEP_T) return null;
  const across = clamp((x + 2) / 4, 0, 1),
    thermocline = 50 + 800 * (1 - across) ** 1.2;
  return thermocline * Math.log((surface - DEEP_T) / (celsius - DEEP_T));
}
const STOPS: [number, THREE.Color][] = [
  [0, new THREE.Color("#13315c")],
  [3, new THREE.Color("#1f4f86")],
  [8, new THREE.Color("#2f7ea6")],
  [14, new THREE.Color("#6fb1a6")],
  [20, new THREE.Color("#e2c27a")],
  [27, new THREE.Color("#e5793f")],
];
export function temperatureColour(celsius: number, out: THREE.Color) {
  if (celsius <= STOPS[0][0]) return out.copy(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++)
    if (celsius <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1],
        [b, cb] = STOPS[i];
      return out.copy(ca).lerp(cb, (celsius - a) / (b - a));
    }
  return out.copy(STOPS[STOPS.length - 1][1]);
}
