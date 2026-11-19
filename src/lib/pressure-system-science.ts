/**
 * A teaching model of a midlatitude depression with a warm and a cold front, and of an
 * anticyclone, on a square map 6.8 units across (1 unit ≈ 300 km, so about 2,000 km). Map x is
 * east and z is south in the Northern Hemisphere; the Southern Hemisphere mirrors the pattern
 * north–south, so its cold front still trails toward the equator. Pressures are in hPa. Winds are
 * relative: the pattern follows the pressure field, but the speeds are not measurements.
 */

export type MapPoint = [x: number, z: number];

/** Half the width of the map. */
export const MAP_HALF = 3.4;
export const LOW_CENTER_HPA = 976;
export const HIGH_CENTER_HPA = 1036;
/** Friction near the ground turns the wind about 25° across the isobars toward low pressure. */
export const FRICTION_TURN_DEGREES = 25;

/** Northern Hemisphere fronts, each starting at the low center. */
const COLD_NH: MapPoint[] = [
  [0, 0],
  [0.32, 0.62],
  [0.5, 1.3],
  [0.42, 2.0],
  [0.12, 2.7],
  [-0.32, 3.4],
];
const WARM_NH: MapPoint[] = [
  [0, 0],
  [0.75, 0.12],
  [1.5, 0.36],
  [2.25, 0.7],
  [3.0, 1.1],
  [3.4, 1.32],
];
/** A point in the warm sector, between the two fronts. */
const WARM_SECTOR_NH: MapPoint = [1.5, 1.4];

const mirror = (p: MapPoint, south: boolean): MapPoint => [p[0], south ? -p[1] : p[1]];
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function frontLines(south: boolean) {
  return {
    cold: COLD_NH.map((p) => mirror(p, south)),
    warm: WARM_NH.map((p) => mirror(p, south)),
    warmSector: mirror(WARM_SECTOR_NH, south),
  };
}

/**
 * Distance from (x, z) to a polyline, how far along the line the nearest point lies, and the side:
 * +1 on the same side as `reference`, −1 on the other.
 */
export function toLine(line: MapPoint[], x: number, z: number, reference?: MapPoint) {
  let distance = Infinity,
    along = 0,
    length = 0,
    side = 1;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i],
      [bx, bz] = line[i + 1],
      dx = bx - ax,
      dz = bz - az,
      span = Math.hypot(dx, dz),
      t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (span * span))),
      d = Math.hypot(x - ax - t * dx, z - az - t * dz);
    if (d < distance) {
      distance = d;
      along = length + t * span;
      if (reference) {
        const here = dx * (z - az) - dz * (x - ax),
          there = dx * (reference[1] - az) - dz * (reference[0] - ax);
        side = Math.sign(here) === Math.sign(there) ? 1 : -1;
      }
    }
    length += span;
  }
  return { distance, along, length, side };
}

/** Sea-level pressure (hPa) of the depression or the anticyclone. */
export function surfacePressure(x: number, z: number, high: boolean, south: boolean) {
  if (high) {
    // A broad, gentle dome of high pressure: few, widely spaced isobars.
    const r2 = (x / 1.12) ** 2 + (z / 0.92) ** 2;
    return HIGH_CENTER_HPA - 16 * (1 - Math.exp(-r2 / 6.8));
  }
  const r2 = (x / 1.06) ** 2 + (z / 0.96) ** 2,
    { cold, warm } = frontLines(south),
    // The fronts meet at the center, where the isobars close around the low.
    away = smoothstep(0.2, 0.9, Math.hypot(x, z));
  let p = LOW_CENTER_HPA + 48 * (1 - Math.exp(-r2 / 5.8));
  // Each front lies in a trough of lower pressure, so isobars kink sharply where they cross it,
  // pointing away from the low. The kink is rounded over a few kilometers, so the wind turns
  // quickly but smoothly across the front.
  for (const line of [cold, warm]) {
    const d = toLine(line, x, z).distance;
    p -= 3 * away * Math.exp(-Math.sqrt(d * d + 0.0064) / 0.22);
  }
  return p;
}

