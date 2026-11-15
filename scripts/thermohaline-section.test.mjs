/**
 * The thermohaline section's schematic temperatures: warm water floats in a thin layer over
 * cold deep water, and the cold water reaches the surface only at the polar end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isothermDepth, waterTemperature } from "../src/labs/thermohaline/transport.ts";
import { classroomDensity } from "../src/lib/ocean-circulation-science.ts";

test("water cools with depth outside the polar sinking region, to about 2 °C in the deep ocean", () => {
  for (let x = -2; x <= 2; x += 0.25) {
    // Where deep water forms, the surface is as cold as the deep ocean (here slightly colder),
    // so the water column is not stratified by temperature and dense water can sink.
    if (x > 1.5) continue;
    let previous = Infinity;
    for (let depth = 0; depth <= 4000; depth += 100) {
      const t = waterTemperature(x, depth);
      assert.ok(t <= previous + 1e-12, `x ${x}, ${depth} m`);
      previous = t;
    }
  }
  for (let x = -2; x <= 2; x += 0.25)
    assert.ok(Math.abs(waterTemperature(x, 4000) - 2) < 0.5, `deep water at x ${x}`);
  // At the polar end the whole column is within a degree or so of the deep water.
  assert.ok(Math.abs(waterTemperature(2, 0) - waterTemperature(2, 4000)) < 1.5);
});

test("the tropical surface is warm and the polar surface near freezing", () => {
  assert.ok(waterTemperature(-2, 0) > 25);
  assert.ok(waterTemperature(2, 0) < 3);
});

test("isotherms rise toward the pole and reach the surface, colder ones farther poleward", () => {
  const outcrops = [20, 10, 5].map((celsius) => {
    let previous = Infinity;
    for (let x = -2; x <= 2; x += 0.01) {
      const depth = isothermDepth(x, celsius);
      if (depth === null) return x;
      assert.ok(depth <= previous + 1e-9, `${celsius} °C deepens at x ${x}`);
      assert.ok(Math.abs(waterTemperature(x, depth) - celsius) < 1e-9);
      previous = depth;
    }
    return null;
  });
  assert.ok(
    outcrops.every((x) => x !== null),
    String(outcrops),
  );
  assert.ok(outcrops[0] < outcrops[1] && outcrops[1] < outcrops[2], String(outcrops));
  assert.ok(outcrops[2] > 0, "5 °C water reaches the surface in the polar half");
});

test("at the same salinity, the warm surface water is lighter than the deep water below it", () => {
  const surface = classroomDensity(waterTemperature(-1.5, 0), 35),
    deep = classroomDensity(waterTemperature(-1.5, 3000), 35);
  assert.ok(surface < deep);
});
