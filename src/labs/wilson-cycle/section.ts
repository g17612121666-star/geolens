/**
 * The Wilson-cycle section: surface profiles for each stage, in kilometers, and the scene
 * heights built from them. 1 scene unit = 50 km. Depths and layer thicknesses are drawn ×2 in
 * the teaching view; surface relief (mountains, rifts, ocean floor) a further ×2, so peaks and
 * trenches show beside a lithosphere a hundred kilometers thick. Profiles are idealized.
 */
import { fbm } from "../shared/hazard-utils.ts";

export const STAGES = [
  "Continental rift",
  "Young ocean",
  "Open ocean",
  "Subduction begins",
  "Ocean closes",
  "Continental collision",
] as const;
/** Half-width of the rift floor or ocean basin at each stage, scene units. */
export const GAPS = [0.42, 0.5, 1.25, 1.25, 0.65, 0];
export const W = 6,
  D = 1.8,
  BASE = -1.65,
  SLAB_SLOPE = 0.78,
  /** Arc-to-trench distance: the arc sits where the slab top is about 100 km deep. */
  ARC = 1.25,
  /** Scene units per kilometer. */
  KM = 1 / 50;
/** Where the collision belt is centered. */
export const BELT = 0.1;

const ss = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** Height above sea level (km) of an idealized passive margin at m units from the ocean edge
 * (negative inside the ocean, where `floor` is the ocean-floor depth): shelf, slope and rise. */
function passiveMargin(m: number, floor: number) {
  if (m > 0) return 0.4 * ss(m, 0, 0.45);
  // The shelf deepens gently to about 150 m at its edge; then the slope and rise lead down to
  // the abyssal floor.
  return -0.15 * ss(-m, 0, 0.04) + (floor + 0.15) * ss(-m, 0.04, 0.32);
}

/**
 * Surface height (km) along the section at x for one stage, before any small-scale roughness.
 * Stage 0: a rift valley with a lake between uplifted shoulders. 1: a narrow young ocean with an
 * axial trough. 2: a wide ocean, a mid-ocean ridge and passive margins. 3–4: old ocean floor
 * sinking at a trench on the right, with a forearc and a volcanic arc on the continent. 5: a
 * mountain belt where the continents have collided.
 */
export function elevationKm(stage: number, x: number) {
  const gap = GAPS[stage],
    m = Math.abs(x) - gap;
  if (stage === 5) {
    const d = x - BELT;
    // A broad high plateau with the highest ranges near the suture, and foreland basins beside it.
    return (
      0.3 + 3.4 * bump(d, 0, 0.75) + 2.2 * bump(d, 0.05, 0.28) - 0.25 * bump(Math.abs(d), 1.6, 0.35)
    );
  }
  if (stage === 0) {
    if (m < 0) return -0.25 + 0.1 * Math.cos(x * 9) * (1 - ss(-m, 0, 0.1));
    // Steep boundary faults, then uplifted rift shoulders that fall away from the rift.
    const scarp = ss(m, -0.005, 0.03);
    return -0.25 + scarp * (0.7 + 1.5 * bump(m, 0.12, 0.25) + 0.25);
  }
  if (stage === 1) {
    if (m < 0) {
      // New ocean floor with an axial trough where the plates part, as in the Red Sea.
      return -1.8 - 0.7 * bump(x, 0, 0.07);
    }
    return -1.8 + ss(m, -0.01, 0.06) * (2.6 + 0.8 * bump(m, 0.15, 0.3));
  }
  // Ocean floor: a ridge crest at 2.5 km that deepens with the square root of age (stage 2), or
  // old, deep floor once the ridge has gone (stages 3–4).
  const ocean = (u: number) =>
    stage === 2
      ? -(2.5 + 2.6 * Math.sqrt(Math.min(1, Math.abs(u) / gap))) - 0.35 * bump(u, 0, 0.04)
      : -5.2;
  if (stage === 2 || x < 0) {
    if (m < 0 && m < -0.32) return ocean(x);
    return passiveMargin(m, ocean(x));
  }
  // Right side, stages 3–4: trench, accretionary wedge and forearc, then the volcanic arc.
  const t = x - gap;
  if (t < 0) return ocean(x) - 4 * bump(t, 0, 0.09);
  const wedge = stage === 4 ? 0.9 * bump(t, 0.18, 0.1) : 0;
  return -9.2 + 9.5 * ss(t, 0, 0.42) + wedge + 1.2 * bump(t, ARC, 0.35) + 0.3 * ss(t, 0.3, 0.8);
}

/** Scene height (units, before the section's own ×2) of the surface at (x, z), with roughness,
 * volcanoes and ranges; `relief` is the extra exaggeration of surface relief. */
export function surfaceUnits(stage: number, relief: number) {
  const gap = GAPS[stage];
  return (x: number, z: number) => {
    let km = elevationKm(stage, x);
    const n = fbm(x * 2 + 3, z * 2) - 0.5;
    km += km > 0 ? 0.35 * n : 0.15 * n;
    if (stage === 5) {
      // Ranges: ridges running along the belt, sharpest near the crest.
      const d = x - BELT,
        crest = bump(d, 0, 0.6);
      km +=
        crest *
        1.1 *
        (Math.abs(Math.sin(x * 7 + 2 * fbm(z * 2, x)) - 0.5) + fbm(x * 5, z * 5) - 0.6);
    }
    if (stage >= 3 && x > gap)
      // Two arc volcanoes rise above the arc highland.
      for (const vz of [-0.35, 0.5])
        km += 2.2 * Math.exp(-(((x - gap - ARC) / 0.09) ** 2) - ((z - vz) / 0.16) ** 2);
    if (stage === 0)
      // A volcano on the rift shoulder, as beside the East African Rift.
      km += 2 * Math.exp(-(((x - gap - 0.35) / 0.12) ** 2) - ((z + 0.45) / 0.16) ** 2);
    return km * KM * relief;
  };
}

/** The surface along the section without roughness, for the cut-face layers. */
export const profileUnits = (stage: number, relief: number) => (x: number) =>
  elevationKm(stage, x) * KM * relief;
