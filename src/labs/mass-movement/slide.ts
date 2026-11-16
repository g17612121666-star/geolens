/**
 * The hillside and the rotational slump in three dimensions.
 *
 * The stability calculation (src/lib/slump-science.ts) is two-dimensional: one slip circle in
 * a straight 14° slope. Here that circle is the central section of a spoon-shaped slip surface,
 * an ellipsoid of revolution about the slope's strike, so the slump is widest and deepest in the
 * middle and dies out toward its flanks. The block is cut through its middle: the cut face, at
 * z = 0, is exactly the section the calculation uses. 1 scene unit = 10 m.
 */
import { SLUMP } from "../../lib/slump-science.ts";

export const BLOCK = { left: -4, right: 3.6, back: -1.8, base: -1 };
/** Lateral scale of the slip surface: its half-width across the slope is KZ times its length. */
export const KZ = 0.525;
const CY = SLUMP.centreY,
  R = SLUMP.radius;

/** Integral of smoothstep from 0 to t (t in units of the step's width). */
const smoothIntegral = (t: number) => (t <= 0 ? 0 : t < 1 ? t ** 3 - t ** 4 / 2 : t - 0.5);
/** Where the upland gives way to the straight slope, and the slope to the valley floor. */
const UP = { from: -3.7, width: 0.95 },
  FOOT = { from: 1.9, width: 1.1 },
  /** The upland and the valley floor keep this fraction of the slope's gradient. */
  FLAT = 0.15;
const upland = (x: number) => UP.width * smoothIntegral((x - UP.from) / UP.width),
  UPLAND_AT_0 = upland(0);

/**
 * Height of the undisturbed hillside: a gently sloping upland, the model's straight 14° slope
 * (y = 1 − 0.25x) across the whole slump and some way beyond it, then a valley floor.
 */
export function hillside(x: number) {
  if (x < 0) return 1 + 0.25 * (-FLAT * x + (1 - FLAT) * (UPLAND_AT_0 - upland(x)));
  return (
    1 - 0.25 * x + 0.25 * (1 - FLAT) * FOOT.width * smoothIntegral((x - FOOT.from) / FOOT.width)
  );
}
/** The straight slope of the stability model. */
const slope = (x: number) => 1 - 0.25 * x;

/**
 * Where the slip surface meets the ground in the section at z (across the slope), and the
 * squared radius of that section's slip circle; null outside the slump.
 */
export function slipSpan(z: number) {
  const r2 = R * R - (z / KZ) ** 2,
    a = 1.0625,
    b = 0.5 * (CY - 1),
    disc = b * b - 4 * a * ((CY - 1) ** 2 - r2);
  if (r2 <= 0 || disc <= 0) return null;
  const q = Math.sqrt(disc);
  return { left: (-b - q) / (2 * a), right: (-b + q) / (2 * a), r2 };
}
/** Half-width of the slump across the slope, where its flanks meet the ground. */
export const SLIDE_HALF_WIDTH = (() => {
  let z = 0;
  while (slipSpan(z - 0.001)) z -= 0.001;
  return -z;
})();

/** A point turned through angle a about the slip surface's axis (the rigid rotation). */
export function rotate(x: number, y: number, a: number): [number, number] {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [x * c - (y - CY) * s, CY + x * s + (y - CY) * c];
}

export const Region = {
  Stable: 0,
  /** The old ground surface, carried on the rotated block. */
  Block: 1,
  /** Slip surface exposed between the crown and the dropped block: the head scarp. */
  Scarp: 2,
  /** Material pushed out beyond the original toe, spread over the ground. */
  Toe: 3,
} as const;

/**
 * The ground at (x, z) after the block has rotated through `angle`. Returns the height, the
 * region and, on the block, `from`: where on the original slope this ground came from.
 * Material carried beyond the original toe rides up the slip circle above the ground; it is
 * laid down on the ground instead, keeping each column's thickness, so volume is conserved.
 */
