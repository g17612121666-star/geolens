/**
 * Folds and faults: the folded beds sit inside a block with a flat base, and the eroded land
 * surface exposes older beds in an anticline's core and younger beds in a syncline's core.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  BED,
  foldBase,
  foldLevel,
  foldSurface,
  sequenceTop,
  shortening,
} from "../src/labs/folds-faults/geometry.ts";

/** The bed just below the land surface at x. */
const bedAt = (x, A, sign) =>
  Math.floor(foldLevel(x, foldSurface(x, A, sign) - 1e-6, A, sign) / BED);
const edge = (A) => 2.5 * shortening(A);

test("before folding, flat beds with the youngest at a flat surface", () => {
  for (const x of [-2.5, -1, 0, 1.3, 2.5]) {
    assert.ok(Math.abs(foldSurface(x, 0, 1) - 0.65) < 1e-12);
    assert.ok(Math.abs(foldLevel(x, 0.65, 0, 1) - 1.75) < 1e-12);
    assert.ok(Math.abs(foldLevel(x, foldBase(0), 0, 1)) < 1e-12);
  }
});

test("an eroded anticline has older beds in its core, a syncline younger", () => {
  for (const A of [0.6, 1]) {
    const anticline = bedAt(0, A, 1),
      anticlineLimb = bedAt(edge(A), A, 1),
      syncline = bedAt(0, A, -1),
      synclineLimb = bedAt(edge(A), A, -1);
    assert.ok(anticline < anticlineLimb, `anticline core ${anticline}, limb ${anticlineLimb}`);
    assert.ok(syncline > synclineLimb, `syncline core ${syncline}, limb ${synclineLimb}`);
    assert.equal(syncline, 4, "the youngest bed survives in the syncline's core");
  }
});

test("the land never rises above the youngest bed, and the block base is flat", () => {
  for (const sign of [1, -1])
    for (const A of [0, 0.3, 0.7, 1])
      for (let x = -edge(A); x <= edge(A); x += 0.01) {
        const top = foldSurface(x, A, sign);
        assert.ok(top <= sequenceTop(x, A, sign) + 1e-12, `air above the beds at ${x}`);
        assert.ok(top > foldBase(A) + 0.5, "a thick block");
        // At the flat base: older basement shows only in an anticline's core; in a syncline
        // the base cuts across the oldest bed as it dips below.
        const level = foldLevel(x, foldBase(A), A, sign);
        assert.ok(sign > 0 ? level <= 1e-9 : level >= -1e-9);
      }
  // On the limbs the base is the base of the oldest bed.
  for (const sign of [1, -1]) assert.ok(Math.abs(foldLevel(edge(1), foldBase(1), 1, sign)) < 0.03);
});

test("folding preserves bed thickness measured across the beds", () => {
  // Shortening thickens beds vertically by 1/s, so area is preserved (unit Jacobian).
  const A = 1,
    s = shortening(A);
  const thickness = foldLevel(2.5 * s, 1, A, 1) - foldLevel(2.5 * s, 0, A, 1);
  assert.ok(Math.abs(thickness - s) < 1e-12);
});
