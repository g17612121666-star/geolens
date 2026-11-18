/**
 * The sun-earth beams: the same square beam lights a patch whose area grows as 1/cos of the
 * angle between the sunlight and the ground's normal, measured on the curved Earth.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { beamAxes, footprint, footprintArea, meridianPoint } from "../src/labs/sun-earth/beam.ts";

const R = 1.3,
  W = 0.18,
  N = 24;
const sunAt = (decl) => {
  const d = (decl * Math.PI) / 180;
  return [0, Math.sin(d), -Math.cos(d)];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

test("the beam's axes are square to the sunlight and to each other", () => {
  for (const decl of [-23.44, 0, 15]) {
    const sun = sunAt(decl),
      { north, east } = beamAxes(sun);
    for (const [a, b] of [
      [north, sun],
      [east, sun],
      [north, east],
    ])
      assert.ok(Math.abs(dot(a, b)) < 1e-12);
    assert.ok(north[1] > 0, "north points north");
  }
});

test("the patch lies on the sunlit ground around the aimed point", () => {
  const sun = sunAt(10),
    target = meridianPoint(50, R),
    points = footprint(target, sun, W, R, N),
    middle = points[(N / 2) * (N + 1) + N / 2];
  assert.ok(Math.hypot(...middle.map((v, i) => v - target[i])) < 1e-12, "central ray hits");
  for (const p of points) {
    assert.ok(Math.abs(Math.hypot(...p) - R) < 1e-9, "on the ground");
    assert.ok(dot(p, sun) > 0, "on the day side");
  }
});

test("the same beam spreads over 1/cos(incidence) times the overhead area", () => {
  for (const decl of [0, 23.44]) {
    const sun = sunAt(decl),
      overhead = footprintArea(footprint(meridianPoint(decl, R), sun, W, R, N), N);
    assert.ok(Math.abs(overhead / (W * W) - 1) < 0.01, `overhead patch ${overhead / (W * W)}`);
    for (const incidence of [20, 40, 60]) {
      const area = footprintArea(footprint(meridianPoint(decl + incidence, R), sun, W, R, N), N),
        expected = 1 / Math.cos((incidence * Math.PI) / 180);
      assert.ok(
        Math.abs(area / overhead / expected - 1) < 0.05,
        `${incidence}°: ${area / overhead} vs ${expected}`,
      );
    }
  }
});
