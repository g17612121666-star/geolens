/**
 * Two runoff plots on one hillside, as at an erosion research site: each 20 m long down the
 * slope and 10 m wide, bordered by metal sheets, with a trough across its foot that catches
 * the water and soil leaving it. 1 scene unit = 5 m; the ground falls toward +z at 12%.
 */
import { landscapeNoise as noise } from "../shared/landscape-noise.ts";

export const FIELD = { x0: -3.2, x1: 3.2, z0: -2.6, z1: 2.4, base: -0.3 };
/** Plot extents: the bare plot runs along the left side of the field, the comparison plot
 * along the right, so the field's side faces cut along their outer edges. */
export const PLOT = {
  bare: { x0: -3.2, x1: -1.2 },
  compare: { x0: 1.2, x1: 3.2 },
  z0: -2.15,
  z1: 1.85,
};
/** The collecting trough across the foot of each plot. */
export const TROUGH = { z0: 1.86, z1: 2.1, depth: 0.1 };
/** The graded hillside: the plots are smoothed to this plane when they are set out. */
export const ground = (z: number) => 0.6 - 0.12 * z;

export const inPlot = (x: number, z: number, plot: { x0: number; x1: number }) =>
  x >= plot.x0 && x <= plot.x1 && z >= PLOT.z0 && z <= PLOT.z1;

/** Rill centerlines on the bare plot: across-slope position at each z. */
export const RILLS = [0.23, 0.6, 0.97, 1.35, 1.74].map(
  (offset, k) => (z: number) => PLOT.bare.x0 + offset + 0.05 * Math.sin(z * 2.3 + k * 1.7),
);
/** How far down the plot a rill has grown, 0 near the top to 1 at the foot. Runoff only
 * concentrates enough to cut rills some way below the plot's upper edge. */
export const rillGrowth = (z: number) => {
  const u = Math.min(1, Math.max(0, (z + 1.6) / 3));
  return u * u * (3 - 2 * u);
};

/**
 * How deep the rills cut at (x, z) per unit of rill depth, 0–1. Rill lines are laid out across
 * the bare plot; `shift` moves them onto another plot of the same size.
 */
export function rillShape(x: number, z: number, shift = 0) {
  let cut = 0;
  for (const line of RILLS) {
    const growth = rillGrowth(z),
      width = 0.035 + 0.04 * growth,
      d = (x - shift - line(z)) / width;
    if (Math.abs(d) < 1) cut = Math.max(cut, growth * (1 - d * d));
  }
  return cut;
}
/** Shift that carries the bare plot's rill layout onto the comparison plot. */
export const COMPARE_SHIFT = PLOT.compare.x0 - PLOT.bare.x0;

/**
 * Ground height on the field. `lowering` is how far each plot's surface has been lowered by
 * erosion (bare, comparison) and `rill` the depth rills have reached at the foot of a bare
 * plot. The comparison plot is grassed when `covered`, otherwise bare like the first.
 */
export function fieldHeight(
  x: number,
  z: number,
  lowering: [number, number],
  rill: number,
  covered: boolean,
) {
  const g = ground(z),
    // Clods and crust: rough, bare tilled soil.
    rough = 0.006 * (noise(x * 22, z * 22) - 0.5) + 0.004 * (noise(x * 7, z * 7) - 0.5);
  if (inPlot(x, z, PLOT.bare)) return g - lowering[0] - rill * rillShape(x, z) + rough;
  if (inPlot(x, z, PLOT.compare))
    return covered
      ? g - lowering[1] + 0.002 * (noise(x * 20, z * 20) - 0.5)
      : g - lowering[1] - rill * rillShape(x, z, COMPARE_SHIFT) + rough;
  // Meadow around the plots, gently uneven away from their borders.
  const away = Math.min(
    Math.abs(x - PLOT.bare.x1),
    Math.abs(x - PLOT.compare.x0),
    Math.max(0, PLOT.z0 - z),
    Math.max(0, z - PLOT.z1),
  );
  return g + 0.02 * Math.min(1, away / 0.3) * (noise(x * 1.7 + 4, z * 1.7) - 0.5);
}

/** Cut faces: topsoil, subsoil and parent material at fixed depths below the graded ground,
 * so a lowered surface eats into the topsoil. */
export const PLOT_GLSL = /* glsl */ `
vec3 sectionColour(vec3 p,vec3 w){
  float top=.6-.12*p.z,d=top-p.y+.01*(sNoise(vec2(p.z*6.+p.x*4.,1.))-.5);
  float g=grain(vec2(p.x+p.z,p.y));
  vec3 c;
  if(d<.13)c=mix(vec3(.33,.25,.17),vec3(.27,.21,.15),sNoise(vec2(p.x+p.z,p.y)*50.));
  else if(d<.3){
    c=mix(vec3(.58,.44,.30),vec3(.53,.40,.27),g);
    c*=mix(.75,1.,smoothstep(0.,.06,abs(fract((p.x+p.z)*5.+sNoise(vec2(p.y*9.,0.)))-.5)*2.));
  }else{
    float st=smoothstep(.62,.7,sNoise(vec2(p.x+p.z,p.y)*vec2(14.,18.)));
    c=mix(vec3(.70,.62,.49),vec3(.80,.74,.62),st)*mix(.92,1.06,g);
  }
  return c*mix(.82,1.,smoothstep(0.,.006,min(abs(d-.13),abs(d-.3))));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
