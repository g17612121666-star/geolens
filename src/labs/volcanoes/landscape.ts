import * as THREE from "three";
import { farmland, fbm } from "../shared/hazard-utils.ts";
import { edifice, edificeHeight, summit, type Edifice } from "./geometry.ts";

/** Block size, base and the schematic magma chamber (center height, half-width, half-height). */
export const SX = 4.9,
  SZ = 4.3,
  BASE = -0.95,
  CHAMBER = { y: -0.6, a: 0.62, b: 0.2 };
/** "Compare physical scale" divides the teaching heights by about 2.5. */
export const TRUE_RELIEF = 0.4;
/** The fissure runs along z (toward the viewer) between ±FISSURE_HALF. */
export const FISSURE_HALF = 1.65;

const GRID = 256;
const smooth = THREE.MathUtils.smoothstep;

/**
 * A smooth noise field sampled once over the block (plus a margin), then read back by bilinear
 * interpolation. Rebuilding the landscape while a slider moves then costs far less.
 */
function cachedField(f: (x: number, z: number) => number, n = 256) {
  let data: Float32Array | null = null;
  const pad = 0.25,
    x0 = -SX / 2 - pad,
    z0 = -SZ / 2 - pad,
    w = SX + 2 * pad,
    d = SZ + 2 * pad;
  return (x: number, z: number) => {
    if (!data) {
      data = new Float32Array((n + 1) * (n + 1));
      for (let j = 0; j <= n; j++)
        for (let i = 0; i <= n; i++) data[j * (n + 1) + i] = f(x0 + (i / n) * w, z0 + (j / n) * d);
    }
    const u = THREE.MathUtils.clamp(((x - x0) / w) * n, 0, n - 1e-6),
      v = THREE.MathUtils.clamp(((z - z0) / d) * n, 0, n - 1e-6),
      i = Math.floor(u),
      j = Math.floor(v),
      fu = u - i,
      fv = v - j,
      r = n + 1;
    return (
      (data[j * r + i] * (1 - fu) + data[j * r + i + 1] * fu) * (1 - fv) +
      (data[(j + 1) * r + i] * (1 - fu) + data[(j + 1) * r + i + 1] * fu) * fv
    );
  };
}
const plain = cachedField(
  (x, z) => 0.05 * (fbm(x * 0.6 + 4, z * 0.6 - 2) - 0.5) + 0.015 * (fbm(x * 3, z * 3) - 0.5),
);
const roughness = cachedField((x, z) => 0.006 * (fbm(x * 6.5 + 2, z * 6.5 - 1) - 0.5));
const broadNoise = cachedField((x, z) => fbm(x * 2.2 + 1, z * 2.2));
const fineNoise = cachedField((x, z) => fbm(x * 9 + 3, z * 9 - 2), 400);
/** Field colors at the terrain's grid vertices, which do not change with the sliders. */
const countryCache = new Map<number, Float32Array>();

/** A vertical cut face: it starts at `origin` (x, z) and runs `length` along `dir`. */
export type Face = { origin: [number, number]; dir: [number, number]; length: number };

/** Eruption styles, in the order the shader expects them. */
export const STYLE = { effusive: 0, fountain: 1, dome: 2, explosive: 3 } as const;

/** Wedge faces for a central vent: half-angle `opening` either side of +z, out to the block. */
export function wedgeFaces(opening: number): Face[] {
  const s = Math.sin(opening),
    c = Math.cos(opening),
    length = Math.min(s > 1e-4 ? SX / 2 / s : Infinity, c > 1e-4 ? SZ / 2 / c : Infinity);
  return [
    { origin: [0, 0], dir: [s, c], length },
    { origin: [0, 0], dir: [-s, c], length },
  ];
}

export type FlowPath = { points: [number, number][]; width: number; thickness: number };

export type Landscape = {
  e: Edifice;
  k: number;
  fissure: boolean;
  /** Surface without lava-flow relief. */
  ground: (x: number, z: number) => number;
  /** Final surface: ground plus the relief of older lava flows. */
  h: (x: number, z: number) => number;
  /** 0 bare, otherwise the age of the lava at a point: 1 youngest … small values oldest. */
  lavaAge: (x: number, z: number) => number;
  /** Crater floor (vent) and rim heights, scaled. For a fissure, the vent is at the surface. */
  vent: number;
  rim: number;
};

