/**
 * Idealized volcano shapes for the teaching block. Viscosity v runs from 0 (runny basalt) to
 * 1 (sticky, silica-rich magma). Heights are the teaching view: about 2.5× the real slopes.
 *
 * A shield is a broad, gently convex dome with a flat-floored summit caldera; a composite
 * cone is steeper and concave (steep near the top, spreading into an apron at the base), with
 * a bowl-shaped summit crater and radial gullies. Intermediate values blend the two forms.
 */
export type Edifice = {
  /** Base radius (scene units). */
  radius: number;
  /** Height the flanks would reach without the summit crater. */
  height: number;
  /** 0 shield form … 1 composite form. */
  form: number;
  /** Radius of the summit caldera or crater. */
  craterRadius: number;
  /** Depth of the crater floor below the rim. */
  craterDepth: number;
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function edifice(v: number): Edifice {
  const form = smooth(0.15, 0.85, v);
  return {
    radius: 2.15 - 0.7 * v,
    height: 0.42 + 1.18 * v ** 1.5,
    form,
    craterRadius: 0.3 - 0.13 * form,
    craterDepth: 0.07 + 0.09 * form,
  };
}

/** Flank profile at u = r / radius, 1 at the center and 0 at the base. */
export function flankProfile(form: number, u: number) {
  const x = Math.min(1, Math.max(0, u)),
    shield = (1 - x * x) ** 1.4,
    cone = (1 - x) ** 1.4;
  return shield + (cone - shield) * form;
}

/**
 * Height of the edifice at radius r and azimuth phi (radians from +z toward +x), before the
 * relief scale k is applied. Never negative; zero beyond the base radius.
 */
export function edificeHeight(e: Edifice, r: number, phi = 0) {
  if (!(r < e.radius)) return 0;
  const rim = e.height * flankProfile(e.form, e.craterRadius / e.radius);
  let y: number;
  if (r < e.craterRadius) {
    const q = r / e.craterRadius;
    // Caldera: flat floor and steep walls. Crater: a bowl. Both meet the rim smoothly.
    const caldera = 1 - smooth(0.78, 1, q),
      bowl = 1 - q * q;
    y = rim - e.craterDepth * (caldera + (bowl - caldera) * e.form);
  } else y = e.height * flankProfile(e.form, r / e.radius);
  // A slightly raised, rounded rim.
  y += e.craterDepth * 0.22 * Math.exp(-(((r - e.craterRadius) / 0.05) ** 2));
  // Radial gullies cut by rain and meltwater on the steeper cone; they start below the summit
  // and fade onto the apron at the base.
  const u = r / e.radius,
    wobble = phi + 0.12 * Math.sin(phi * 3 + r * 2.1) + 0.05 * Math.sin(phi * 7 - r * 5),
    gullies =
      (0.5 + 0.5 * Math.cos(wobble * 19)) ** 6 * 0.7 +
      (0.5 + 0.5 * Math.cos(wobble * 31 + 1.3)) ** 8 * 0.3,
    depth = e.height * (0.012 + 0.045 * e.form) * smooth(0.12, 0.3, u) * (1 - smooth(0.7, 1, u));
  y -= gullies * depth;
  return Math.max(0, y);
}

/** Height of the crater rim and the crater floor (the vent), before the relief scale. */
export function summit(e: Edifice) {
  const rim = e.height * flankProfile(e.form, e.craterRadius / e.radius);
  return { rim: rim + e.craterDepth * 0.22, floor: rim - e.craterDepth };
}

/** Mean flank slope in degrees between the crater rim and the base, at relief scale k. */
export function meanSlope(e: Edifice, k = 1) {
  const { rim } = summit(e);
  return (Math.atan((rim * k) / (e.radius - e.craterRadius)) * 180) / Math.PI;
}
