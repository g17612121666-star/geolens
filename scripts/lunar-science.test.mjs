import test from "node:test";
import assert from "node:assert/strict";
import {
  LUNAR,
  lunarPosition,
  illuminatedFraction,
  lunarEclipse,
  shadowRadii,
  equilibriumTide,
  solarEclipse,
} from "../src/lib/lunar-science.ts";

test("inclined circular orbit preserves distance and has two nodes, not an eclipse every month", () => {
  for (let t = 0; t < 1; t += 0.01)
    assert.ok(Math.abs(Math.hypot(...lunarPosition(t)) - LUNAR.distance) < 1e-7);
  assert.ok(Math.abs(lunarPosition(60 / 360)[1]) < 1e-8);
  assert.ok(Math.abs(lunarPosition(240 / 360)[1]) < 1e-8);
  assert.equal(lunarEclipse(lunarPosition(0.5, 60)), "Moon misses Earth’s shadow");
  assert.equal(lunarEclipse(lunarPosition(0.5, 0)), "Total lunar eclipse");
  assert.equal(lunarEclipse(lunarPosition(0.5, 60, true)), "Total lunar eclipse");
});
test("phase follows illumination geometry; quarters do not depend on Earth casting a shadow", () => {
  for (const [phase, want] of [
    [0, 0],
    [0.25, 0.5],
    [0.5, 1],
    [0.75, 0.5],
  ])
    assert.ok(Math.abs(illuminatedFraction(lunarPosition(phase, 0, true)) - want) < 1e-10);
});
test("shadow cones narrow and widen correctly; lunar distance allows total or annular solar geometry", () => {
  const earth = shadowRadii(LUNAR.earth, LUNAR.au, LUNAR.distance);
  assert.ok(earth.umbra > 4500 && earth.umbra < 4700);
  assert.ok(earth.penumbra > 8100 && earth.penumbra < 8300);
  const atNearEarth = (d) => shadowRadii(LUNAR.moon, LUNAR.au - d, d - LUNAR.earth).umbra;
  assert.ok(atNearEarth(356500) > 0);
  assert.ok(atNearEarth(406700) < 0);
});
test("equilibrium tide has opposite bulges, stronger alignment and zero spherical mean potential", () => {
  assert.equal(equilibriumTide([1, 0, 0], [1, 0, 0]), equilibriumTide([-1, 0, 0], [1, 0, 0]));
  assert.ok(equilibriumTide([1, 0, 0], [1, 0, 0]) > equilibriumTide([1, 0, 0], [0, 0, 1]));
  let sum = 0;
  const n = 10000;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n,
      a = i * Math.PI * (3 - Math.sqrt(5)),
      r = Math.sqrt(1 - y * y);
    sum += equilibriumTide([r * Math.cos(a), y, r * Math.sin(a)], [0.2, 0.1, 1]);
  }
  assert.ok(Math.abs(sum / n) < 1e-5);
});
test("solar eclipse: total when the Moon is near, annular when far, partial or a miss off the node", () => {
  const near = solarEclipse(lunarPosition(0, 0, false, 356500)),
    far = solarEclipse(lunarPosition(0, 0, false, 406700));
  assert.equal(near.kind, "total");
  assert.ok(near.width > 100 && near.width < 300);
  assert.equal(far.kind, "annular");
  assert.ok(far.width > 100 && far.width < 450);
  assert.equal(solarEclipse(lunarPosition(0, 60)).kind, "none");
  assert.equal(solarEclipse(lunarPosition(0.5, 0)).kind, "none");
  const partial = [...Array(200)]
    .map((_, i) => solarEclipse(lunarPosition(0, i / 10)))
    .find((e) => e.kind === "partial");
  assert.ok(partial && partial.offset > LUNAR.earth);
});