/** Follow the surface downhill from a start point, drifting a little from side to side. */
export function traceFlow(
  surface: (x: number, z: number) => number,
  start: [number, number],
  length: number,
  seed: number,
  heading?: [number, number],
): [number, number][] {
  const pts: [number, number][] = [start];
  let [x, z] = start,
    travelled = 0,
    [dx, dz] = heading ?? [x, z];
  const n0 = Math.hypot(dx, dz) || 1;
  dx /= n0;
  dz /= n0;
  const step = 0.025,
    e = 0.03;
  while (travelled < length && pts.length < 400) {
    const gx = (surface(x + e, z) - surface(x - e, z)) / (2 * e),
      gz = (surface(x, z + e) - surface(x, z - e)) / (2 * e),
      g = Math.hypot(gx, gz);
    // Mostly downhill, with inertia so a flow does not stall in small hollows.
    let nx = dx * 0.55,
      nz = dz * 0.55;
    if (g > 1e-4) {
      nx -= (gx / g) * 0.45;
      nz -= (gz / g) * 0.45;
    }
    const wiggle =
      0.35 * Math.sin(travelled * 9 + seed * 3.7) + 0.2 * Math.sin(travelled * 23 + seed);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    dx = nx - nz * wiggle * 0.25;
    dz = nz + nx * wiggle * 0.25;
    const l2 = Math.hypot(dx, dz) || 1;
    dx /= l2;
    dz /= l2;
    x += dx * step;
    z += dz * step;
    travelled += step;
    if (Math.abs(x) > SX / 2 - 0.05 || Math.abs(z) > SZ / 2 - 0.05) break;
    pts.push([x, z]);
  }
  return pts;
}

