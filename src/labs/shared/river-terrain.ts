import * as THREE from "three";
import { terrainBlockGeometry } from "./science-geometry.ts";
import { landscapeNoise, landscapeRandom } from "./landscape-noise.ts";
export const riverZ = (x: number) => Math.sin(x * 2.25) * (0.14 + (0.55 * (x + 3)) / 6);
export const riverBed = (x: number) => 0.05 + 1.6 * ((3 - x) / 6) ** 2;
const progress = (x: number) => THREE.MathUtils.clamp((x + 3) / 6, 0, 1);
/** An illustrative channel section, not a discharge/stage rating curve. */
export function riverSection(x: number, side: number) {
  const s = progress(x),
    bend = Math.sin(x * 2.25),
    inner = -side * bend;
  return {
    width: (0.135 + 0.2 * s) * (1 + 0.23 * inner),
    // Channels deepen as well as widen downstream (Bradshaw model).
    depth: 0.15 + 0.05 * s,
    exponent: 2.2 - 0.75 * inner,
  };
}
/** Water surface: deeper downstream for the same discharge setting, as discharge grows downstream. */
export function riverStage(x: number, discharge: number) {
  const s = progress(x);
  return (
    riverBed(x) +
    (0.045 + 0.03 * s) +
    (0.06 + 0.035 * s) * Math.sqrt(THREE.MathUtils.clamp(discharge, 0.2, 1.6))
  );
}
export function riverLand(x: number, z: number) {
  const offset = z - riverZ(x),
    d = Math.abs(offset),
    s = progress(x),
    { width, depth, exponent } = riverSection(x, Math.sign(offset) || 1);
  if (d <= width) return riverBed(x) + depth * (d / width) ** exponent;
  const beyond = d - width;
  // Low floodplain grades into broad, uneven valley sides; no clipped plateau or uniform trench wall.
  const valleyWidth = 0.5 + 0.55 * s,
    valleyRise = (0.3 * (1 - s) ** 1.7 + 0.035) * (1 - Math.exp(-((beyond / valleyWidth) ** 2)));
  const hummocks =
    (0.014 + 0.014 * (1 - s)) *
    (Math.sin(x * 2.1 + z * 3.2) + 0.5 * Math.sin(x * 4.4 - z * 1.5)) *
    Math.min(1, beyond * 2);
  return riverBed(x) + depth + 0.012 * beyond + valleyRise + hummocks;
}
/** Height on the displayed terrain triangles, including their interpolation near steep banks. */
export function riverGround(x: number, z: number) {
  const n = 256,
    gx = THREE.MathUtils.clamp(((x + 3) / 6) * n, 0, n),
    gz = THREE.MathUtils.clamp(((z + 2) / 4) * n, 0, n);
  const ix = Math.min(n - 1, Math.floor(gx)),
    iz = Math.min(n - 1, Math.floor(gz)),
    a = gx - ix,
    b = gz - iz;
  const x0 = -3 + (ix * 6) / n,
    z0 = -2 + (iz * 4) / n;
  const h00 = riverLand(x0, z0),
    h10 = riverLand(x0 + 6 / n, z0),
    h01 = riverLand(x0, z0 + 4 / n),
    h11 = riverLand(x0 + 6 / n, z0 + 4 / n);
  return a + b <= 1
    ? h00 * (1 - a - b) + h10 * a + h01 * b
    : h11 * (a + b - 1) + h01 * (1 - a) + h10 * (1 - b);
}
/** Both wet edges are intersections of one stage with the fixed bed, never independent ribbons. */
export function riverBanks(x: number, discharge: number): [number, number] {
  const stage = riverStage(x, discharge),
    center = riverZ(x);
  return [-1, 1].map((side) => {
    let low = 0,
      high = riverSection(x, side).width + 0.04;
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (riverGround(x, center + side * mid) < stage) low = mid;
      else high = mid;
    }
    return center + (side * (low + high)) / 2;
  }) as [number, number];
}
export function riverSurface(discharge: number, factor = 1) {
  const g = new THREE.BufferGeometry(),
    p: number[] = [],
    uv: number[] = [],
    depths: number[] = [],
    idx: number[] = [],
    along = 320,
    across = 20;
  let distance = 0;
  for (let i = 0; i <= along; i++) {
    const x = -3 + (i / along) * 6,
      [left, right] = riverBanks(x, discharge),
      stage = riverStage(x, discharge);
    if (i) {
      const previous = x - 6 / along;
      distance += Math.hypot(x - previous, riverZ(x) - riverZ(previous));
    }
    for (let j = 0; j <= across; j++) {
      const z = THREE.MathUtils.lerp(left, right, j / across);
      p.push(x, stage * factor + 0.001, z);
      uv.push(distance, z - riverZ(x));
      depths.push(Math.max(0, stage - riverGround(x, z)));
      if (i < along && j < across) {
        const a = i * (across + 1) + j,
          b = a + across + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("waterDepth", new THREE.Float32BufferAttribute(depths, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const MOOR = [new THREE.Color("#86755a"), new THREE.Color("#8d8f58")],
  PASTURE = new THREE.Color("#7f9d55"),
  MEADOW = new THREE.Color("#93ad62"),
  FIELDS = ["#7f9b52", "#98ab5e", "#b6a965", "#6f8a48", "#a5a65b", "#88a157"].map(
    (c) => new THREE.Color(c),
  ),
  GRAVEL = new THREE.Color("#9a8e72"),
  BAR = new THREE.Color("#c4b48e");

/** Illustrative land cover: moorland upstream, pasture, then a patchwork of floodplain fields. */
function riverCover(x: number, z: number, out: THREE.Color) {
  const offset = z - riverZ(x),
    d = Math.abs(offset),
    s = progress(x),
    side = Math.sign(offset) || 1,
    { width } = riverSection(x, side),
    rise = riverLand(x, z) - riverBed(x),
    n = landscapeNoise(x * 2.2 + 5, z * 2.2);
  // Field boundaries follow gently curving hedgerows.
  const u = (x + 0.25 * Math.sin(z * 1.4)) / 0.5,
    v = (z + 0.2 * Math.sin(x * 1.2)) / 0.38,
    edge = Math.min(
      u - Math.floor(u),
      1 - u + Math.floor(u),
      v - Math.floor(v),
      1 - v + Math.floor(v),
    );
  const field =
    FIELDS[Math.floor(landscapeRandom(Math.floor(u) * 31.7 + Math.floor(v) * 17.3) * 6)];
  out.copy(MOOR[0]).lerp(MOOR[1], n);
  out.lerp(PASTURE, THREE.MathUtils.smoothstep(s, 0.2, 0.45));
  const farmed =
    THREE.MathUtils.smoothstep(s, 0.5, 0.7) * (1 - THREE.MathUtils.smoothstep(rise, 0.32, 0.5));
  out.lerp(field, farmed);
  if (farmed > 0.5 && edge < 0.06) out.multiplyScalar(0.7);
  out.lerp(MEADOW, (1 - THREE.MathUtils.smoothstep(d / width, 1.2, 2.2)) * 0.6);
  // Higher, steeper upland ground is rougher grazing and heather.
  out.lerp(MOOR[0], THREE.MathUtils.smoothstep(rise, 0.35, 0.7) * 0.6);
  // Gravel bed, with pale bars on the inside of bends.
  const inner = -side * Math.sin(x * 2.25);
  out.lerp(BAR, inner > 0.35 ? 1 - THREE.MathUtils.smoothstep(d / width, 0.95, 1.35) : 0);
  out.lerp(GRAVEL, 1 - THREE.MathUtils.smoothstep(d / width, 0.82, 1.05));
  out.multiplyScalar(0.92 + 0.16 * landscapeNoise(x * 9, z * 9));
  return out;
}

export function riverTerrain(factor = 1) {
  const g = terrainBlockGeometry((x, z) => riverLand(x, z) * factor, 6, 4, 256, -0.18 * factor),
    p = g.attributes.position,
    colors: number[] = [],
    surface = new Float32Array(p.count),
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    riverCover(x, z, c);
    colors.push(c.r, c.g, c.b);
    surface[i] = riverLand(x, z) * factor;
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  // Ground height above each vertex, for cut-face shaders that measure depth below the surface.
  g.setAttribute("surfaceY", new THREE.BufferAttribute(surface, 1));
  return g;
}

/** Arc-length mapped water mesh, preserving width through a vertical fall. */
export function waterRibbonGeometry(path: [number, number, number][], width = 0.12) {
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  let distance = 0,
    headingX = 1,
    headingZ = 0;
  path.forEach((a, i) => {
    const b = path[Math.min(path.length - 1, i + 1)],
      prev = path[Math.max(0, i - 1)];
    let dx = b[0] - prev[0],
      dz = b[2] - prev[2];
    // Keep the cross-channel frame through steep falls: a tiny change in x must not flip both banks.
    const horizontal = Math.hypot(dx, dz),
      total = Math.hypot(dx, b[1] - prev[1], dz);
    if (horizontal < 1e-7 || horizontal < total * 0.25) {
      dx = headingX;
      dz = headingZ;
    } else {
      headingX = dx / horizontal;
      headingZ = dz / horizontal;
    }
    const len = Math.hypot(dx, dz);
    if (i) distance += Math.hypot(a[0] - prev[0], a[1] - prev[1], a[2] - prev[2]);
    for (const side of [-1, 1]) {
      p.push(a[0] - (side * width * dz) / len, a[1], a[2] + (side * width * dx) / len);
      uv.push(distance, side === -1 ? 0 : 1);
    }
    if (i < path.length - 1) {
      const j = i * 2;
      idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
