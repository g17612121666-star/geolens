/**
 * Plate surfaces for the hotspot sections: the Hawaiian chain on oceanic lithosphere and the
 * Yellowstone track on continental crust. Shapes are schematic; relief is not to scale.
 */
import * as THREE from "three";
import { fbm } from "../shared/hazard-utils.ts";

export const W = 6,
  D = 2,
  PLUME_X = -1.8,
  SPACING = 0.95,
  SEA = 0.2,
  MANTLE_BASE = -1.85;

export type Setting = {
  continental: boolean;
  top: number;
  plateBase: number;
};
export const OCEAN: Setting = { continental: false, top: -0.16, plateBase: -0.62 };
export const LAND: Setting = { continental: true, top: 0.42, plateBase: -0.78 };

/** Hawaiian volcanoes on the track, youngest first: height above the sea floor and radius.
 * The active shield is the broadest and tallest; older volcanoes have eroded and subsided. */
export const SHIELDS = [
  { peak: 0.76, radius: 0.64 },
  { peak: 0.62, radius: 0.36 },
  { peak: 0.5, radius: 0.42 },
];
/** The active shield's summit caldera and the pit crater inside it, from the vent (plate frame). */
export const CALDERA = { x: 0.02, z: -0.02, radius: 0.13 },
  PIT = { x: -0.03, z: 0.01, radius: 0.05 };
const ss = THREE.MathUtils.smoothstep;
/** Profile of the young seamount over the plume: a small, rounded shield with a summit pit. */
export const SEAMOUNT = Array.from({ length: 33 }, (_, i) => {
  const r = 0.3 * (1 - i / 32),
    dome = (Math.exp(-((r / 0.15) ** 2)) - Math.exp(-4)) / (1 - Math.exp(-4)),
    pit = 0.04 * Math.exp(-((r / 0.03) ** 2));
  return new THREE.Vector2(r, 0.3 * dome - pit);
});

/** Height above the sea floor of Hawaiian volcano i, at (dx, z) from the place where it formed. */
export function volcano(i: number, dx: number, z: number) {
  const r = Math.hypot(dx, z),
    a = Math.atan2(z, dx);
  if (i === 0) {
    // A broad, gentle dome built by thin basalt flows, slightly lobed, stretched along rift zones
    // that run northeast and southwest (±z). Its summit caldera has a flat floor of ponded lava,
    // with a deeper pit crater inside it.
    const { peak, radius } = SHIELDS[0],
      lobes = 1 + 0.08 * (fbm(Math.cos(a) * 1.3 + 4, Math.sin(a) * 1.3 + 2) - 0.5),
      dome = peak * Math.exp(-((r / (radius * lobes)) ** 2)),
      rift = 0.035 * Math.exp(-((dx / 0.09) ** 2)) * Math.exp(-((z / 0.45) ** 2)),
      rc = Math.hypot(dx - CALDERA.x, z - CALDERA.z),
      rp = Math.hypot(dx - PIT.x, z - PIT.z),
      rim = peak * Math.exp(-((CALDERA.radius / radius) ** 2)),
      floor = rim - 0.02,
      ring = 0.012 * Math.exp(-(((rc - CALDERA.radius) / 0.025) ** 2));
    let h = THREE.MathUtils.lerp(dome + rift + ring, floor, 1 - ss(rc, 0.08, CALDERA.radius));
    h = THREE.MathUtils.lerp(h, floor - 0.03, 1 - ss(rp, 0.03, PIT.radius));
    return h;
  }
  if (i === 3) {
    // Atoll: the volcano has sunk below the sea; the coral reef that fringed it kept growing up to
    // sea level, so a reef ring with low sandy islets encloses a shallow lagoon.
    const mound = 0.3 * Math.exp(-((r / 0.36) ** 2)),
      reef = 0.165 * Math.exp(-(((r - 0.21) / 0.045) ** 2));
    return mound + reef;
  }
  // Guyot: a drowned, flat-topped seamount, planed off by waves before it sank.
  if (i === 4) return Math.min(0.23, 0.46 * Math.exp(-((r / 0.34) ** 2)));
  // Extinct shields: streams cut radial valleys as the volcanoes erode and subside.
  const { peak, radius } = SHIELDS[i],
    gullies = (0.05 + 0.04 * i) * Math.max(0, Math.sin(a * 9 + i * 1.7)) ** 3;
  return peak * Math.exp(-((r / radius) ** 2)) * (1 - gullies * Math.min(1, r / 0.15));
}

/** Which Hawaiian volcano stands at plate-frame (x, z), and its height above the sea floor.
 * Volcanoes do not add up where their flanks meet, so channels stay open between islands. */
