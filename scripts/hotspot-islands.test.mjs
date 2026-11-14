/**
 * The Hawaiian chain in the hotspots lab: the active volcano is a broad shield, the tallest and
 * widest island; islands stay separate; older volcanoes sink to an atoll and a drowned seamount.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  FLOWS,
  OCEAN,
  PLUME_X,
  SEA,
  SPACING,
  hawaiianVolcano,
  plateHeight,
} from "../src/labs/hotspots/islands.ts";

const height = plateHeight(OCEAN);

/** Highest point above sea level and width at sea level (along the track) of volcano i. */
function island(i) {
  const centre = PLUME_X + i * SPACING;
  let top = -Infinity,
    west = Infinity,
    east = -Infinity;
  for (let x = centre - 0.8; x <= centre + 0.8; x += 0.004) {
    for (let z = -0.8; z <= 0.8; z += 0.02) {
      if (hawaiianVolcano(x, z)[0] !== i) continue;
      top = Math.max(top, height(x, z) - SEA);
    }
    if (hawaiianVolcano(x, 0)[0] === i && height(x, 0) > SEA) {
      west = Math.min(west, x);
      east = Math.max(east, x);
    }
  }
  return { top, width: east - west };
}

test("the active volcano is a broad shield, the tallest and widest island", () => {
  const [active, ...older] = [0, 1, 2].map(island);
  for (const other of older) {
    assert.ok(active.top > other.top, "tallest");
    assert.ok(active.width > other.width, "widest");
  }
  // Relief is exaggerated, but the shield stays much wider than it is high, not a spike.
  assert.ok(active.width > 2.4 * active.top, `${active.width} wide, ${active.top} high`);
});

test("islands along the track are separated by sea", () => {
  for (let i = 0; i < 2; i++) {
    let lowest = Infinity;
    for (let x = PLUME_X + i * SPACING; x <= PLUME_X + (i + 1) * SPACING; x += 0.002) {
      lowest = Math.min(lowest, height(x, 0));
    }
    assert.ok(lowest < SEA - 0.02, `channel ${i} reaches ${lowest}`);
  }
});

test("older volcanoes subside: an atoll reef at sea level, then a drowned seamount", () => {
  const atoll = island(3).top,
    guyot = island(4).top;
  assert.ok(atoll > -0.01 && atoll < 0.06, `atoll reef ${atoll}`);
  assert.ok(guyot < -0.05, `seamount top ${guyot}`);
});

test("one lava flow is active, and every flow runs downhill from its vent", () => {
  assert.equal(FLOWS.filter((f) => "active" in f).length, 1);
  for (const f of FLOWS) assert.ok(f.start < f.end, String(f.a));
});
