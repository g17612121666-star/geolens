import * as THREE from "three";
import { landscapeNoise, landscapeRandom } from "./landscape-noise";

/** Two-octave value noise, roughly 0–1. */
export const fbm = (x: number, z: number) =>
  0.62 * landscapeNoise(x, z) + 0.38 * landscapeNoise(x * 2.13 + 7.1, z * 2.13 - 3.4);

export type Building = {
  x: number;
  z: number;
  /** Footprint width, depth and wall height in scene units. */
  w: number;
  d: number;
  h: number;
  rot: number;
  wall: string;
  roof: string;
};

const WALLS = ["#e6dccb", "#d9cdb8", "#efe7da", "#cbbfae", "#ddd2c4"];
const ROOFS = ["#9c4a35", "#7d3f31", "#5d5f63", "#8a5a3c", "#a8573d"];

/** A loose settlement of small pitched-roof buildings around a centre. Deterministic. */
export function settlement(
  cx: number,
  cz: number,
  count: number,
  spread: number,
  size: number,
  seed = 1,
  inside: (x: number, z: number) => boolean = () => true,
): Building[] {
  const out: Building[] = [];
  for (let i = 0; out.length < count && i < count * 6; i++) {
    const a = i * 2.399 + seed,
      r = spread * Math.sqrt((i + 0.5) / count) * (0.75 + 0.5 * landscapeRandom(seed + i * 3.1)),
      x = cx + r * Math.cos(a),
      z = cz + r * Math.sin(a);
    if (!inside(x, z)) continue;
    const k = landscapeRandom(seed * 7 + i);
    out.push({
      x,
      z,
      w: size * (0.8 + 0.6 * k),
      d: size * (0.65 + 0.4 * landscapeRandom(i + seed * 3)),
      h: size * (0.55 + 0.5 * landscapeRandom(i * 1.7 + seed)),
      rot: Math.round(landscapeRandom(i * 5.3 + seed) * 4) * (Math.PI / 2) + 0.15 * Math.sin(i),
      wall: WALLS[i % WALLS.length],
      roof: ROOFS[(i * 3 + seed) % ROOFS.length],
    });
  }
  return out;
}

/** Field patchwork colour for lowland farmland, with hedgerow-darkened borders. */
export function farmland(x: number, z: number, cell = 0.42) {
  const u = (x + 0.3 * Math.sin(z * 1.3)) / cell,
    v = (z + 0.2 * Math.sin(x * 1.1)) / (cell * 0.8),
    i = Math.floor(u),
    j = Math.floor(v),
    k = landscapeRandom(i * 31.7 + j * 17.3),
    fields = ["#7f9b52", "#93a95c", "#b3a863", "#6f8a48", "#a2a35a", "#88a157"],
    edge = Math.min(u - i, 1 - (u - i), v - j, 1 - (v - j));
  const colour = new THREE.Color(fields[Math.floor(k * fields.length)]);
  if (edge < 0.05) colour.multiplyScalar(0.72);
  return colour;
}
