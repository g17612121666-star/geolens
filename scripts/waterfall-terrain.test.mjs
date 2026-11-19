import test from "node:test";
import assert from "node:assert/strict";
import { waterfallLip } from "../src/lib/fluvial-science.ts";
import {
  CAP_BASE,
  gorgeDistance,
  gorgeFloor,
  gorgeHalfWidth,
  gorgeWall,
  plateauHeight,
  waterfallTerrain,
} from "../src/lib/waterfall-science.ts";

test("the river drops over the lip into a gorge cut down through the cap", () => {
  for (const progress of [0, 0.36, 1]) {
    const lip = waterfallLip(progress),
      above = waterfallTerrain(lip - 0.05, 0, progress),
      below = waterfallTerrain(lip + 0.6, 0, progress);
    assert.ok(above > CAP_BASE && below < CAP_BASE - 0.8, `${above} ${below}`);
    // The channel above the lip is cut into the plateau, but not through the cap.
    assert.ok(above < plateauHeight(lip - 0.05, 1.2) - 0.1);
  }
});

test("the gorge has a horseshoe head at the lip and widens downstream", () => {
  for (const progress of [0, 0.5, 1]) {
    const lip = waterfallLip(progress);
    assert.ok(Math.abs(gorgeDistance(lip, 0, progress)) < 0.04);
    // Off to the side at the lip's x, the ground is still plateau: the head is rounded.
    assert.ok(gorgeDistance(lip, 0.6, progress) > 0);
    if (lip < 1.5) assert.ok(gorgeHalfWidth(2.9, progress) > gorgeHalfWidth(lip + 0.8, progress));
  }
});

test("the walls drop from a cap cliff to a talus apron, and the plunge pool is the deepest point", () => {
  const rim = 1.75,
    floor = 0.35,
    slope = (a, b) => (gorgeWall(a, floor, rim) - gorgeWall(b, floor, rim)) / (b - a);
  for (let d = 0; d < 0.7; d += 0.01)
    assert.ok(gorgeWall(d + 0.01, floor, rim) <= gorgeWall(d, floor, rim) + 1e-12);
  // The cap cliff is near vertical; the talus at the foot lies at about 35° or less.
  assert.ok(slope(0, 0.03) > 8);
  assert.ok(slope(0.3, 0.5) < 0.75);
  assert.equal(gorgeWall(0.62, floor, rim), floor);
  const progress = 0.36,
    lip = waterfallLip(progress),
    pool = gorgeFloor(lip + 0.62, 0, progress);
  for (let dx = 1; dx < 2.5; dx += 0.2) assert.ok(gorgeFloor(lip + dx, 0, progress) > pool + 0.05);
});
