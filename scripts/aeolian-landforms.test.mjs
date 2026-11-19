/**
 * The aeolian lab's landforms: a barchan whose slip face stands at the angle of repose below a
 * sharp brink, with horns reaching downwind, and separate streamlined yardangs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  BARCHANS,
  MAIN_BARCHAN as d,
  REPOSE_DEGREES,
  YARDANGS,
  barchanAt,
  barchanHeight,
  duneField,
  yardangHeight,
  yardangPlan,
  yardangProfile,
} from "../src/lib/aeolian-science.ts";

const deg = (slope) => (Math.atan(slope) * 180) / Math.PI;
const e = 0.002;
/** Steepest slope at (x, z) where all four neighbors lie on the same part of the dune. */
function slope(x, z) {
  const around = [
    [x + e, z],
    [x - e, z],
    [x, z + e],
    [x, z - e],
  ].map(([a, b]) => barchanAt(d, a, b));
  const part = barchanAt(d, x, z).part;
  if (around.some((p) => p.part !== part)) return null;
  return {
    part,
    s: Math.hypot((around[0].h - around[1].h) / (2 * e), (around[2].h - around[3].h) / (2 * e)),
  };
}

test("the slip face stands at the angle of repose below the brink", () => {
  let steepest = 0;
  for (let x = d.x - 0.2; x < d.x + d.horn + 0.8; x += 0.013)
    for (let z = -d.halfWidth; z < d.halfWidth; z += 0.017) {
      const s = slope(x, z);
      if (s?.part === "slip") steepest = Math.max(steepest, s.s);
    }
  assert.ok(deg(steepest) < REPOSE_DEGREES + 0.1, `slip face ${deg(steepest)}°`);
  assert.ok(deg(steepest) > REPOSE_DEGREES - 0.5, `slip face ${deg(steepest)}°`);
  // On the center line the face falls at exactly the angle of repose from the brink.
  const fall = (barchanHeight(d, d.x + 0.1, 0) - barchanHeight(d, d.x + 0.3, 0)) / 0.2;
  assert.ok(Math.abs(deg(fall) - REPOSE_DEGREES) < 0.01, `center ${deg(fall)}°`);
  assert.ok(Math.abs(barchanHeight(d, d.x, 0) - d.height) < 1e-12, "the brink is the crest");
});

test("the windward slope is gentle, and the surface has no steps", () => {
  let center = 0,
    flank = 0;
  for (let x = d.x - d.stoss; x < d.x; x += 0.01) {
    const s = slope(x, 0);
    if (s?.part === "stoss") center = Math.max(center, s.s);
  }
  for (let x = d.x - d.stoss; x < d.x + d.horn; x += 0.013)
    for (let z = -d.halfWidth; z < d.halfWidth; z += 0.017) {
      const s = slope(x, z);
      if (s?.part === "stoss") flank = Math.max(flank, s.s);
    }
  assert.ok(deg(center) > 10 && deg(center) < 18, `windward slope ${deg(center)}°`);
  assert.ok(deg(flank) < 28, `steepest flank ${deg(flank)}°`);
  // Sampled finely, no step is steeper than the slip face.
  const dx = 0.002,
    limit = Math.tan((REPOSE_DEGREES * Math.PI) / 180) * dx * 1.01 + 1e-9;
  for (let z = -1.5; z <= 1.5; z += 0.05) {
    let previous = barchanHeight(d, -2.5, z);
    for (let x = -2.5 + dx; x <= 2; x += dx) {
      const h = barchanHeight(d, x, z);
      assert.ok(Math.abs(h - previous) <= limit, `step at x ${x}, z ${z}`);
      previous = h;
    }
  }
  for (let x = -2.4; x <= 1.6; x += 0.05) {
    let previous = barchanHeight(d, x, -1.6);
    for (let z = -1.6 + dx; z <= 1.6; z += dx) {
      const h = barchanHeight(d, x, z);
      assert.ok(Math.abs(h - previous) <= limit, `step at x ${x}, z ${z}`);
      previous = h;
    }
  }
});

test("the horns reach downwind of the slip face, making a crescent", () => {
  let foot = d.x;
  while (barchanHeight(d, foot, 0) > 0) foot += 0.001;
  const tip = d.x + d.horn;
  assert.ok(tip - foot > 0.4, `horns ${tip - foot} beyond the slip face`);
  // Just downwind of the slip face the middle is bare, but both horns still carry sand.
  const x = foot + 0.15;
  assert.equal(barchanHeight(d, x, 0), 0);
  for (const side of [-1, 1]) {
    let sand = 0;
    for (let z = 0; z < d.halfWidth; z += 0.01)
      sand = Math.max(sand, barchanHeight(d, x, side * z));
    assert.ok(sand > 0.05, `horn ${side} ${sand}`);
  }
  // Nothing upwind of the toe or beyond the horn tips.
  assert.equal(barchanHeight(d, d.x - d.stoss - 0.01, 0), 0);
  assert.equal(barchanHeight(d, tip + 0.05, 0.98 * d.halfWidth), 0);
});

test("barchans are about seven times as wide as they are high", () => {
  for (const b of BARCHANS) {
    const ratio = (2 * b.halfWidth) / b.height;
    assert.ok(ratio > 6 && ratio < 10, `width/height ${ratio}`);
  }
  assert.ok(d.height * 10 > 3 && d.height * 10 < 6, "a few meters high");
});

test("moving the dunes downwind keeps their sand", () => {
  const volume = (shift) => {
    let sum = 0;
    for (let x = -4; x < 4; x += 0.02)
      for (let z = -2.2; z < 2.2; z += 0.02) sum += duneField(x, z, shift).h;
    return sum;
  };
  assert.ok(Math.abs(volume(0.3) / volume(0) - 1) < 0.003);
});

test("yardangs are separate streamlined ridges with blunt heads facing the wind", () => {
  const head = (yardangProfile(0.25) - yardangProfile(0.05)) / 0.2,
    tail = (yardangProfile(0.25) - yardangProfile(0.95)) / 0.7;
  assert.ok(head > 2 * tail);
  assert.equal(yardangProfile(0.25), 1);
  assert.equal(yardangProfile(0), 0);
  // Widest near the head, tapering to a point downwind.
  let widest = 0;
  for (let a = 0; a <= 1; a += 0.01) if (yardangPlan(a) > yardangPlan(widest)) widest = a;
  assert.ok(widest < 0.3, `widest at ${widest}`);
  for (const y of YARDANGS) {
    const ratio = y.length / y.width;
    assert.ok(ratio > 3.5 && ratio < 7, `length/width ${ratio}`);
    // Each ridge stands alone: bare floor on both sides along its length.
    for (let a = 0.1; a < 0.9; a += 0.1) {
      const x = y.x + a * y.length,
        half = (y.width / 2) * yardangPlan(a);
      assert.ok(yardangHeight(x, y.z) > 0, `ridge at ${a}`);
      for (const side of [-1, 1])
        assert.equal(yardangHeight(x, y.z + side * (half + 0.06)), 0, `corridor beside ${a}`);
    }
  }
});
