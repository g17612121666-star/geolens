import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { sameProps, sameValue } from "../src/labs/shared/same-props.ts";

test("positions passed as new arrays with the same numbers count as unchanged", () => {
  assert.ok(sameProps({ pos: [0, 1, 2], text: "Sun" }, { pos: [0, 1, 2], text: "Sun" }));
  assert.ok(!sameProps({ pos: [0, 1, 2], text: "Sun" }, { pos: [0, 1, 2.001], text: "Sun" }));
  assert.ok(!sameProps({ pos: [0, 1, 2], text: "Sun" }, { pos: [0, 1, 2], text: "Moon" }));
});

test("point lists compare tuple by tuple and vector by vector", () => {
  const tuples = () => [
    [0, 0, 0],
    [1, 2, 3],
  ];
  assert.ok(sameValue(tuples(), tuples()));
  assert.ok(sameValue([new THREE.Vector3(1, 2, 3)], [new THREE.Vector3(1, 2, 3)]));
  assert.ok(!sameValue([new THREE.Vector3(1, 2, 3)], [new THREE.Vector3(1, 2, 4)]));
  assert.ok(
    !sameValue(
      [[0, 0, 0]],
      [
        [0, 0, 0],
        [1, 1, 1],
      ],
    ),
  );
  assert.ok(sameValue(new THREE.Color("#ffcc00"), new THREE.Color("#ffcc00")));
});

test("added, removed and changed props are noticed", () => {
  assert.ok(!sameProps({ a: 1 }, { a: 1, b: 2 }));
  assert.ok(!sameProps({ a: 1, b: undefined }, { a: 1, c: undefined }));
  const onClick = () => {};
  assert.ok(sameProps({ onClick }, { onClick }));
  assert.ok(!sameProps({ onClick }, { onClick: () => {} }));
  // Objects that are not arrays, vectors or colors keep reference equality.
  assert.ok(!sameProps({ style: { a: 1 } }, { style: { a: 1 } }));
});
