import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BLOCK,
  BLOCK_Y,
  bedCoord,
  bedRecession,
  blockSurface,
  jointBlockGeometry,
  jointRelief,
  pittedSphereGeometry,
  surfaceRootGeometry,
} from "../src/labs/weathering/outcrop.ts";

const HX = BLOCK.width / 2;

test("weathered-back beds meet without steps at bed boundaries", () => {
  for (let i = -3; i < 12; i++)
    for (const eps of [1e-6, 1e-5]) {
      const below = bedRecession(i - eps),
        above = bedRecession(i + eps);
      assert.ok(Math.abs(below - above) < 1e-3, `boundary ${i}: ${below} vs ${above}`);
    }
  for (let y = -2; y < 10; y += 0.01) {
    const r = bedRecession(y);
    assert.ok(r >= 0 && r <= 0.025, "recession stays a small inset");
  }
});

test("beds line up across the joint, so the joint cuts through continuous layers", () => {
  // Both sides use the position the rock would have with the joint closed.
  for (const z of [-0.4, 0, 0.3])
    for (const y of [0.1, 0.7, 1.3]) assert.equal(bedCoord(y, 0, z), bedCoord(y, -0, z));
});

test("the two joint walls share one relief, so the joint keeps the same width everywhere", () => {
  const gap = 0.07;
  for (const y of [0.05, 0.4, 0.71, 1.0, 1.3])
    for (const z of [-0.4, -0.1, 0.2, 0.42]) {
      const ly = y - BLOCK_Y;
      const east = blockSurface(new THREE.Vector3(-HX, ly, z), 1),
        west = blockSurface(new THREE.Vector3(HX, ly, z), -1);
      const eastWall = east.x + HX + gap / 2,
        westWall = west.x - HX - gap / 2;
      assert.ok(Math.abs(eastWall - westWall - gap) < 1e-9, "constant joint width");
      assert.ok(Math.abs(east.x + HX - jointRelief(y, z)) < 1e-9, "walls follow the relief");
    }
});

test("block geometry is closed around its center and stays near its nominal size", () => {
  for (const side of [1, -1]) {
    const g = jointBlockGeometry(side);
    g.computeBoundingBox();
    const b = g.boundingBox;
    assert.ok(b.max.x - b.min.x > 0.75 && b.max.x - b.min.x < 0.9);
    assert.ok(Math.abs(b.max.y + BLOCK_Y - BLOCK.top) < 0.04, "top near 0.7 m above ground");
    assert.ok(Math.abs(b.min.y + BLOCK_Y - BLOCK.base) < 0.02, "base just below the soil");
    for (const v of g.attributes.position.array) assert.ok(Number.isFinite(v));
    g.dispose();
  }
});

test("surface roots stay on and around the block, and thicken as the tree grows", () => {
  const extent = (geometry) => {
    geometry.computeBoundingBox();
    const b = geometry.boundingBox.clone();
    geometry.dispose();
    return b;
  };
  for (const side of [1, -1]) {
    const young = surfaceRootGeometry(side, 0),
      grown = surfaceRootGeometry(side, 1);
    for (const v of young.attributes.position.array) assert.ok(Number.isFinite(v));
    const radiusAt = (g) => {
      // Spread of the first ring: the root's width where it leaves the trunk.
      const p = g.attributes.position,
        ring = new THREE.Box3();
      for (let j = 0; j < 11; j++)
        ring.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, j));
      return ring.getSize(new THREE.Vector3()).length();
    };
    assert.ok(radiusAt(grown) > radiusAt(young) * 1.5, "roots thicken with growth");
    const b = extent(grown);
    assert.ok(b.max.y < BLOCK.top - BLOCK_Y + 0.1, "no higher than just above the block top");
    assert.ok(b.min.y > -BLOCK_Y - 0.3, "tips end a little way into the soil");
    assert.ok(Math.abs(b.max.x) < HX + 0.25 && Math.abs(b.min.x) < HX + 0.25);
    extent(young);
  }
});

test("solution pits widen and deepen as dissolution goes on", () => {
  const radii = (g) => {
    const p = g.attributes.position,
      v = new THREE.Vector3();
    let min = Infinity,
      max = 0;
    for (let i = 0; i < p.count; i++) {
      const r = v.fromBufferAttribute(p, i).length();
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    g.dispose();
    return { min, max };
  };
  const fresh = radii(pittedSphereGeometry(0)),
    etched = radii(pittedSphereGeometry(1));
  assert.ok(fresh.min > 0.95 && fresh.max < 1.05, "a fresh clast is nearly a sphere");
  assert.ok(etched.min < fresh.min - 0.05, "pits cut into the etched clast");
});
