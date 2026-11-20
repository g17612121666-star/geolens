import test from "node:test";
import assert from "node:assert/strict";
import { BASIN_CENTER, BASIN_OUTLET, landformHeight } from "../src/labs/landform-types/shapes.ts";

/** Highest, lowest and slope statistics on a 50 m grid, as the lab's readout reports them. */
function stats(kind) {
  const n = 80,
    d = 4 / n,
    slopes = [],
    heights = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = -2 + i * d,
        z = -2 + j * d,
        h = landformHeight(kind, x, z);
      heights.push(h);
      if (i < n && j < n) {
        const gx = (landformHeight(kind, x + d, z) - h) / d,
          gz = (landformHeight(kind, x, z + d) - h) / d;
        slopes.push((Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI);
      }
    }
  slopes.sort((a, b) => a - b);
  heights.sort((a, b) => a - b);
  return {
    hi: heights.at(-1),
    lo: heights[0],
    relief: heights.at(-1) - heights[0],
    typical: slopes[Math.floor(slopes.length / 2)],
    steepest: slopes.at(-1),
    heights,
  };
}
const [mountain, hill, plateau, plain, basin] = [0, 1, 2, 3, 4].map(stats);

test("a mountain has far more relief and steeper slopes than a hill, a plain the least", () => {
  assert.ok(mountain.relief > 1 && mountain.typical > 15, `${mountain.relief} ${mountain.typical}`);
  assert.ok(
    hill.relief > 0.2 && hill.relief < 0.5 && hill.typical < 12,
    `${hill.relief} ${hill.typical}`,
  );
  assert.ok(plain.relief < 0.06 && plain.steepest < 3);
  assert.ok(mountain.relief > 2.5 * hill.relief);
});

test("a plateau is a broad, nearly level high surface ending in a steep escarpment", () => {
  // Much of the sample lies close to the top surface, and it is far above the lowland.
  const high = plateau.heights.filter((h) => h > plateau.hi - 0.08).length / plateau.heights.length;
  assert.ok(high > 0.3, `${high}`);
  assert.ok(plateau.relief > 0.8 && plateau.steepest > 60, `${plateau.relief} ${plateau.steepest}`);
  // Its top is far higher than the plain and the hills but flat, so elevation alone does not
  // tell a plateau from a mountain.
  assert.ok(plateau.hi > 2 * hill.hi && plateau.typical < mountain.typical);
});

test("a basin is lower than the land around it, which a river leaves through one gap", () => {
  const [cx, cz] = BASIN_CENTER,
    floor = landformHeight(4, cx, cz);
  let lowest = Infinity;
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const rim = landformHeight(4, cx + 1.6 * Math.cos(a), cz + 1.6 * Math.sin(a));
    lowest = Math.min(lowest, rim);
    const off = Math.abs(Math.atan2(Math.sin(a - BASIN_OUTLET), Math.cos(a - BASIN_OUTLET)));
    if (off > 0.5) assert.ok(rim > floor + 0.22, `rim at ${a}`);
  }
  // The gap cuts the rim far lower than anywhere else.
  assert.ok(lowest < floor + 0.15);
  assert.ok(basin.relief > 0.4);
});
