import test from "node:test";
import assert from "node:assert/strict";
import {
  ELA_SHARE,
  HANGING,
  ICE_HEAD,
  MORAINE_X,
  floorHeight,
  glacierIceGeometry,
  iceLength,
  iceMargins,
  iceSurface,
  iceThickness,
  land,
  valleyBed,
} from "../src/labs/glaciers/geometry.ts";

const slope = (x, z) => Math.abs(valleyBed(x, z + 0.01) - valleyBed(x, z - 0.01)) / 0.02;

test("the trough is U-shaped: a flat floor and walls that steepen upward", () => {
  for (const x of [-0.8, 0.5, 1.6]) {
    assert.ok(Math.abs(valleyBed(x, 0.2) - valleyBed(x, 0)) < 0.04, `floor at ${x}`);
    for (const side of [1, -1]) assert.ok(slope(x, side * 0.8) > 3 * slope(x, side * 0.35));
  }
});

test("the tributary valley hangs above the trough floor", () => {
  const lipHeight = land(HANGING.x, -HANGING.lip - 0.02);
  assert.ok(lipHeight - floorHeight(HANGING.x) > 0.5, `${lipHeight}`);
  // Its floor is lower than the spurs on either side of it.
  for (const dx of [-0.65, 0.65])
    assert.ok(land(HANGING.x + dx, -1.5) > land(HANGING.x, -1.5) + 0.12);
});

test("the ice surface falls all the way down-glacier, and thins to nothing at the snout", () => {
  for (const extent of [0, 0.5, 1]) {
    const length = iceLength(extent),
      snout = ICE_HEAD + length;
    let last = Infinity;
    for (let x = ICE_HEAD + 0.05; x < snout; x += 0.05) {
      const top = iceSurface(x, 0.45, length);
      assert.ok(top < last, `surface rises at ${x}`);
      last = top;
    }
    assert.ok(iceThickness(snout - 0.4, 0.3, length) > 0.04);
    assert.equal(iceThickness(snout + 0.02, 0.3, length), 0);
  }
  // The longest glacier stops just short of the terminal moraine it built.
  const longest = ICE_HEAD + iceLength(1);
  assert.ok(longest < MORAINE_X && MORAINE_X - longest < 0.3);
});

test("the glacier fills the trough between its walls, and the cirque ridge rises through it", () => {
  const length = iceLength(0.5);
  for (const u of [0.35, 0.5, 0.7]) {
    const x = ICE_HEAD + u * length,
      [lo, hi] = iceMargins(x, length);
    assert.ok(hi - lo > 0.9 && hi - lo < 2.6, `width ${hi - lo} at ${x}`);
  }
  assert.equal(iceThickness(-2.4, 0, length), 0);
  for (const z of [-0.55, 0.55]) assert.ok(iceThickness(-2.4, z, length) > 0.05);
  assert.ok(ELA_SHARE > 0.3 && ELA_SHARE < 0.6);
});

test("the ice sheet geometry is finite and marks where the ice is", () => {
  for (const extent of [0, 1]) {
    const length = iceLength(extent),
      g = glacierIceGeometry(length),
      p = g.attributes.position,
      thickness = g.attributes.iceDepth;
    assert.ok([...p.array, ...g.attributes.normal.array].every(Number.isFinite));
    let ice = 0;
    for (let i = 0; i < p.count; i++) {
      if (thickness.getX(i) > 0) {
        ice++;
        assert.ok(Math.abs(p.getY(i) - 0.003 - iceSurface(p.getX(i), p.getZ(i), length)) < 1e-6);
      }
    }
    assert.ok(ice > p.count * 0.25);
    g.dispose();
  }
});

test("cirques: bowls with overdeepened floors, a horn above them and tarns behind their lips", async () => {
  const {
    CIRQUES,
    CIRQUE_RADIUS,
    cirqueHeight,
    fromCirqueFrame,
    lipHeight,
    cirqueIceGeometry,
    tarnGeometry,
  } = await import("../src/labs/glaciers/cirque-geometry.ts");
  const summit = cirqueHeight(0, 0);
  for (const c of CIRQUES) {
    const [cx, cz] = fromCirqueFrame(c, 0, 0),
      floor = cirqueHeight(cx, cz),
      lip = lipHeight(c);
    // The floor sits below its lip, so a lake can fill it, and far below the summit.
    assert.ok(lip - floor > 0.03 && lip - floor < 0.2, `lip ${lip} floor ${floor}`);
    assert.ok(summit - floor > 1);
    // The headwall behind the floor is far steeper than the floor itself.
    const [bx, bz] = fromCirqueFrame(c, -CIRQUE_RADIUS * 0.75, 0),
      [b2x, b2z] = fromCirqueFrame(c, -CIRQUE_RADIUS * 0.65, 0),
      wall = (cirqueHeight(bx, bz) - cirqueHeight(b2x, b2z)) / (0.1 * CIRQUE_RADIUS),
      [fx, fz] = fromCirqueFrame(c, 0.1, 0),
      flat = Math.abs(cirqueHeight(fx, fz) - floor) / 0.1;
    assert.ok(wall > 1.2 && flat < 0.5, `wall ${wall} floor slope ${flat}`);
    for (const g of [cirqueIceGeometry(c), tarnGeometry(c)]) {
      assert.ok([...g.attributes.position.array].every(Number.isFinite));
      assert.ok([...g.attributes.iceDepth.array].some((d) => d > 0.02));
      // The sheets face up, so they are seen from above.
      const normals = g.attributes.normal.array;
      let up = 0;
      for (let i = 1; i < normals.length; i += 3) up += normals[i];
      assert.ok(up > 0);
      g.dispose();
    }
  }
  // The horn is the highest point on the block.
  for (let x = -2.9; x <= 2.9; x += 0.2)
    for (let z = -2.9; z <= 2.9; z += 0.2) assert.ok(cirqueHeight(x, z) <= summit + 1e-9);
});
