/**
 * A beam of parallel sunlight with a square cross-section, and the patch of ground it lights.
 * The Sun direction is a unit vector toward the Sun; the beam travels the other way. The patch
 * is found by following each ray to the sphere, so its area includes Earth's curvature.
 */
export type V3 = [number, number, number];

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const add = (...vs: V3[]): V3 =>
  vs.reduce<V3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
const unit = (a: V3) => scale(a, 1 / Math.sqrt(dot(a, a)));
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Two unit vectors across the beam: `north` in the meridian plane, `east` across it. */
export function beamAxes(sun: V3) {
  const north = unit(add([0, 1, 0], scale(sun, -sun[1])));
  return { north, east: cross(north, sun) };
}

/**
 * Where a ray traveling against `sun`, passing `offset` from the line through the sphere's
 * center, first meets a sphere of radius r. A ray that misses grazes the limb instead.
 */
export function rayHit(sun: V3, offset: V3, r: number): V3 {
  const across = Math.sqrt(dot(offset, offset));
  if (across >= r) return scale(unit(offset), r);
  return add(offset, scale(sun, Math.sqrt(r * r - across * across)));
}

/**
 * Grid of points where a beam of the given width, aimed at `target` on a sphere of radius r,
 * meets the ground: (n + 1) × (n + 1) points, row by row from south to north.
 */
export function footprint(target: V3, sun: V3, width: number, r: number, n: number): V3[] {
  const { north, east } = beamAxes(sun),
    // The beam's axis passes `center` from the line through the sphere's center.
    center = add(target, scale(sun, -dot(target, sun))),
    points: V3[] = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * width,
        v = (j / n - 0.5) * width;
      points.push(rayHit(sun, add(center, scale(east, u), scale(north, v)), r));
    }
  return points;
}

/** Area of a footprint grid from `footprint`. */
export function footprintArea(points: V3[], n: number) {
  const triangle = (a: V3, b: V3, c: V3) => {
    const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      ac: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
      k = cross(ab, ac);
    return Math.sqrt(dot(k, k)) / 2;
  };
  let area = 0;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = points[j * (n + 1) + i],
        b = points[j * (n + 1) + i + 1],
        c = points[(j + 1) * (n + 1) + i],
        d = points[(j + 1) * (n + 1) + i + 1];
      area += triangle(a, b, d) + triangle(a, d, c);
    }
  return area;
}

/** A point at latitude `lat` (degrees) on the noon meridian of a sphere of radius r. */
export const meridianPoint = (lat: number, r: number): V3 => {
  const a = (lat * Math.PI) / 180;
  return [0, r * Math.sin(a), -r * Math.cos(a)];
};
