import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  EQUAL_EARTH_EXTENT,
  MAP_HEIGHT,
  MAP_WIDTH,
  equalEarth,
  mapPoint,
} from "../src/lib/equal-earth.ts";

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("Equal Earth matches the published projection's extent and symmetry", () => {
  // Šavrič, Patterson and Jenny (2018): the map is about 2.7066 wide and 1.3173 tall per side.
  near(EQUAL_EARTH_EXTENT.x, 2.7066, 5e-4);
  near(EQUAL_EARTH_EXTENT.y, 1.3173, 5e-4);
  const [x, y] = equalEarth(-75, 40),
    [mx, my] = equalEarth(75, -40);
  near(x, -mx, 1e-12);
  near(y, -my, 1e-12);
  assert.deepEqual(equalEarth(0, 0), [0, 0]);
});

test("the home map frame puts the world's edges and center where the SVG expects", () => {
  const [left] = mapPoint(-180, 0),
    [right] = mapPoint(180, 0),
    [, top] = mapPoint(0, 90),
    [cx, cy] = mapPoint(0, 0);
  near(left, 0, 1e-9);
  near(right, MAP_WIDTH, 1e-9);
  near(top, 0, 1e-9);
  near(cx, MAP_WIDTH / 2, 1e-9);
  near(cy, MAP_HEIGHT / 2, 1e-9);
  // North America is up and left of the center.
  const [nyX, nyY] = mapPoint(-74, 40.7);
  assert.ok(nyX < cx && nyY < cy);
});

test("the generated world map matches the frame and stays small", () => {
  const file = new URL("../public/home/world-map.json", import.meta.url);
  const map = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(map.width, MAP_WIDTH);
  assert.equal(map.height, MAP_HEIGHT);
  for (const key of ["outline", "graticule", "land", "plates"])
    assert.match(map[key], /^M[\d.]+ [\d.]+/, `${key} is SVG path data`);
  assert.ok(
    statSync(file).size < 80_000,
    "rerun scripts/make-home-map.mjs with more simplification",
  );
});

/** Width and height of a WebP file. */
function webpSize(file) {
  const b = readFileSync(file);
  assert.equal(b.toString("latin1", 8, 12), "WEBP");
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const bits = b.readUInt32LE(21);
  return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
}

test("the real-place model pictures exist in both sizes", () => {
  const source = readFileSync(
    new URL("../src/components/home/model-and-place.tsx", import.meta.url),
    "utf8",
  );
  const names = [...source.matchAll(/model: "([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, ["yosemite", "grand-canyon", "hotspots"]);
  for (const name of names) {
    assert.deepEqual(
      webpSize(new URL(`../public/home/models/${name}.webp`, import.meta.url)),
      [1280, 960],
    );
    assert.deepEqual(
      webpSize(new URL(`../public/home/models/${name}-640.webp`, import.meta.url)),
      [640, 480],
    );
  }
});

test("NOAA's three-month seasons read as months, with the right years across New Year", async () => {
  const { seasonWords } = await import("../src/lib/enso-seasons.ts");
  assert.equal(seasonWords("ASO", 2026), "August to October 2026");
  assert.equal(seasonWords("JFM", 2026), "January to March 2026");
  // CPC labels a season by the year of its middle month.
  assert.equal(seasonWords("DJF", 2026), "December 2025 to February 2026");
  assert.equal(seasonWords("NDJ", 2025), "November 2025 to January 2026");
  for (const s of ["FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "SON", "OND"])
    assert.match(seasonWords(s, 2026), /^[A-Z][a-z]+ to [A-Z][a-z]+ 2026$/, s);
  assert.equal(seasonWords("XYZ", 2026), "XYZ 2026");
});
