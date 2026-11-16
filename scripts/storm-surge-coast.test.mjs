/**
 * Flooding in the storm-surge lab is a "bathtub" estimate: water at the coast spreads inland
 * over land lower than it, until higher ground (the dunes, then the rising plain) holds it back.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { COAST, HALF, LAND, floodLimit, floorMetres } from "../src/labs/storm-surge/coast.ts";

const rows = Array.from({ length: 23 }, (_, j) => -HALF + (j / 22) * HALF * 2);

test("water stops on the beach when it is lower than the beach top", () => {
  for (const z of rows) assert.ok(floodLimit(0.5, z, 20) < COAST + 0.06, `z ${z}`);
});

test("the flood edge is the first ground higher than the water, and every flooded point is lower", () => {
  for (const level of [1, 3, 4.5, 5.6, 8])
    for (const z of rows) {
      const limit = floodLimit(level, z, 20);
      if (limit < LAND) assert.ok(floorMetres(limit, z, 20) >= level, `level ${level}, z ${z}`);
      for (let x = COAST - 0.02; x < limit - 1e-9; x += 0.004)
        assert.ok(floorMetres(x, z, 20) < level, `dry ground under water at x ${x}`);
    }
});

test("a higher surge reaches farther inland, and the dunes hold back a moderate one", () => {
  for (const z of rows) {
    let previous = 0;
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      const limit = floodLimit(level, z, 20);
      assert.ok(limit >= previous, `z ${z}, level ${level}`);
      previous = limit;
    }
  }
  // A 4 m surge stays seaward of the dune crests; an 8 m surge floods the plain behind them.
  assert.ok(rows.every((z) => floodLimit(4, z, 20) < COAST + 0.2));
  assert.ok(rows.every((z) => floodLimit(8, z, 20) > COAST + 0.6));
});
