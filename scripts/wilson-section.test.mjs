/**
 * The Wilson-cycle section's surface: each stage has the landforms its label names, in the
 * right places and of plausible size, with no steps except faults, trenches and the ridge axis.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ARC, BELT, GAPS, elevationKm } from "../src/labs/wilson-cycle/section.ts";

const xs = Array.from({ length: 3001 }, (_, i) => -3 + i * 0.002);
const extreme = (stage, pick) =>
  xs.reduce(
    (best, x) => (pick(elevationKm(stage, x), best.km) ? { x, km: elevationKm(stage, x) } : best),
    {
      x: 0,
      km: elevationKm(stage, 0),
    },
  );

test("surfaces are continuous apart from faults, trench walls and the ridge axis", () => {
  for (let stage = 0; stage < 6; stage++) {
    let previous = elevationKm(stage, xs[0]);
    for (const x of xs) {
      const km = elevationKm(stage, x);
      assert.ok(
        Math.abs(km - previous) < 0.35,
        `stage ${stage} steps ${km - previous} km at x ${x}`,
      );
      previous = km;
    }
  }
});

test("a rift valley lies between uplifted shoulders", () => {
  const floor = elevationKm(0, 0),
    shoulder = Math.max(...xs.filter((x) => Math.abs(x) > GAPS[0]).map((x) => elevationKm(0, x)));
  assert.ok(floor < 0 && shoulder > 1, `floor ${floor}, shoulder ${shoulder}`);
  assert.ok(shoulder > elevationKm(0, 2.8), "shoulders stand above the plateau beyond");
});

test("an open ocean deepens from its ridge to abyssal plains, with shallow shelves", () => {
  const ridge = elevationKm(2, 0),
    plain = elevationKm(2, -0.85);
  assert.ok(ridge < -2 && ridge > -3.2, `ridge ${ridge}`);
  assert.ok(plain < -4.3 && plain > -5.5, `abyssal plain ${plain}`);
  // The shelf lies just inside the ocean's edge, where the continent meets the sea.
  const shelf = elevationKm(2, -GAPS[2] + 0.03);
  assert.ok(shelf < 0 && shelf > -0.3, `shelf ${shelf}`);
});

test("subduction makes the deepest point a trench, with a volcanic arc inland", () => {
  for (const stage of [3, 4]) {
    const deepest = extreme(stage, (a, b) => a < b),
      highest = extreme(stage, (a, b) => a > b);
    assert.ok(Math.abs(deepest.x - GAPS[stage]) < 0.06, `stage ${stage} trench at ${deepest.x}`);
    assert.ok(deepest.km < -8, `trench ${deepest.km} km`);
    assert.ok(Math.abs(highest.x - GAPS[stage] - ARC) < 0.3, `arc at ${highest.x}`);
  }
});

test("collision raises a mountain belt several kilometers high around the suture", () => {
  const highest = extreme(5, (a, b) => a > b);
  assert.ok(highest.km > 4 && highest.km < 7, `peak ${highest.km} km`);
  assert.ok(Math.abs(highest.x - BELT) < 0.2, `peak at ${highest.x}`);
  assert.ok(elevationKm(5, 2.8) < 1, "lowlands beyond the belt");
});