/**
 * Surface wind (relative units) from the pressure field: flow along the isobars, with low pressure
 * on its left in the Northern Hemisphere and on its right in the Southern, turned across the
 * isobars toward low pressure by friction. `north` is toward −z.
 */
export function surfaceWind(x: number, z: number, high: boolean, south: boolean) {
  const h = 0.004,
    east =
      (surfacePressure(x + h, z, high, south) - surfacePressure(x - h, z, high, south)) / (2 * h),
    north =
      -(surfacePressure(x, z + h, high, south) - surfacePressure(x, z - h, high, south)) / (2 * h),
    f = south ? -1 : 1,
    // Balanced flow along the isobars.
    ge = -f * north,
    gn = f * east,
    turn = (f * FRICTION_TURN_DEGREES * Math.PI) / 180,
    c = Math.cos(turn),
    s = Math.sin(turn);
  return { east: (ge * c - gn * s) / 20, north: (ge * s + gn * c) / 20 };
}

/**
 * Where an isobar crosses a ray from the center at `angle` (radians, counterclockwise from east on
 * the map as seen from above), or null if it does not cross within the map.
 */
export function isobarRadius(level: number, angle: number, high: boolean, south: boolean) {
  const at = (r: number) =>
    surfacePressure(r * Math.cos(angle), -r * Math.sin(angle), high, south) - level;
  let lo = 0.02,
    hi = MAP_HALF * 0.97;
  if (Math.sign(at(lo)) === Math.sign(at(hi))) return null;
  for (let k = 0; k < 50; k++) {
    const m = (lo + hi) / 2;
    if (Math.sign(at(m)) === Math.sign(at(lo))) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * Line segments of one contour of `field` over the map (marching squares): a flat list of
 * [x0, z0, x1, z1] for each segment.
 */
export function contourSegments(
  field: (x: number, z: number) => number,
  level: number,
  n = 170,
  half = MAP_HALF,
) {
  const step = (2 * half) / n,
    row = n + 1,
    v = new Float64Array(row * row),
    out: number[] = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) v[j * row + i] = field(-half + i * step, -half + j * step) - level;
  const cut = (a: number, b: number, ax: number, az: number, bx: number, bz: number) => {
    const t = a / (a - b);
    return [ax + t * (bx - ax), az + t * (bz - az)];
  };
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x0 = -half + i * step,
        z0 = -half + j * step,
        x1 = x0 + step,
        z1 = z0 + step,
        a = v[j * row + i],
        b = v[j * row + i + 1],
        c = v[(j + 1) * row + i + 1],
        d = v[(j + 1) * row + i],
        // Crossings on edges ab, bc, cd and da, in that order (null where none).
        e = [
          a < 0 !== b < 0 ? cut(a, b, x0, z0, x1, z0) : null,
          b < 0 !== c < 0 ? cut(b, c, x1, z0, x1, z1) : null,
          c < 0 !== d < 0 ? cut(c, d, x1, z1, x0, z1) : null,
          d < 0 !== a < 0 ? cut(d, a, x0, z1, x0, z0) : null,
        ],
        found = e.filter((p): p is number[] => p !== null);
      if (found.length === 2) out.push(...found[0], ...found[1]);
      else if (found.length === 4) {
        // A saddle: the cell's mean decides which corners the contour separates.
        const [p0, p1, p2, p3] = e as number[][];
        if ((a + b + c + d) / 4 < 0 === a < 0) out.push(...p0, ...p1, ...p2, ...p3);
        else out.push(...p0, ...p3, ...p1, ...p2);
      }
    }
  return out;
}

/**
 * A surface streamline: the path air follows through the wind field from `start`, in steps of
 * equal length, until it reaches the low's center or the edge of the map.
 */