export function slideColumn(x: number, z: number, angle: number) {
  const ground = hillside(x),
    span = angle > 0 ? slipSpan(z) : null;
  if (!span) return { height: ground, region: Region.Stable, from: x, thickness: 0 };
  const c = Math.cos(angle),
    s = Math.sin(angle),
    back = rotate(span.left, slope(span.left), angle)[0],
    // The rotated slope line maps x back to its original position linearly.
    from = (x + (1 - CY) * s) / (c + 0.25 * s),
    circle = CY - Math.sqrt(Math.max(0, span.r2 - x * x));
  if (x >= span.left && x < back)
    return { height: circle, region: Region.Scarp, from: x, thickness: 0 };
  if (from < span.left || from > span.right)
    return { height: ground, region: Region.Stable, from: x, thickness: 0 };
  const top = CY + from * s + (slope(from) - CY) * c;
  if (x <= span.right) return { height: top, region: Region.Block, from, thickness: 0 };
  const thickness = Math.max(0, top - Math.max(circle, ground));
  return { height: ground + thickness, region: Region.Toe, from, thickness };
}

/**
 * The slumped ground on a grid of (nx + 1) × (nz + 1) points over the block, row by row from
 * the back (z = BLOCK.back) to the cut face (z = 0). The toe's thickness is smoothed a little,
 * keeping its volume, so the lobe has a rounded front.
 */
export function slideField(angle: number, nx: number, nz: number) {
  const n = (nx + 1) * (nz + 1),
    height = new Float32Array(n),
    region = new Uint8Array(n),
    from = new Float32Array(n),
    toe = new Float32Array(n),
    dx = (BLOCK.right - BLOCK.left) / nx;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i,
        col = slideColumn(BLOCK.left + i * dx, BLOCK.back + (j * -BLOCK.back) / nz, angle);
      height[k] = col.height;
      region[k] = col.region;
      from[k] = col.from;
      toe[k] = col.thickness;
    }
  // Spread the toe: box-blur its thickness along the slope (twice, a near-Gaussian), in place.
  const radius = Math.max(1, Math.round(0.07 / dx)),
    row = new Float32Array(nx + 1);
  for (let pass = 0; pass < 2; pass++)
    for (let j = 0; j <= nz; j++) {
      const o = j * (nx + 1);
      for (let i = 0; i <= nx; i++) {
        let sum = 0,
          count = 0;
        for (let d = -radius; d <= radius; d++) {
          const q = i + d;
          if (q < 0 || q > nx) continue;
          sum += toe[o + q];
          count++;
        }
        row[i] = sum / count;
      }
      toe.set(row, o);
    }
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i;
      if (region[k] === Region.Toe || (region[k] === Region.Stable && toe[k] > 1e-4)) {
        height[k] = hillside(BLOCK.left + i * dx) + toe[k];
        if (toe[k] > 1e-4) region[k] = Region.Toe;
      }
    }
  return { height, region, from };
}

/** The same geometry for the cut-face shader. */
export const SLIDE_GLSL = /* glsl */ `
const float SL_CY=${CY.toFixed(4)},SL_R=${R.toFixed(4)},SL_KZ=${KZ.toFixed(4)};
float slSmoothInt(float t){return t<=0.?0.:(t<1.?t*t*t-.5*t*t*t*t:t-.5);}
float slHill(float x){
  if(x<0.){
    float up0=${UP.width.toFixed(4)}*slSmoothInt(${(-UP.from / UP.width).toFixed(6)});
    float up=${UP.width.toFixed(4)}*slSmoothInt((x-(${UP.from.toFixed(4)}))/${UP.width.toFixed(4)});
    return 1.+.25*(-${FLAT.toFixed(4)}*x+${(1 - FLAT).toFixed(4)}*(up0-up));
  }
  return 1.-.25*x+.25*${(1 - FLAT).toFixed(4)}*${FOOT.width.toFixed(4)}*slSmoothInt((x-${FOOT.from.toFixed(4)})/${FOOT.width.toFixed(4)});
}
/** Squared radius of the slip circle in the section at z; negative outside the slump. */
float slR2(float z){return SL_R*SL_R-(z/SL_KZ)*(z/SL_KZ);}
/** Where the slip circle of squared radius r2 meets the straight slope downhill (the toe). */
float slToe(float r2){
  float b=.5*(SL_CY-1.),disc=b*b-4.*1.0625*((SL_CY-1.)*(SL_CY-1.)-r2);
  return disc>0.?(-b+sqrt(disc))/(2.*1.0625):-1e3;
}`;
