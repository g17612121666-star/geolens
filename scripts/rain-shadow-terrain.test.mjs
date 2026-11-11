import test from "node:test";
import assert from "node:assert/strict";
import { mountainParcel } from "../src/lib/atmosphere-science.ts";
import {
  airTemperature,
  climate,
  ground,
  ridge,
  temperatureColor,
  toScene,
  windwardHeightAt,
} from "../src/labs/rain-shadow/terrain.ts";

test("heights for a given temperature agree with the parcel model on the windward side", () => {
  for (const humidity of [0.2, 0.5, 0.7, 1])
    for (const temp of [15, 10, 7, 0]) {
      const crest = 3000,
        { lcl } = mountainParcel(0, crest, humidity, false),
        h = windwardHeightAt(temp, lcl);
      if (h > crest) continue;
      const parcel = mountainParcel(h, crest, humidity, false);
      assert.ok(
        Math.abs(parcel.temperature - temp) < 1e-6,
        `${humidity} ${temp}: ${parcel.temperature}`,
      );
    }
});

test("cloud, rain shadow and snow appear only when the air reaches cloud base", () => {
  const low = climate(900, 0.2);
  assert.equal(low.cloud, false, "dry air over a low ridge stays clear");
  assert.equal(low.dryness, 0, "no water is lost, so no rain shadow");
  assert.equal(low.snowline, Infinity);
  const wet = climate(2100, 0.7);
  assert.equal(wet.cloud, true);
  assert.ok(wet.dryness > 0 && wet.dryness <= 1);
  assert.ok(wet.lcl > 600 && wet.lcl < 800, "cloud base near 700 m at 70% humidity");
  assert.equal(wet.snowline, Infinity, "too warm for snow at 2,100 m");
  const cold = climate(3000, 0.2);
  assert.equal(cold.cloud, true);
  assert.ok(cold.snowline > 2000 && cold.snowline < 3000, "snow above the freezing level");
  assert.ok(wet.treeline > wet.lcl, "forest continues into the cloud on the windward slope");
});

test("the parcel crosses the range warmer on the lee than at the same height upwind", () => {
  for (const [crest, rh] of [
    [2100, 0.7],
    [3000, 0.9],
  ]) {
    const up = airTemperature(-1, crest, rh),
      down = airTemperature(1, crest, rh);
    assert.ok(down > up, `lee ${down} vs windward ${up}`);
    assert.ok(Math.abs(airTemperature(-3, crest, rh) - 20) < 0.2, "starts near 20 °C");
  }
});

test("the parcel path band stays smooth, while the rest of the range has relief", () => {
  for (const x of [-2, -0.5, 0, 0.7, 2]) {
    for (const z of [-0.15, 0, 0.17])
      assert.ok(Math.abs(ground(x, z, 2100, 2.5) - toScene(ridge(x, 2100), 2.5)) < 1e-12);
  }
  let differs = false;
  for (const x of [-1, -0.5, 0.5])
    if (Math.abs(ground(x, 0.9, 2100, 2.5) - toScene(ridge(x, 2100), 2.5)) > 1e-3) differs = true;
  assert.ok(differs, "away from the path the slopes are uneven");
});

test("temperature colors run from blue when cold to orange-red when warm", () => {
  const cold = temperatureColor(-15),
    warm = temperatureColor(35);
  assert.ok(cold.b > cold.r, "cold is blue");
  assert.ok(warm.r > warm.b, "warm is red-orange");
  for (let t = -12; t < 32; t += 0.5) {
    const a = temperatureColor(t),
      b = temperatureColor(t + 0.5);
    assert.ok(Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.1, "no jumps");
  }
});