export function streamline(
  start: MapPoint,
  high: boolean,
  south: boolean,
  step = 0.035,
  maxSteps = 400,
) {
  const path: MapPoint[] = [start];
  let [x, z] = start;
  const unit = (px: number, pz: number) => {
    const w = surfaceWind(px, pz, high, south),
      m = Math.hypot(w.east, w.north) || 1;
    return [w.east / m, -w.north / m];
  };
  for (let k = 0; k < maxSteps; k++) {
    const [ax, az] = unit(x, z),
      [bx, bz] = unit(x + 0.5 * step * ax, z + 0.5 * step * az);
    x += step * bx;
    z += step * bz;
    path.push([x, z]);
    if (Math.abs(x) > MAP_HALF - 0.08 || Math.abs(z) > MAP_HALF - 0.08) break;
    if (!high && Math.hypot(x, z) < 0.22) break;
  }
  return path;
}

/**
 * The schematic cloud pattern of the depression (all zero but scattered fair-weather cloud in
 * the anticyclone): cloud cover 0–1, cloud-top height 0–1 and rain 0–1, and weights for the warm
 * sector and the cold air behind the cold front.
 *
 * The broad shield of layered cloud lies ahead of the warm front, where warm air slides up over
 * the cold air; a narrow band of tall shower clouds runs just ahead of the cold front, where the
 * cold air lifts the warm air (about 50 km ahead here); cloud wraps around
 * the poleward side of the low (the comma head); and drier air sweeps in behind the cold front
 * toward the center (the dry slot).
 */
export function cloudPattern(x: number, z: number, high: boolean, south: boolean) {
  if (high) {
    // Sinking air keeps the center clear; only the margins have small, shallow clouds.
    const r = Math.hypot(x / 1.12, z / 0.92);
    return { cover: 0.42 * smoothstep(1.9, 2.9, r), top: 0.12, rain: 0, warmSector: 0, coldAir: 0 };
  }
  const [px, pz] = mirror([x, z], south),
    warm = toLine(WARM_NH, px, pz, WARM_SECTOR_NH),
    cold = toLine(COLD_NH, px, pz, WARM_SECTOR_NH),
    r = Math.hypot(px, pz),
    // Distance ahead of the warm front (into the cold air) and ahead of the cold front.
    aheadWarm = -warm.side * warm.distance,
    aheadCold = cold.side * cold.distance,
    shield = aheadWarm >= 0 ? smoothstep(1.9, 0.55, aheadWarm) : smoothstep(-0.14, 0, aheadWarm),
    band = Math.exp(-(((aheadCold - 0.17) / 0.16) ** 2)) * (1 - (0.45 * cold.along) / cold.length),
    head = Math.exp(-((Math.hypot(px + 0.35, pz + 0.55) / 1.2) ** 2)),
    slot =
      Math.exp(-(((aheadCold + 0.5) / 0.3) ** 2)) * Math.exp(-((r / 1.5) ** 2)) * (1 - head * 0.5),
    cover = Math.min(1, Math.max(shield, band, head * 1.05) * (1 - 0.92 * slot)),
    tower = band * Math.exp(-(((aheadCold - 0.17) / 0.1) ** 2)),
    top = Math.min(1, 0.45 + 0.25 * shield * smoothstep(1.2, 0.2, aheadWarm) + 0.55 * tower),
    rain = Math.max(
      smoothstep(0.75, 0.1, aheadWarm) * smoothstep(-0.12, 0.02, aheadWarm) * shield,
      tower * 1.1,
      head * 0.55,
    );
  return {
    cover,
    top,
    rain: Math.min(1, rain * (1 - slot)),
    // Where patchy cloud belongs: low cloud in the warm sector between the fronts, and scattered
    // showers in the cold air behind the cold front, away from the low.
    warmSector: smoothstep(0, 0.3, aheadCold) * smoothstep(0, 0.3, -aheadWarm),
    coldAir: smoothstep(0.3, 1, -aheadCold) * smoothstep(1.2, 2, r) * (1 - shield),
  };
}
