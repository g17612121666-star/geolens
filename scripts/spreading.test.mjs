import test from "node:test";
import assert from "node:assert/strict";
import { spreadingCrust } from "../src/lib/spreading-science.ts";
test("full rate and half rate retain SI conversion and flank symmetry", () => {
  assert.equal(spreadingCrust(50, 25, 4.4).ageMa, 4);
  for (const x of [0, 5, 15, 50])
    assert.deepEqual(spreadingCrust(-x, 25, 4.4), spreadingCrust(x, 25, 4.4));
});
test("a material marker moves with the flank while preserving its formation time and polarity", () => {
  const a = spreadingCrust(10, 25, 4),
    b = spreadingCrust(22.5, 25, 5);
  assert.ok(Math.abs(a.formationMa - b.formationMa) < 1e-12);
  assert.equal(a.polarity, b.polarity);
  assert.equal(b.ageMa - a.ageMa, 1);
});
test("abyssal hills are fault blocks with steep scarps facing the ridge axis", async () => {
  const { abyssalHills, HILL_BLOCK } = await import("../src/lib/spreading-science.ts");
  // Within one block, walking away from the axis: a steep climb, then a long gentle descent.
  // Invert the warped distance numerically to find positions within block i.
  const z = 0.3,
    i = 6,
    warp = (a) =>
      a +
      0.04 * Math.sin(a * 7.3 + 1.1) +
      0.02 * Math.sin(a * 17.1 + 2.3) +
      0.018 * Math.sin(z * 2.1),
    position = (u) => {
      let lo = 0,
        hi = 4;
      for (let k = 0; k < 60; k++) {
        const m = (lo + hi) / 2;
        warp(m) / HILL_BLOCK < u ? (lo = m) : (hi = m);
      }
      return lo;
    },
    at = (f) => abyssalHills(position(i + f), z, 1);
  // The warp keeps distance increasing, so blocks never overlap.
  for (let a = 0; a < 3; a += 0.001) assert.ok(warp(a + 0.001) > warp(a));
  // Block widths vary.
  const widths = [3, 5, 8, 11].map((k) => position(k + 1) - position(k));
  assert.ok(Math.max(...widths) / Math.min(...widths) > 1.3, `widths ${widths}`);
  const climb = (at(0.1) - at(0.01)) / (position(i + 0.1) - position(i + 0.01)),
    descent = (at(0.3) - at(0.95)) / (position(i + 0.95) - position(i + 0.3));
  assert.ok(
    climb > 0 && descent > 0 && climb > 3 * descent,
    `scarp ${climb}, back slope ${descent}`,
  );
  // The same hill changes height along the ridge, and none sits on the axis itself.
  const heights = [-1, -0.5, 0, 0.5, 1].map((zz) => abyssalHills(position(i + 0.4), zz, 1));
  assert.ok(Math.max(...heights) - Math.min(...heights) > 0.005);
  assert.equal(abyssalHills(0.1, 0, 1), 0);
  // Fast ridges have smaller hills; sediment smooths older floor.
  assert.ok(abyssalHills(0.82, 0.3, 0) < abyssalHills(0.82, 0.3, 1));
});
