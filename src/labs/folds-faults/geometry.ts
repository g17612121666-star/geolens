import * as THREE from "three";

/** Bed thickness before folding (km); five beds, oldest at the base. */
export const BED = 0.35,
  BEDS = 5;
/** Horizontal shortening factor for fold amplitude A (km): 25% at A = 1. */
export const shortening = (amplitude: number) => 1 - 0.25 * amplitude;
/** The fold's bend at deformed x: up for an anticline, down for a syncline. */
function bend(x: number, amplitude: number, sign: number) {
  const u = x / shortening(amplitude);
  return sign * amplitude * Math.exp((-u * u) / 1.9);
}
/**
 * Stratigraphic level of the point (x, y) in the folded block: 0 at the base of the oldest bed,
 * 1.75 at the top of the youngest; below 0 lies older basement rock.
 */
export function foldLevel(x: number, y: number, amplitude: number, sign: number) {
  return (y - bend(x, amplitude, sign)) * shortening(amplitude) + 1.1;
}
/** Height of the top of the youngest bed. */
export function sequenceTop(x: number, amplitude: number, sign: number) {
  return 0.65 / shortening(amplitude) + bend(x, amplitude, sign);
}
/** Flat base of the block: the base of the oldest bed where it is not folded. */
export const foldBase = (amplitude: number) => -1.1 / shortening(amplitude);
/** How well each bed resists erosion: sandstone and limestone stand up, shale wears down. */
const RESISTANCE = [0.7, 1, 0, 0.8, 0.3];
/**
 * The land surface, with erosion keeping pace with folding: planed lower as the fold grows, so
 * the core of an anticline exposes older beds and a syncline's flanks expose older beds around
 * its younger core. Resistant beds stand a little higher, like the ridges of the Appalachian
 * Valley and Ridge. It never rises above the youngest bed.
 */
export function foldSurface(x: number, amplitude: number, sign: number) {
  const level = 0.65 / shortening(amplitude) - 0.75 * amplitude,
    bed = Math.min(BEDS - 1e-6, Math.max(0, foldLevel(x, level, amplitude, sign) / BED)),
    i = Math.floor(bed),
    across = THREE.MathUtils.smoothstep(bed - i, 0.8, 1),
    resistance = THREE.MathUtils.lerp(RESISTANCE[i], RESISTANCE[Math.min(BEDS - 1, i + 1)], across);
  return Math.min(sequenceTop(x, amplitude, sign), level + 0.12 * amplitude * (resistance - 0.5));
}
export function faultSlip(kind: number, magnitude: number): [number, number, number] {
  if (kind === 4) return [0, 0, magnitude];
  const direction = kind === 2 ? 1 : -1;
  return [direction * magnitude * 0.5, (-direction * magnitude * Math.sqrt(3)) / 2, 0];
}
export function faultBed(index: number, right: boolean, strike = false) {
  const y0 = -1.1 + index * 0.35,
    y1 = y0 + 0.35,
    cut = (y: number) => (strike ? 0 : (0.65 - y) / Math.tan(Math.PI / 3));
  const points = right
    ? [
        [cut(y0), y0],
        [2.6, y0],
        [2.6, y1],
        [cut(y1), y1],
      ]
    : [
        [-2.6, y0],
        [cut(y0), y0],
        [cut(y1), y1],
        [-2.6, y1],
      ];
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p[0], p[1]))),
    g = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -1.1);
  return g;
}
