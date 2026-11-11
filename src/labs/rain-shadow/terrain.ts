import * as THREE from "three";
import { landscapeNoise as noise } from "../shared/landscape-noise.ts";
import { mountainParcel } from "../../lib/atmosphere-science.ts";

/**
 * A mountain range across the wind. 1 scene unit = 3 km along the ground; heights are
 * exaggerated by `f` (2.5 in the teaching view, 1 at true scale). Wind blows toward +x.
 */
export const WIDTH = 6,
  DEPTH = 2.5,
  BASE = -0.2;
export const toScene = (metres: number, f: number) => (metres / 3000) * f;
/** Ridge profile along the wind (m), with the crest at x = 0. */
export const ridge = (x: number, crest: number) => crest * Math.exp((-x * x) / 1.05);
/** Ground height in scene units; the band the parcel crosses (|z| < 0.18) stays smooth. */
export function ground(x: number, z: number, crest: number, f: number) {
  const rough = Math.min(1, Math.max(0, (Math.abs(z) - 0.18) / 0.3)) ** 2;
  return (
    toScene(ridge(x, crest), f) *
    (1 + rough * (0.13 * (noise(x * 4.2, z * 3.1) - 0.5) + 0.07 * (noise(x * 11.3, z * 9.7) - 0.5)))
  );
}

/** Height (m) at which air rising from the windward foot has cooled to `temp` (°C). */
export function windwardHeightAt(temp: number, lcl: number) {
  const atBase = 20 - (9.8 * lcl) / 1000;
  return temp >= atBase ? ((20 - temp) / 9.8) * 1000 : lcl + ((atBase - temp) / 6) * 1000;
}

/** Where cloud, forest, bare rock and snow begin for one ridge and starting humidity. */
export function climate(crest: number, humidity: number) {
  const top = mountainParcel(crest, crest, humidity, false),
    lee = mountainParcel(0, crest, humidity, true),
    lcl = top.lcl,
    freezing = windwardHeightAt(0, lcl);
  return {
    lcl,
    /** The air reaches cloud base before the crest, so cloud forms and rain falls. */
    cloud: crest > lcl,
    /** How strongly the lee is dried by the water the air lost on the way up, 0–1. */
    dryness: Math.min(1, lee.condensedGrams / 3),
    /** Forest grows where the rising air is still above about 7 °C. */
    treeline: windwardHeightAt(7, lcl),
    /** Above the freezing level, precipitation falls as snow; only if cloud forms. */
    snowline: crest > lcl && freezing < crest ? freezing : Infinity,
  };
}
export type Climate = ReturnType<typeof climate>;

const FOREST = new THREE.Color("#4f7638"),
  MEADOW = new THREE.Color("#86915c"),
  STEPPE = new THREE.Color("#b5a273"),
  SAGE = new THREE.Color("#9c9c72"),
  ROCK = new THREE.Color("#8f887c"),
  SNOW = new THREE.Color("#eef3f5");
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/**
 * Ground color: forest on the windward slopes, meadow and bare rock higher up, snow above the
 * freezing level, and drier steppe on the lee as the rain shadow strengthens.
 */
export function groundColor(
  x: number,
  y: number,
  z: number,
  c: Climate,
  f: number,
  out = new THREE.Color(),
) {
  const metres = (y / f) * 3000,
    lee = ss(x, -0.25, 0.95) * c.dryness,
    patch = noise(x * 2.7 + 4, z * 2.7);
  out.copy(FOREST).lerp(STEPPE, lee);
  out.lerp(SAGE, lee * ss(patch, 0.45, 0.75) * 0.6);
  out.lerp(MEADOW, ss(metres, c.treeline - 60, c.treeline + 140) * (1 - lee * 0.5));
  out.lerp(ROCK, ss(metres, c.treeline + 250, c.treeline + 550));
  if (Number.isFinite(c.snowline))
    out.lerp(SNOW, ss(metres + 120 * (patch - 0.5), c.snowline, c.snowline + 120) * 0.95);
  return out;
}

const STOPS: [number, THREE.Color][] = [
  [-10, new THREE.Color("#4f7fd6")],
  [0, new THREE.Color("#7fb4e8")],
  [10, new THREE.Color("#e3d6a2")],
  [20, new THREE.Color("#f0a45a")],
  [30, new THREE.Color("#e5603b")],
];
/** Color for an air temperature (°C): blue when cold, sand when mild, orange to red when warm. */
export function temperatureColor(temp: number, out = new THREE.Color()) {
  if (temp <= STOPS[0][0]) return out.copy(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++)
    if (temp <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1],
        [t1, c1] = STOPS[i];
      return out.copy(c0).lerp(c1, (temp - t0) / (t1 - t0));
    }
  return out.copy(STOPS[STOPS.length - 1][1]);
}

/** Temperature (°C) of air crossing the ridge at x (scene units), from the parcel model. */
export function airTemperature(x: number, crest: number, humidity: number) {
  return mountainParcel(ridge(x, crest), crest, humidity, x > 0).temperature;
}
