import { landscapeNoise as noise } from "../shared/landscape-noise.ts";

/**
 * Five invented 4 × 4 km landforms (1 unit = 1 km, heights in km above the scene's zero level),
 * each built to show the features that define it. They are not real places.
 */

export const NAMES = ["Mountain", "Hill", "Plateau", "Plain", "Basin"];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const ridged = (x: number, z: number) => 1 - Math.abs(2 * noise(x, z) - 1);

/** The plain's meandering river. */
export const plainRiver = (x: number) => 0.55 * Math.sin(x * 1.6) - 0.2;
/** The stream between the hills. */
export const hillStream = (x: number) => 0.9 + 0.25 * Math.sin(x * 1.3 + 0.5);
/** The river that crosses the plateau in its canyon and leaves through the escarpment. */
export const canyonRiver = (z: number) => 1.15 + 0.2 * Math.sin(z * 1.9 + 0.8);
/** Center of the basin and the bearing of its outlet. */
export const BASIN_CENTER: [number, number] = [0.1, -0.1];
export const BASIN_OUTLET = -0.9;

/**
 * Mountains: a cluster of peaks joined by sharp ridges, with steep valleys between them that open
 * out into forested foothills at the edges of the sample.
 */
function mountain(x: number, z: number) {
  const wx = x + 0.4 * (noise(x * 0.7 + 3, z * 0.7) - 0.5),
    wz = z + 0.4 * (noise(x * 0.7, z * 0.7 + 5) - 0.5),
    // Big ridges with valleys between them, then smaller spurs, then crags.
    r1 = ridged(wx * 0.7 + 1.3, wz * 0.7 - 0.4),
    r2 = ridged(wx * 1.5 + 4, wz * 1.5 + 1),
    r3 = ridged(wx * 3.3 - 2, wz * 3.3 + 3),
    envelope = Math.max(0, 1 - (Math.hypot(x + 0.25, z + 0.2) / 2.85) ** 2),
    relief = 0.9 * r1 ** 2 + 0.38 * r2 ** 2 * (0.4 + 0.6 * r1) + 0.13 * r3 ** 2 * r1;
  return 0.12 + envelope ** 1.15 * (0.22 + relief) + 0.02 * (noise(x * 2, z * 2) - 0.5);
}

/** Rolling hills: rounded summits, gentle slopes and a shallow valley with a stream. */
function hill(x: number, z: number) {
  const valley = Math.exp(-(((z - hillStream(x)) / 0.32) ** 2));
  return (
    0.08 +
    0.34 * Math.exp(-((x + 0.35) ** 2 + (z + 0.25) ** 2) / 1.3) +
    0.16 * Math.exp(-((x - 1.15) ** 2 + (z + 1.0) ** 2) / 0.5) +
    0.09 * Math.exp(-((x + 1.2) ** 2 + (z - 1.5) ** 2) / 0.6) -
    0.05 * valley +
    0.015 * (noise(x * 2.5, z * 2.5) - 0.5)
  );
}

/** Signed distance from the plateau's escarpment: positive up on the plateau. */
function escarpment(x: number, z: number) {
  return (
    Math.min(x + 0.95, 0.7 - z) +
    0.14 * Math.sin(z * 2.6 + 1) +
    0.1 * Math.sin(x * 3.1) +
    0.06 * (noise(x * 3, z * 3) - 0.5)
  );
}

/** Profile across an escarpment: a cliff in the cap rock above a concave talus slope. */
function scarp(e: number) {
  if (e >= 0) return 1;
  if (e > -0.07) return 0.7 + 0.3 * ((e + 0.07) / 0.07);
  return 0.7 * Math.max(0, (e + 0.85) / 0.78) ** 1.7;
}

/**
 * A plateau: a broad, nearly level high surface ending in an escarpment, with a river canyon cut
 * into it and a butte left standing out in front of the scarp.
 */
function plateau(x: number, z: number) {
  const low = 0.08 + 0.02 * (noise(x * 1.5, z * 1.5) - 0.5),
    top = 0.95 + 0.03 * (noise(x * 1.2 + 3, z * 1.2) - 0.5),
    butte = 0.3 - Math.hypot(x + 1.45, z - 1.55),
    e = Math.max(escarpment(x, z), butte),
    land = low + (top - low) * scarp(e),
    // The canyon floor falls toward the escarpment, where its river leaves the plateau.
    floor = low + (top - 0.28 - low) * (1 - smooth(-1.9, 0.6, z)) ** 1.2,
    across = Math.abs(x - canyonRiver(z)),
    canyon = floor + (land - floor) * smooth(0.04, 0.24, across) ** 1.3;
  return Math.min(land, canyon);
}

/** A low plain with a meandering river and its floodplain. */
function plain(x: number, z: number) {
  const floodplain = Math.exp(-(((z - plainRiver(x)) / 0.35) ** 2));
  return 0.08 + 0.014 * Math.sin(x * 1.5) + 0.01 * Math.cos(z * 2) - 0.008 * floodplain;
}

/**
 * A basin: a flat floor of sediment ringed by higher ground, drained by a river through one gap in
 * the rim.
 */
function basin(x: number, z: number) {
  const dx = x - BASIN_CENTER[0],
    dz = z - BASIN_CENTER[1],
    r = Math.hypot(dx, dz),
    a = Math.atan2(dz, dx),
    rim =
      1.45 + 0.18 * Math.sin(3 * a + 0.4) + 0.12 * (noise(Math.cos(a) * 2, Math.sin(a) * 2) - 0.5),
    walls = smooth(0.32, 1.2, r / rim) ** 1.3,
    // Lower hills on the near (+z) side, so the floor stays in view from the lab's camera.
    hills =
      (0.5 + 0.12 * (noise(x * 1.4 + 5, z * 1.4) - 0.5) + 0.05 * ridged(x * 2.6, z * 2.6)) *
      (1 - 0.4 * Math.max(0, Math.sin(a))),
    turn = Math.atan2(Math.sin(a - BASIN_OUTLET), Math.cos(a - BASIN_OUTLET)),
    gap = Math.exp(-(turn * turn) / 0.03) * smooth(0.3, 0.7, r / rim),
    // The outlet is cut down to the floor and falls gently outward, so the river can leave.
    outward = 0.03 * smooth(0.6, 1.4, r / rim) * gap;
  return 0.12 + 0.004 * (noise(x * 3, z * 3) - 0.5) + hills * walls * (1 - gap) - outward;
}

const SHAPES = [mountain, hill, plateau, plain, basin];

/** Height (km) of landform `kind` at (x, z) on its 4 × 4 km sample. */
export const landformHeight = (kind: number, x: number, z: number) => SHAPES[kind](x, z);

/** True where the plateau's ground is part of its steep escarpment or canyon walls. */
export const onEscarpment = (x: number, z: number) => {
  const e = escarpment(x, z);
  return e < 0.01 && e > -0.9;
};
