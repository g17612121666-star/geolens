/**
 * The soil-erosion runoff plots: both lie on one hillside, rills stay inside a bare plot and
 * deepen downslope, and grass cover keeps the comparison plot free of rills.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPARE_SHIFT,
  FIELD,
  PLOT,
  RILLS,
  fieldHeight,
  ground,
  inPlot,
  rillGrowth,
  rillShape,
} from "../src/labs/soil-erosion/plots.ts";

test("both 20 × 10 m plots lie side by side on the field's 12% slope", () => {
  for (const plot of [PLOT.bare, PLOT.compare]) {
    assert.equal(plot.x1 - plot.x0, 2, "10 m wide");
    assert.ok(plot.x0 >= FIELD.x0 && plot.x1 <= FIELD.x1);
  }
  assert.equal(PLOT.z1 - PLOT.z0, 4, "20 m long");
  assert.ok(PLOT.z0 > FIELD.z0 && PLOT.z1 < FIELD.z1);
  assert.ok(Math.abs(ground(0) - ground(1) - 0.12) < 1e-12, "12% slope down toward +z");
});

test("rills stay inside the bare plot and deepen downslope", () => {
  for (const line of RILLS)
    for (let z = PLOT.z0; z <= PLOT.z1; z += 0.05) {
      const x = line(z);
      assert.ok(x - 0.08 > PLOT.bare.x0 && x + 0.08 < PLOT.bare.x1, `rill at z ${z}`);
    }
  let previous = -1;
  for (let z = PLOT.z0; z <= PLOT.z1; z += 0.1) {
    assert.ok(rillGrowth(z) >= previous);
    previous = rillGrowth(z);
  }
  assert.equal(rillGrowth(PLOT.z0), 0, "no rills at the top of the plot");
  const z = 1.5,
    centre = rillShape(RILLS[2](z), z);
  assert.ok(centre > 0.9 && rillShape(RILLS[2](z) + 0.2, z) === 0, "a narrow channel");
});

test("rills cut into bare soil only, and erosion lowers each plot by its own amount", () => {
  const z = 1.2,
    x = RILLS[1](z);
  const fresh = fieldHeight(x, z, [0, 0], 0, true),
    rilled = fieldHeight(x, z, [0, 0], 0.05, true);
  assert.ok(fresh - rilled > 0.03, "the rill floor drops as rills deepen");
  // The comparison plot gets rills only without cover.
  const xc = x + COMPARE_SHIFT;
  assert.ok(inPlot(xc, z, PLOT.compare));
  assert.equal(fieldHeight(xc, z, [0, 0], 0.05, true), fieldHeight(xc, z, [0, 0], 0, true));
  assert.ok(fieldHeight(xc, z, [0, 0], 0.05, false) < fieldHeight(xc, z, [0, 0], 0, false));
  assert.ok(
    Math.abs(
      fieldHeight(-2.2, -1.9, [0.02, 0], 0, true) - fieldHeight(-2.2, -1.9, [0, 0], 0, true) + 0.02,
    ) < 1e-12,
  );
  assert.equal(
    fieldHeight(0, 0, [0.02, 0.01], 0.05, false),
    fieldHeight(0, 0, [0, 0], 0, false),
    "meadow unchanged",
  );
});
