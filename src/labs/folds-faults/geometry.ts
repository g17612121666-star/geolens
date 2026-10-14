import * as THREE from "three";
/** Volume-preserving kinematic fold: x=f*u, y=v/f+bend(u), with unit Jacobian. */
export function foldedBed(index: number, amplitude: number, syncline = false) {
  const shortening = 1 - 0.25 * amplitude,
    y0 = (-1.1 + index * 0.35) / shortening,
    y1 = y0 + 0.35 / shortening,
    shape = new THREE.Shape();
  const bend = (x: number) => (syncline ? -1 : 1) * amplitude * Math.exp((-x * x) / 1.9);
  shape.moveTo(-2.6 * shortening, y0 + bend(-2.6));
  for (let i = 1; i <= 160; i++) {
    const x = -2.6 + (i / 160) * 5.2;
    shape.lineTo(x * shortening, y0 + bend(x));
  }
  for (let i = 160; i >= 0; i--) {
    const x = -2.6 + (i / 160) * 5.2;
    shape.lineTo(x * shortening, y1 + bend(x));
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -1.1);
  return g;
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