export function hawaiianVolcano(x: number, z: number): [number, number] {
  let k = 0,
    h = 0;
  for (let i = 0; i < 5; i++) {
    const v = volcano(i, x - (PLUME_X + i * SPACING), z);
    if (v > h) [k, h] = [i, v];
  }
  return [k, h];
}

/** Plate-surface heights in the plate's own frame; volcano i sits at PLUME_X + i·SPACING. */
export function plateHeight(s: Setting) {
  return (x: number, z: number) => {
    const roll = 0.03 * (fbm(x * 1.4 + 5, z * 1.4) - 0.5) + 0.012 * (fbm(x * 5, z * 5) - 0.5);
    let h = s.top + roll;
    if (!s.continental) return h + hawaiianVolcano(x, z)[1];
    for (let i = 0; i < 5; i++) {
      const dx = x - (PLUME_X + i * SPACING),
        r = Math.hypot(dx, z);
      // Calderas: the youngest is a sharp, lake-filled crater with a raised rim; older ones are
      // buried under the flat basalt plain that the track leaves behind.
      const fresh = [1, 0.55, 0.3, 0.18, 0.1][i],
        rad = 0.32 + 0.02 * i;
      h +=
        fresh * (0.06 * Math.exp(-(((r - rad) / 0.07) ** 2)) - 0.1 * Math.exp(-((r / rad) ** 4)));
    }
    // Mountain ranges flank the plain on both sides.
    const ridge = Math.max(0, Math.abs(z) - 0.62);
    h += 0.5 * ridge ** 1.4 * (0.7 + 0.6 * fbm(x * 2.2, z * 3));
    return h;
  };
}

/**
 * Lava flows on the active shield, oldest first. Each runs downhill from the summit or a rift
 * zone: `a` is its direction from the summit (plate frame: 0 = northwest, π/2 = northeast toward
 * the viewer, π = southeast), `start` is where its vent is, and `age` runs from 0 (fresh) to 1.
 * The flow with `active` set is the one still being fed, drawn glowing by the scene.
 */
export const FLOWS = [
  { a: 0.1 * Math.PI, start: 0.2, end: 0.7, width: 1.2, wander: 0.5, age: 0.85 },
  { a: -0.2 * Math.PI, start: 0.16, end: 0.7, width: 0.9, wander: -0.4, age: 0.75 },
  { a: 0.82 * Math.PI, start: 0.18, end: 0.7, width: 1.3, wander: 0.45, age: 0.65 },
  { a: -0.78 * Math.PI, start: 0.15, end: 0.42, width: 0.8, wander: 0.3, age: 0.6 },
  { a: 0.3 * Math.PI, start: 0.17, end: 0.7, width: 1, wander: -0.55, age: 0.3 },
  { a: 0.47 * Math.PI, start: 0.3, end: 0.48, width: 0.6, wander: 0.4, age: 0.2 },
  { a: -0.55 * Math.PI, start: 0.14, end: 0.7, width: 0.85, wander: 0.4, age: 0.12 },
  { a: 0.97 * Math.PI, start: 0.22, end: 0.5, width: 0.7, wander: -0.3, age: 0.08 },
  { a: 0.62 * Math.PI, start: 0.2, end: 0.7, width: 1, wander: 0.35, age: 0, active: true },
] as const;
export type LavaFlowPath = (typeof FLOWS)[number];
/** Direction (radians) of a flow's center line at distance r from the summit. */
export const flowAngle = (f: LavaFlowPath, r: number) => {
  const run = Math.max(0, r - f.start);
  return f.a + f.wander * Math.sin(r * 9 + f.a * 3) * run + 0.06 * Math.sin(r * 31 + f.a * 5) * run;
};
/** Half-width of a flow at distance r from the summit: narrow at the vent, spreading downhill
 * and rounding off at its front. */
export const flowWidth = (f: LavaFlowPath, r: number) =>
  f.width *
  (0.016 + 0.085 * THREE.MathUtils.clamp((r - f.start) / 0.45, 0, 1)) *
  Math.sqrt(Math.max(0, 1 - Math.max(0, (r - f.end + 0.06) / 0.06) ** 2));

