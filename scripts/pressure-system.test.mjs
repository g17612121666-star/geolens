import test from "node:test";
import assert from "node:assert/strict";
import {
  FRICTION_TURN_DEGREES,
  HIGH_CENTER_HPA,
  LOW_CENTER_HPA,
  cloudPattern,
  contourSegments,
  frontLines,
  isobarRadius,
  streamline,
  surfacePressure,
  surfaceWind,
} from "../src/lib/pressure-system-science.ts";

const cases = [true, false].flatMap((high) => [true, false].map((south) => ({ high, south })));

test("the low is lowest at its center and the high highest at its center", () => {
  for (const { high, south } of cases) {
    const center = surfacePressure(0, 0, high, south);
    assert.equal(center, high ? HIGH_CENTER_HPA : LOW_CENTER_HPA);
    for (let x = -3.2; x <= 3.2; x += 0.4)
      for (let z = -3.2; z <= 3.2; z += 0.4) {
        if (Math.hypot(x, z) < 0.3) continue;
        const p = surfacePressure(x, z, high, south);
        assert.ok(high ? p < center : p > center, `${x},${z}`);
      }
  }
});

test("rotation reverses with hemisphere; inflow to the low and outflow from the high do not", () => {
  for (const { high, south } of cases)
    // Points on a ring, away from the fronts (which trail south and east in the north).
    for (const angle of [0.9, 1.6, 2.4, 3.1, 3.9]) {
      const e = 2 * Math.cos(angle),
        n = 2 * Math.sin(angle),
        // Mirror the ring point in the south, so it stays clear of the mirrored fronts.
        w = surfaceWind(e, south ? n : -n, high, south),
        north = south ? -n : n,
        spin = Math.sign(e * w.north - north * w.east),
        radial = Math.sign(e * w.east + north * w.north);
      assert.equal(spin, (high ? -1 : 1) * (south ? -1 : 1), `spin ${high} ${south} ${angle}`);
      assert.equal(radial, high ? 1 : -1, `radial ${high} ${south} ${angle}`);
    }
});

test("surface wind crosses the isobars toward low pressure at the friction angle", () => {
  for (const { high, south } of cases)
    for (const angle of [1.2, 2.6, 3.6]) {
      const x = 1.8 * Math.cos(angle),
        z = (south ? 1 : -1) * 1.8 * Math.sin(angle),
        h = 1e-4,
        ge =
          (surfacePressure(x + h, z, high, south) - surfacePressure(x - h, z, high, south)) /
          (2 * h),
        gn =
          -(surfacePressure(x, z + h, high, south) - surfacePressure(x, z - h, high, south)) /
          (2 * h),
        w = surfaceWind(x, z, high, south),
        speed = Math.hypot(w.east, w.north),
        // The wind's component down the pressure gradient, as an angle off the isobars.
        down = -(w.east * ge + w.north * gn) / (speed * Math.hypot(ge, gn)),
        degrees = (Math.asin(down) * 180) / Math.PI;
      assert.ok(Math.abs(degrees - FRICTION_TURN_DEGREES) < 0.5, `${degrees}`);
    }
});

test("each front lies in a trough of lower pressure, which kinks the isobars", () => {
  for (const south of [false, true]) {
    const { cold, warm } = frontLines(south);
    for (const line of [cold, warm]) {
      const [ax, az] = line[2],
        [bx, bz] = line[3],
        mx = (ax + bx) / 2,
        mz = (az + bz) / 2,
        len = Math.hypot(bx - ax, bz - az),
        nx = -(bz - az) / len,
        nz = (bx - ax) / len,
        on = surfacePressure(mx, mz, false, south);
      // Compare with the mean of the two sides, so the background gradient cancels out.
      const sides =
        (surfacePressure(mx + 0.3 * nx, mz + 0.3 * nz, false, south) +
          surfacePressure(mx - 0.3 * nx, mz - 0.3 * nz, false, south)) /
        2;
      assert.ok(on < sides - 1, `${on} vs ${sides}`);
    }
  }
});

test("contours lie on their level, and the 1000 hPa isobar closes around the low", () => {
  const field = (x, z) => surfacePressure(x, z, false, false),
    segments = contourSegments(field, 1000);
  assert.ok(segments.length > 200);
  for (let i = 0; i < segments.length; i += 2)
    assert.ok(Math.abs(field(segments[i], segments[i + 1]) - 1000) < 0.15);
  for (let a = 0; a < Math.PI * 2; a += 0.3) assert.ok(isobarRadius(1000, a, false, false) > 1);
  // The high's gentle gradient keeps its isobars far apart.
  const lowGap = isobarRadius(992, 2.4, false, false) - isobarRadius(984, 2.4, false, false),
    highGap = isobarRadius(1028, 2.4, true, false) - isobarRadius(1032, 2.4, true, false);
  assert.ok(highGap > 1.5 * lowGap);
});

test("air spirals into the low and out of the high", () => {
  for (const south of [false, true]) {
    for (let a = 0; a < 6.2; a += 0.7) {
      const into = streamline([3.1 * Math.cos(a), 3.1 * Math.sin(a)], false, south),
        [ex, ez] = into.at(-1);
      assert.ok(Math.hypot(ex, ez) < 0.3, `low ${a}: ${ex},${ez}`);
      const out = streamline([0.35 * Math.cos(a), 0.35 * Math.sin(a)], true, south),
        [fx, fz] = out.at(-1);
      assert.ok(Math.max(Math.abs(fx), Math.abs(fz)) > 3.2, `high ${a}: ${fx},${fz}`);
    }
  }
});

test("clouds: a broad shield ahead of the warm front, a narrow cold-front band, a clear high", () => {
  for (const south of [false, true]) {
    const s = south ? -1 : 1,
      // On the line between the warm front's 2nd and 3rd points, then 0.6 units either side.
      ahead = cloudPattern(1.15, s * (0.25 - 0.6), false, south),
      behind = cloudPattern(1.15, s * (0.25 + 0.6), false, south);
    assert.ok(ahead.cover > 0.6 && behind.cover < 0.35, `${ahead.cover} ${behind.cover}`);
    assert.ok(ahead.rain > behind.rain);
    // Along the cold front: cloud just ahead of it, clear air in the dry slot just behind it.
    const front = cloudPattern(0.58, s * 0.96, false, south),
      slot = cloudPattern(-0.05, s * 1.0, false, south);
    assert.ok(front.cover > 0.8 && slot.cover < 0.3, `${front.cover} ${slot.cover}`);
    assert.ok(front.top > ahead.top);
    const high = cloudPattern(0.3, 0.2, true, south);
    assert.equal(high.cover, 0);
    assert.equal(high.rain, 0);
  }
});
