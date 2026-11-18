import test from "node:test";
import assert from "node:assert/strict";
import { faultBed, faultSlip, foldLevel, shortening } from "../src/labs/folds-faults/geometry.ts";
test("normal and reverse slip stay parallel to a 60 degree dipping plane; strike slip has no throw", () => {
  for (const kind of [2, 3]) {
    const [x, y, z] = faultSlip(kind, 0.7);
    assert.ok(Math.abs(x + y / Math.tan(Math.PI / 3)) < 1e-12);
    assert.equal(z, 0);
    assert.equal(Math.sign(y), kind === 2 ? -1 : 1);
  }
  assert.deepEqual(faultSlip(4, 0.7), [0, 0, 0.7]);
});
test("faulted bed geometries have finite closed extrusion faces", () => {
  for (const g of [faultBed(0, false), faultBed(4, true), faultBed(2, true, true)]) {
    const p = g.attributes.position,
      n = g.attributes.normal;
    assert.ok(p.count > 20);
    assert.ok(g.groups.some((group) => group.materialIndex === 0));
    assert.ok(g.groups.some((group) => group.materialIndex === 1));
    for (let i = 0; i < p.count; i++) {
      assert.ok(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
      assert.ok(Number.isFinite(n.getX(i) + n.getY(i) + n.getZ(i)));
    }
    g.dispose();
  }
});
test("each folded bed preserves its cross-section area during shortening and thickening", () => {
  // Integrate the area between the bed's base and top across the shortened block.
  for (const amplitude of [0, 0.4, 1])
    for (const sign of [1, -1]) {
      const s = shortening(amplitude),
        n = 4000;
      let area = 0;
      for (let i = 0; i < n; i++) {
        const x = (-2.6 + ((i + 0.5) * 5.2) / n) * s;
        // Level rises at a rate s per unit height, so the bed (0.7 to 1.05) is 0.35/s thick here.
        let lo = -3,
          hi = 3;
        for (let k = 0; k < 60; k++) {
          const m = (lo + hi) / 2;
          foldLevel(x, m, amplitude, sign) < 0.7 ? (lo = m) : (hi = m);
        }
        let lo2 = -3,
          hi2 = 3;
        for (let k = 0; k < 60; k++) {
          const m = (lo2 + hi2) / 2;
          foldLevel(x, m, amplitude, sign) < 1.05 ? (lo2 = m) : (hi2 = m);
        }
        area += ((lo2 - lo) * 5.2 * s) / n;
      }
      assert.ok(Math.abs(area - 5.2 * 0.35) < 1e-6, `area ${area}`);
    }
});