/** Surface of the active shield: lava of different ages, rain forest on the wet windward side. */
export function paintActiveShield(dx: number, y: number, z: number, n: number, col: THREE.Color) {
  const tone = new THREE.Color(),
    r = Math.hypot(dx, z),
    a = Math.atan2(z, dx),
    above = (y - SEA) / 0.42,
    rc = Math.hypot(dx - CALDERA.x, z - CALDERA.z),
    rp = Math.hypot(dx - PIT.x, z - PIT.z);
  // The oldest surface has weathered brown; rain forest covers the wet northeast (windward, +z)
  // flank below the summit, while the dry southwest side stays bare.
  col.set("#a58a6d").lerp(tone.set("#bfa07c"), n * 0.7);
  // Countless older flows overlap underneath: faint streaks of slightly different browns.
  const streaks = fbm(Math.cos(a) * 4.5 + r * 2 + 3, Math.sin(a) * 4.5 - r * 1.2);
  col.lerp(tone.set("#7d6d60"), ss(streaks, 0.45, 0.7) * 0.5);
  const wet = ss(z, -0.02, 0.3) * (1 - ss(above, 0.3, 0.62)) * ss(fbm(dx * 7, z * 7), 0.3, 0.5);
  col.lerp(tone.set("#4a6c37"), wet * 0.9);
  FLOWS.forEach((f, i) => {
    if (r < f.start - 0.02 || r > f.end) return;
    // Lobed margins: the edge wanders along the flow and differs on its two sides.
    const offset = Math.atan2(Math.sin(a - flowAngle(f, r)), Math.cos(a - flowAngle(f, r))),
      lobes = 1 + 0.6 * (fbm(r * 16 + i * 5.3, Math.sign(offset) * 3 + i) - 0.5),
      inside = 1 - ss(r * Math.abs(offset), flowWidth(f, r) * lobes * 0.8, flowWidth(f, r) * lobes);
    if (inside <= 0) return;
    // Fresh lava is black, with silvery glassy pāhoehoe; it browns and is colonized with age.
    tone.set("#1f1d20").lerp(new THREE.Color("#4d4f56"), ss(fbm(dx * 40 + i, z * 40), 0.55, 0.8));
    tone.lerp(new THREE.Color("#6b5b4e"), f.age * 0.75);
    col.lerp(tone, inside * (1 - wet * f.age * 0.7));
  });
  // Bare summit, then the caldera floor of ponded lava and the darker pit crater.
  col.lerp(tone.set("#7a6e66"), ss(above, 0.68, 0.85) * 0.8);
  if (rc < CALDERA.radius) col.lerp(tone.set("#3a3636"), 1 - ss(rc, 0.08, CALDERA.radius));
  if (rp < PIT.radius) col.lerp(tone.set("#262222"), 1 - ss(rp, 0.03, PIT.radius));
  return col;
}

/** Surface color of the plate at plate-frame (x, y, z), written into `col` (linear RGB). */
export function plateColour(s: Setting, x: number, y: number, z: number, col: THREE.Color) {
  const tone = new THREE.Color(),
    n = fbm(x * 4 + 1, z * 4);
  if (s.continental) {
    const nearest = Math.round((x - PLUME_X) / SPACING),
      k = THREE.MathUtils.clamp(nearest, 0, 4),
      r = Math.hypot(x - (PLUME_X + k * SPACING), z);
    col.set("#6f7f4e").lerp(tone.set("#9a8f6a"), n * 0.7);
    if (Math.abs(z) < 0.6 && x > PLUME_X + 0.45) col.lerp(tone.set("#8e8a6f"), 0.6);
    if (Math.abs(z) > 0.66) col.lerp(tone.set("#3f5a36"), 0.75);
    if (Math.abs(z) > 0.92 && y > s.top + 0.12) col.lerp(tone.set("#c9c7c0"), 0.6);
    if (k === 0 && r < 0.3) col.lerp(tone.set("#c8b48a"), 0.5);
  } else {
    const [k] = hawaiianVolcano(x, z);
    if (y < SEA - 0.1) {
      col.set("#3c4b55").lerp(tone.set("#5b6667"), n);
    } else if (y < SEA - 0.006) {
      // Shallow water: bare dark lava off the young island, coral reef and sand off older ones.
      if (k === 0) col.set("#45474a").lerp(tone.set("#5f6264"), n);
      else col.set("#7ec3b5").lerp(tone.set("#cfe0c6"), n * 0.6);
    } else if (y < SEA + 0.03) {
      // Black sand and lava rock on the young island's coast; white coral sand on older ones.
      if (k === 0) paintActiveShield(x - PLUME_X, y, z, n, col).lerp(tone.set("#332d2a"), 0.55);
      else col.set("#e2d6b2");
    } else if (k === 0) {
      paintActiveShield(x - PLUME_X, y, z, n, col);
    } else {
      col.set("#4f7a3c").lerp(tone.set("#6d8f45"), n);
      if (k === 2) col.lerp(tone.set("#7b6a52"), THREE.MathUtils.smoothstep(n, 0.55, 0.8));
    }
  }
  if (y < s.plateBase + 1e-3) col.set("#555");
  return col;
}

export function paint(g: THREE.BufferGeometry, s: Setting) {
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3),
    col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    plateColour(s, p.getX(i), p.getY(i), p.getZ(i), col);
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
}
