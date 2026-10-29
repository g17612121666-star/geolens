export function hillHeight(x: number, z: number) {
  const main = 100 * Math.exp(-((x + 0.35) ** 2 / 1.9 + (z * z) / 1.1));
  const spur = 35 * Math.exp(-((x - 1.05) ** 2 / 0.85 + (z + 0.8) ** 2 / 0.16));
  const valley = 23 * Math.exp(-((x + 0.2) ** 2 / 0.11 + (z - 1.0) ** 2 / 0.8));
  return Math.max(0, main + spur - valley);
}
/**
 * Marching triangles over the 6 × 4 block: interpolation follows the same sampled terrain
 * vertices. Levels are multiples of `interval` strictly above `lo` and up to `hi`.
 */
export function contours(
  interval: number,
  height: (x: number, z: number) => number = hillHeight,
  lo = 0,
  hi = 100,
  n = 128,
) {
  const out: { height: number; points: [number, number][] }[] = [];
  for (let level = Math.floor(lo / interval) * interval + interval; level <= hi; level += interval) {
    const points: [number, number][] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const x = -3 + (i * 6) / n,
          z = -2 + (j * 4) / n;
        const corners: [[number, number], [number, number], [number, number], [number, number]] = [
          [x, z],
          [x + 6 / n, z],
          [x + 6 / n, z + 4 / n],
          [x, z + 4 / n],
        ];
        for (const tri of [
          [0, 1, 2],
          [0, 2, 3],
        ]) {
          const hit: [number, number][] = [];
          for (let k = 0; k < 3; k++) {
            const a = corners[tri[k]],
              b = corners[tri[(k + 1) % 3]],
              ha = height(...a),
              hb = height(...b);
            if (ha < level === hb < level) continue;
            const f = (level - ha) / (hb - ha);
            hit.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
          }
          if (hit.length === 2) points.push(...hit);
        }
      }
    out.push({ height: level, points });
  }
  return out;
}
