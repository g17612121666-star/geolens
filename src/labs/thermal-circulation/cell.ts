type V3 = [number, number, number];

/**
 * One thermal circulation cell: air flows along the ground toward the warm side, rises
 * there, returns aloft and sinks over the cool side. `rise` and `sink` are x positions;
 * `top` is the height of the return flow.
 */
export type Cell = { rise: number; sink: number; bottom: number; top: number };

/** A point on a rounded-rectangle loop; u runs 0..1 starting on the surface branch. */
export function cellPoint(c: Cell, u: number, z: number): V3 {
  const a = Math.abs(c.rise - c.sink) / 2,
    b = (c.top - c.bottom) / 2,
    cx = (c.rise + c.sink) / 2,
    cy = (c.top + c.bottom) / 2,
    toward = Math.sign(c.rise - c.sink) || 1,
    // Angle -π/2 is the middle of the surface branch, moving toward the rising side.
    th = -Math.PI / 2 + u * Math.PI * 2,
    cs = Math.cos(th),
    sn = Math.sin(th),
    // Superellipse (n = 6): long straight branches with rounded corners.
    px = Math.sign(cs) * Math.abs(cs) ** (1 / 3),
    py = Math.sign(sn) * Math.abs(sn) ** (1 / 3);
  return [cx + toward * a * px, cy + b * py, z];
}