/** Deterministic pseudo-random number in 0..1. */
export const rand = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function makeLandscape(v: number, fissure: boolean, k: number): Landscape {
  const e = edifice(v),
    top = summit(e);
  const ground = fissure
    ? (x: number, z: number) => {
        const along = 1 - smooth(Math.abs(z), FISSURE_HALF - 0.1, FISSURE_HALF + 0.2);
        // A low rift ridge, so lava drains away on both sides; spatter ramparts line the crack.
        let y =
          plain(x, z) * 0.6 +
          0.07 * Math.exp(-((x / 1.1) ** 2)) * (1 - smooth(Math.abs(z), 1.6, 2.6)) +
          along *
            (0.04 * Math.exp(-(((Math.abs(x) - 0.1) / 0.045) ** 2)) -
              0.045 * Math.exp(-((x / 0.035) ** 2)));
        for (const [cz, size] of [
          [-1.05, 1],
          [0.55, 0.8],
        ]) {
          const d = Math.hypot(x, z - cz) / (0.26 * size);
          if (d < 1) y += 0.11 * size * (1 - d) ** 1.4 - 0.05 * size * Math.exp(-((d / 0.32) ** 2));
        }
        return y + roughness(x, z) * 0.6 + 0.004;
      }
    : (x: number, z: number) => {
        const r = Math.hypot(x, z),
          phi = Math.atan2(x, z),
          blend = smooth(r, e.radius * 0.85, e.radius * 1.12);
        return (
          edificeHeight(e, r, phi) * k +
          blend * plain(x, z) +
          (1 - blend) * roughness(x, z) * k +
          0.004
        );
      };

  // Older lava flows: a grid of thickness and age, stamped along traced paths.
  const thickness = new Float32Array((GRID + 1) * (GRID + 1)),
    age = new Float32Array((GRID + 1) * (GRID + 1));
  const flows: (FlowPath & { age: number })[] = [];
  if (fissure) {
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1,
        z0 = -1.6 + (i / 8) * 3.2 + (rand(i + 4) - 0.5) * 0.3;
      flows.push({
        points: traceFlow(ground, [side * 0.16, z0], 1.2 + 1.4 * rand(i * 3.3), i, [side, 0]),
        width: 0.12 + 0.08 * rand(i + 9),
        thickness: 0.008,
        age: 0.15 + 0.7 * (i / 8),
      });
    }
  } else {
    const count = Math.round(11 - 7 * e.form);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399 + 0.6,
        r0 = e.craterRadius * 1.08,
        reach = e.radius * (0.55 + 0.45 * rand(i * 1.7)) * (1 - 0.45 * e.form);
      flows.push({
        points: traceFlow(ground, [Math.sin(a) * r0, Math.cos(a) * r0], reach, i),
        width: (0.055 + 0.03 * rand(i + 2)) * (1 + 0.7 * e.form),
        thickness: (0.009 + 0.004 * rand(i + 5)) * (1 + 1.6 * e.form) * k,
        age: 0.1 + 0.85 * (i / Math.max(1, count - 1)),
      });
    }
  }
  const cx = SX / GRID,
    cz = SZ / GRID;
  for (const f of flows) {
    const n = f.points.length;
    f.points.forEach(([px, pz], j) => {
      const w = f.width * (1 + 0.6 * (j / n) ** 2),
        i0 = Math.max(0, Math.floor((px - w + SX / 2) / cx)),
        i1 = Math.min(GRID, Math.ceil((px + w + SX / 2) / cx)),
        k0 = Math.max(0, Math.floor((pz - w + SZ / 2) / cz)),
        k1 = Math.min(GRID, Math.ceil((pz + w + SZ / 2) / cz));
      for (let gi = i0; gi <= i1; gi++)
        for (let gk = k0; gk <= k1; gk++) {
          const d = Math.hypot(-SX / 2 + gi * cx - px, -SZ / 2 + gk * cz - pz);
          if (d > w) continue;
          const cover = 1 - smooth(d, w * 0.55, w),
            idx = gk * (GRID + 1) + gi;
          thickness[idx] = Math.max(thickness[idx], f.thickness * cover);
          if (cover > 0.35) age[idx] = f.age;
        }
    });
  }
  const sample = (grid: Float32Array, x: number, z: number) => {
    const u = THREE.MathUtils.clamp((x + SX / 2) / cx, 0, GRID - 1e-6),
      w = THREE.MathUtils.clamp((z + SZ / 2) / cz, 0, GRID - 1e-6),
      i = Math.floor(u),
      j = Math.floor(w),
      fu = u - i,
      fw = w - j,
      a = grid[j * (GRID + 1) + i],
      b = grid[j * (GRID + 1) + i + 1],
      c = grid[(j + 1) * (GRID + 1) + i],
      d = grid[(j + 1) * (GRID + 1) + i + 1];
    return (a * (1 - fu) + b * fu) * (1 - fw) + (c * (1 - fu) + d * fu) * fw;
  };
  const lavaAge = (x: number, z: number) => {
    const u = Math.round(THREE.MathUtils.clamp((x + SX / 2) / cx, 0, GRID)),
      w = Math.round(THREE.MathUtils.clamp((z + SZ / 2) / cz, 0, GRID));
    return age[w * (GRID + 1) + u];
  };
  const h = (x: number, z: number) => ground(x, z) + sample(thickness, x, z);
  return {
    e,
    k,
    fissure,
    ground,
    h,
    lavaAge,
    vent: fissure ? ground(0, 0) : top.floor * k + 0.004,
    rim: fissure ? ground(0.1, 0) : top.rim * k + 0.004,
  };
}

