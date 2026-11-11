import test from "node:test";
import assert from "node:assert/strict";
import { ensoSection } from "../src/lib/ocean-circulation-science.ts";
import { OCEAN, isothermX, seaSurfaceTemperature } from "../src/labs/enso/sst.ts";

test("the section's end temperatures match the ENSO model on the equator", () => {
  for (const phase of [-1, 0, 1]) {
    const c = ensoSection(phase);
    assert.ok(
      Math.abs(
        seaSurfaceTemperature(OCEAN.west, 0, c.westTemperature, c.eastTemperature) -
          c.westTemperature,
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        seaSurfaceTemperature(OCEAN.east, 0, c.westTemperature, c.eastTemperature) -
          c.eastTemperature,
      ) < 1e-9,
    );
  }
});

test("the cold tongue is coldest along the equator in the east", () => {
  const { westTemperature: w, eastTemperature: e } = ensoSection(0);
  const equator = seaSurfaceTemperature(2, 0, w, e),
    offEquator = seaSurfaceTemperature(2, 0.7, w, e);
  assert.ok(equator < offEquator - 1, `${equator} vs ${offEquator}`);
  // In the warm pool the water is warm on and off the equator.
  assert.ok(
    Math.abs(seaSurfaceTemperature(-2.4, 0, w, e) - seaSurfaceTemperature(-2.4, 0.7, w, e)) < 0.1,
  );
});

test("El Niño warms the eastern surface and La Niña cools it", () => {
  const at = (phase) => {
    const c = ensoSection(phase);
    return seaSurfaceTemperature(1.8, 0, c.westTemperature, c.eastTemperature);
  };
  assert.ok(at(1) > at(0) && at(0) > at(-1));
});

test("isotherms sit where the surface has that temperature", () => {
  const { westTemperature: w, eastTemperature: e } = ensoSection(-1);
  for (const level of [22, 25, 28])
    for (const z of [-0.6, 0, 0.5]) {
      const x = isothermX(level, z, w, e);
      if (x === null) continue;
      assert.ok(Math.abs(seaSurfaceTemperature(x, z, w, e) - level) < 1e-6);
    }
  assert.equal(isothermX(35, 0, w, e), null, "no water that warm");
});
