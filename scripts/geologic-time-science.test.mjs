import test from "node:test";
import assert from "node:assert/strict";
import { GEOLOGIC_UNITS, timeUnit, timeHelix } from "../src/lib/geologic-time-science.ts";

test("units are contiguous, oldest first, and end at the present", () => {
  for (let i = 1; i < GEOLOGIC_UNITS.length; i++)
    assert.equal(GEOLOGIC_UNITS[i].old, GEOLOGIC_UNITS[i - 1].young);
  assert.equal(GEOLOGIC_UNITS.at(-1).young, 0);
});

test("timeUnit names the unit on each side of a boundary", () => {
  assert.equal(timeUnit(4100).name, "Hadean");
  assert.equal(timeUnit(3000).name, "Archaean");
  assert.equal(timeUnit(539).name, "Proterozoic");
  assert.equal(timeUnit(538).name, "Palaeozoic");
  assert.equal(timeUnit(252).name, "Palaeozoic");
  assert.equal(timeUnit(251).name, "Mesozoic");
  assert.equal(timeUnit(66.1).name, "Mesozoic");
  assert.equal(timeUnit(65.9).name, "Cenozoic");
  assert.equal(timeUnit(0).name, "Cenozoic");
});

test("the time coil has constant speed: equal time spans give equal lengths", () => {
  const step = (f) => {
    const a = timeHelix(f),
      b = timeHelix(f + 1e-4);
    return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  };
  const first = step(0);
  for (let f = 0; f < 1; f += 0.05) assert.ok(Math.abs(step(f) - first) / first < 1e-6);
});