/** Vertex colors: older and younger lava, ash, forest, farmland, cinder and snow. */
export function paintLandscape(g: THREE.BufferGeometry, L: Landscape, n: number) {
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3),
    { e, k } = L,
    tall = e.height * k > 0.95,
    top = (n + 1) * (n + 1);
  let fields = countryCache.get(n);
  if (!fields) {
    fields = new Float32Array(top * 3);
    for (let i = 0; i < top; i++) {
      const f = farmland(p.getX(i), p.getZ(i));
      fields.set([f.r, f.g, f.b], i * 3);
    }
    countryCache.set(n, fields);
  }
  const C = (hex: string) => new THREE.Color(hex);
  const PALETTE = {
    forest: C("#4d6a3a"),
    oldLava: C("#4e4137"),
    youngLava: C("#1d1a19"),
    plateau: C("#3d3834"),
    plateau2: C("#565049"),
    spatter: C("#6e3a28"),
    spatter2: C("#4a2a20"),
    shield: C("#4b4038"),
    shield2: C("#5f5044"),
    scrub: C("#5c7442"),
    ash: C("#857c70"),
    paleAsh: C("#a39a8d"),
    scree: C("#6b6359"),
    coneForest: C("#4a6638"),
    snow: C("#eef2f3"),
    floor: C("#231e1c"),
    cinder: C("#6b3c2b"),
    wall: C("#7a6a58"),
  };
  const col = new THREE.Color(),
    cone = new THREE.Color(),
    tmp = new THREE.Color(),
    country = new THREE.Color();
  // Only the top surface uses vertex colors; the sides and base use the rock material.
  for (let i = 0; i < top; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      n = broadNoise(x, z),
      fine = fineNoise(x, z);
    // Countryside: fields with patches of woodland.
    country.fromArray(fields, i * 3).lerp(PALETTE.forest, smooth(n, 0.52, 0.62) * 0.9);
    const lava = L.lavaAge(x, z),
      lavaColor = tmp.copy(PALETTE.oldLava).lerp(PALETTE.youngLava, lava);
    if (L.fissure) {
      col.copy(PALETTE.plateau).lerp(PALETTE.plateau2, n * 0.8);
      col.lerp(country, smooth(Math.abs(x), 1.0, 1.9) * 0.9);
      if (lava > 0) col.lerp(lavaColor, 0.9);
      // Red-brown oxidized spatter along the fissure and on the cones.
      const spatter =
        (1 - smooth(Math.abs(x), 0.12, 0.24)) *
          (1 - smooth(Math.abs(z), FISSURE_HALF - 0.1, FISSURE_HALF + 0.1)) +
        (1 - smooth(Math.hypot(x, z + 1.05), 0.1, 0.27)) +
        (1 - smooth(Math.hypot(x, z - 0.55), 0.08, 0.22));
      col.lerp(tmp.copy(PALETTE.spatter).lerp(PALETTE.spatter2, fine), Math.min(1, spatter) * 0.85);
    } else {
      const r = Math.hypot(x, z),
        u = r / e.radius,
        rel = (y - 0.004) / Math.max(0.05, L.rim),
        outer = smooth(u, 0.9, 1.12);
      // Shield: weathered older basalt, greening on the lower flanks.
      col
        .copy(PALETTE.shield)
        .lerp(PALETTE.shield2, n * 0.7)
        .lerp(PALETTE.scrub, smooth(u, 0.5, 0.95) * smooth(n, 0.38, 0.62) * 0.8);
      // Composite: pale ash and scree above the tree line, forest below, snow on a tall cone.
      cone
        .copy(PALETTE.ash)
        .lerp(PALETTE.paleAsh, smooth(rel, 0.45, 0.8) * 0.8)
        .lerp(PALETTE.scree, fine * 0.35)
        .lerp(
          PALETTE.coneForest,
          (1 - smooth(rel, 0.22, 0.42)) * smooth(n + fine * 0.3, 0.3, 0.55),
        );
      if (tall) cone.lerp(PALETTE.snow, smooth(rel, 0.74, 0.84) * smooth(fine, 0.15, 0.4) * 0.95);
      col.lerp(cone, e.form);
      if (lava > 0) col.lerp(lavaColor, 0.85 - 0.3 * e.form);
      // Crater and caldera: dark fresh lava on the floor, red-brown cinder on the walls.
      if (r < e.craterRadius * 1.15) {
        const wall = smooth(r, e.craterRadius * 0.55, e.craterRadius * 1.1);
        col.lerp(
          tmp.copy(PALETTE.floor).lerp(PALETTE.cinder, wall * (0.4 + 0.6 * e.form)),
          1 - smooth(r, e.craterRadius * 0.95, e.craterRadius * 1.15),
        );
      }
      col.lerp(country, outer * 0.92);
    }
    c.set([col.r, col.g, col.b], i * 3);
  }
  for (let i = top; i < p.count; i++)
    c.set([PALETTE.wall.r, PALETTE.wall.g, PALETTE.wall.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
}

/**
 * Height of the rendered terrain mesh (bilinear between its grid vertices), so draped
 * objects such as lava flows sit on the drawn surface rather than the exact function, which
 * the mesh cuts below in hollows.
 */
export function meshSurface(g: THREE.BufferGeometry, n: number) {
  const p = g.attributes.position,
    cx = SX / n,
    cz = SZ / n;
  return (x: number, z: number) => {
    const u = THREE.MathUtils.clamp((x + SX / 2) / cx, 0, n - 1e-6),
      w = THREE.MathUtils.clamp((z + SZ / 2) / cz, 0, n - 1e-6),
      i = Math.floor(u),
      j = Math.floor(w),
      fu = u - i,
      fw = w - j,
      at = (a: number, b: number) => p.getY(b * (n + 1) + a);
    return (
      (at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fw) +
      (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fw
    );
  };
}
