/**
 * The karst block's cave: a passage enclosed in solid rock that opens only at the spring face,
 * and that the cutaway always slices open along its length.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  BLOCK,
  CUT,
  DOLINE,
  caveCeiling,
  caveFloor,
  karstTop,
  passageHalfWidth,
  passageZ,
} from "../src/labs/karst/geometry.ts";

const gap = (x, z) => caveCeiling(x, z) - caveFloor(x, z);

test("the passage is enclosed by rock except where it reaches the spring", () => {
  for (let x = -BLOCK.x; x <= BLOCK.x; x += 0.05) {
    for (const z of [-BLOCK.z, BLOCK.z]) assert.equal(gap(x, z), 0, `wall at x ${x}, z ${z}`);
  }
  for (let z = -BLOCK.z; z <= BLOCK.z; z += 0.02) assert.equal(gap(-BLOCK.x, z), 0, "closed end");
  assert.ok(gap(BLOCK.x, passageZ(BLOCK.x)) > 0.2, "open at the spring");
});

test("the roof never dips below the floor, and the cutaway opens the passage along its length", () => {
  for (let x = -BLOCK.x; x <= BLOCK.x; x += 0.05) {
    for (let z = -BLOCK.z; z <= BLOCK.z; z += 0.05) assert.ok(gap(x, z) >= 0, `x ${x}, z ${z}`);
    const back = passageZ(x) - passageHalfWidth(x),
      front = passageZ(x) + passageHalfWidth(x);
    assert.ok(back > -BLOCK.z && front < BLOCK.z, "inside the block");
    if (x > -2.3) {
      assert.ok(back < CUT && front > CUT, `cut misses the passage at x ${x}`);
      assert.ok(gap(x, CUT) > 0.05, `the cut shows the passage at x ${x}`);
    }
  }
});

test("water drains from the doline floor downward to the passage", () => {
  const floor = karstTop(DOLINE.x, DOLINE.z),
    roof = caveCeiling(DOLINE.x, passageZ(DOLINE.x));
  assert.ok(floor < karstTop(DOLINE.x + 1, DOLINE.z), "a hollow");
  assert.ok(floor - roof > 0.5, "rock between the doline and the passage");
});
