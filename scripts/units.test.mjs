import test from "node:test";
import assert from "node:assert/strict";
import {
  cDeltaToF,
  cToF,
  convert,
  display,
  formatQuantity,
  hPaToInHg,
  kmToMi,
  mToFt,
  mmToIn,
  msToMph,
} from "../src/lib/units.ts";

const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("conversions use the exact definitions", () => {
  near(cToF(0), 32);
  near(cToF(100), 212);
  near(cToF(-40), -40);
  near(cDeltaToF(1), 1.8);
  near(mmToIn(25.4), 1);
  near(msToMph(0.44704), 1);
  near(kmToMi(1.609344), 1);
  near(mToFt(0.3048), 1);
  near(hPaToInHg(1013.25), 29.92, 0.005);
});

test("metric shows SI values unchanged; US customary converts them", () => {
  assert.equal(formatQuantity(21.04, "temperature", "metric"), "21.0 °C");
  assert.equal(formatQuantity(21.04, "temperature", "us"), "70 °F");
  assert.equal(formatQuantity(5, "temperatureChange", "us"), "9.0 °F");
  assert.equal(formatQuantity(12.7, "precipitation", "us"), "0.50 in");
  assert.equal(formatQuantity(10, "speed", "us"), "22 mph");
  assert.equal(formatQuantity(1013.25, "pressure", "us"), "29.92 inHg");
  assert.equal(formatQuantity(1013.25, "pressure", "metric"), "1013 hPa");
  assert.equal(formatQuantity(42, "percent", "us"), "42 %");
  assert.equal(formatQuantity(null, "temperature", "us"), "—");
  assert.equal(convert(null, "speed", "us"), null);
  assert.equal(display("height", "us").unit, "ft");
});

test("no negative zero on the thermometer", () => {
  assert.equal(formatQuantity(-0.01, "temperature", "metric"), "0.0 °C");
  assert.equal(formatQuantity(-17.79, "temperature", "us"), "0 °F");
});
