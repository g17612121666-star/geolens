import test from "node:test";
import assert from "node:assert/strict";
import { crowdLabels } from "../src/labs/shared/label-crowding.ts";

const pill = (x, y, crowded = false, w = 60, h = 30) => ({ x, y, w, h, crowded });

test("labels that do not touch all stay visible", () => {
  assert.deepEqual(crowdLabels([pill(100, 100), pill(200, 100), pill(100, 160)]), [
    false,
    false,
    false,
  ]);
});

test("the first label in priority order keeps its place in a collision", () => {
  assert.deepEqual(crowdLabels([pill(100, 100), pill(120, 110)]), [false, true]);
  // A crowded label does not block labels after it.
  assert.deepEqual(crowdLabels([pill(100, 100), pill(150, 100), pill(200, 100)]), [
    false,
    true,
    false,
  ]);
});

test("visible labels tolerate touching pill ends, hidden ones need clear space to return", () => {
  // Rects overlap by 2 px: the rounded ends do not visibly touch, so both stay.
  assert.deepEqual(crowdLabels([pill(100, 100), pill(158, 100)]), [false, false]);
  // A label already crowded out stays hidden until a 6 px gap opens…
  assert.deepEqual(crowdLabels([pill(100, 100), pill(163, 100, true)]), [false, true]);
  // …and comes back once there is room.
  assert.deepEqual(crowdLabels([pill(100, 100), pill(167, 100, true)]), [false, false]);
});
