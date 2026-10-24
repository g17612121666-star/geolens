import test from "node:test";
import assert from "node:assert/strict";
import { soilFractions, soilTexture } from "../src/lib/soil-science.ts";

test("USDA texture classes at the corners and in each class", () => {
  const cases = [
    [100, 0, "Sand"],
    [0, 0, "Silt"],
    [0, 100, "Clay"],
    [40, 20, "Loam"],
    [90, 10, "Loamy sand"],
    [65, 10, "Sandy loam"],
    [20, 15, "Silt loam"],
    [10, 50, "Silty clay"],
    [30, 30, "Clay loam"],
    [55, 25, "Sandy clay loam"],
    [10, 30, "Silty clay loam"],
    [50, 40, "Sandy clay"],
  ];
  for (const [sand, clay, want] of cases)
    assert.equal(soilTexture(sand, clay), want, `${sand}/${clay}`);
});

test("fractions always add to 100 and clay cannot exceed what sand leaves", () => {
  assert.deepEqual(soilFractions(80, 60), { sand: 80, clay: 20, silt: 0 });
  for (const [sand, clay] of [
    [0, 0],
    [30, 30],
    [120, 10],
    [-5, 50],
  ]) {
    const f = soilFractions(sand, clay);
    assert.equal(f.sand + f.silt + f.clay, 100);
    assert.ok(f.clay <= 100 - f.sand && f.silt >= 0);
  }
});
