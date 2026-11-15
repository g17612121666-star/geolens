/**
 * The 3-D slump in the mass-movement lab: its cut face is the section the factor of safety is
 * calculated for, the block moves without creating or losing ground, and its parts sit where
 * a rotational slump puts them.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { SLUMP, slumpSurface } from "../src/lib/slump-science.ts";
import {
  BLOCK,
  Region,
  SLIDE_HALF_WIDTH,
  hillside,
  rotate,
  slideColumn,
  slideField,
  slipSpan,
} from "../src/labs/mass-movement/slide.ts";

test("the hillside is the stability model's slope across the slump, and the cut face its section", () => {
  for (let x = SLUMP.left - 0.15; x <= SLUMP.right + 0.15; x += 0.01)
    assert.ok(Math.abs(hillside(x) - slumpSurface(x)) < 1e-12, `x ${x}`);
  const span = slipSpan(0);
  assert.ok(Math.abs(span.left - SLUMP.left) < 1e-12 && Math.abs(span.right - SLUMP.right) < 1e-12);
  assert.ok(Math.abs(span.r2 - SLUMP.radius ** 2) < 1e-12);
  // An upland above and a valley floor below the slope.
  assert.ok(hillside(BLOCK.left) < slumpSurface(BLOCK.left));
  assert.ok(hillside(BLOCK.right) > slumpSurface(BLOCK.right));
});

test("the slump is spoon-shaped: narrower toward its flanks and absent beyond them", () => {
  let previous = Infinity;
  for (let z = 0; z > -SLIDE_HALF_WIDTH; z -= 0.1) {
    const span = slipSpan(z);
    assert.ok(span, `z ${z}`);
    assert.ok(span.right - span.left < previous, `narrows at z ${z}`);
    previous = span.right - span.left;
  }
  assert.equal(slipSpan(-SLIDE_HALF_WIDTH - 0.01), null);
  assert.ok(SLIDE_HALF_WIDTH < -BLOCK.back, "stable ground behind the slump");
});

test("before failure the ground is the hillside everywhere", () => {
  const nx = 120,
    nz = 30,
    field = slideField(0, nx, nz);
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      const x = BLOCK.left + (i * (BLOCK.right - BLOCK.left)) / nx;
      assert.equal(field.height[j * (nx + 1) + i], Math.fround(hillside(x)));
    }
});

test("the moving block neither creates nor loses ground", () => {
  const nx = 380,
    nz = 90;
  for (const angle of [0.1, 0.2, 0.26]) {
    const field = slideField(angle, nx, nz);
    let net = 0,
      moved = 0;
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = BLOCK.left + (i * (BLOCK.right - BLOCK.left)) / nx,
          d = field.height[j * (nx + 1) + i] - hillside(x);
        net += d;
        moved += Math.abs(d);
      }
    assert.ok(moved > 0 && Math.abs(net / moved) < 0.03, `angle ${angle}: ${net / moved}`);
  }
});

test("a head scarp opens at the crown, deepest in the middle, and the block tilts back", () => {
  const angle = 0.2,
    drop = (z) => {
      const span = slipSpan(z),
        x = (span.left + rotate(span.left, hillside(span.left), angle)[0]) / 2;
      const column = slideColumn(x, z, angle);
      assert.equal(column.region, Region.Scarp, `z ${z}`);
      return hillside(x) - column.height;
    };
  assert.ok(drop(0) > 0.15, "a scarp several meters high");
  assert.ok(drop(-0.8 * SLIDE_HALF_WIDTH) < drop(0), "lower toward the flanks");
  // Turned past the slope angle, the block's surface rises away from the scarp.
  const tilted = 0.26,
    near = slideColumn(-1.9, 0, tilted),
    far = slideColumn(-1.4, 0, tilted);
  assert.equal(near.region, Region.Block);
  assert.ok(far.height > near.height);
});

test("the toe is pushed out over the ground below and never floats above it", () => {
  const angle = 0.2,
    nx = 380,
    nz = 90,
    field = slideField(angle, nx, nz),
    j = nz,
    dx = (BLOCK.right - BLOCK.left) / nx;
  let toe = 0;
  for (let i = 0; i <= nx; i++) {
    const x = BLOCK.left + i * dx,
      k = j * (nx + 1) + i;
    if (x > SLUMP.right) {
      assert.ok(field.height[k] >= Math.fround(hillside(x)) - 1e-6, `x ${x}`);
      if (field.region[k] === Region.Toe) toe = Math.max(toe, x);
    }
  }
  assert.ok(toe > SLUMP.right + 0.2, "the toe spreads beyond the slip surface");
});
