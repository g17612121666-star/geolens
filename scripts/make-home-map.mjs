// Draws the home page's world map: Natural Earth land and the PB2002 plate boundaries in the
// Equal Earth projection, simplified for a map about 1000 pixels wide.
//
//   node --experimental-strip-types scripts/make-home-map.mjs
//
// Writes public/home/world-map.json: { width, height, land, plates } with SVG path data.
import { readFileSync, writeFileSync } from "node:fs";
import { MAP_HEIGHT, MAP_WIDTH, mapPoint } from "../src/lib/equal-earth.ts";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const land = read("../public/geo/ne_110m_land.geojson");
const plates = read("../public/geo/plate-boundaries.json");

/** Douglas–Peucker: drop points closer than `tolerance` map units to the simplified line. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a],
      [bx, by] = points[b];
    const dx = bx - ax,
      dy = by - ay,
      len = Math.hypot(dx, dy) || 1;
    let far = -1,
      farDist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > farDist) {
        far = i;
        farDist = d;
      }
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** A closed ring's ends coincide, so simplify it in two halves split at its farthest point. */
function simplifyRing(points, tolerance) {
  let far = 0,
    farDist = -1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > farDist) {
      far = i;
      farDist = d;
    }
  }
  if (far === 0) return points;
  const first = simplify(points.slice(0, far + 1), tolerance),
    second = simplify(points.slice(far), tolerance);
  return [...first, ...second.slice(1)];
}

const fmt = (n) => (Math.round(n * 10) / 10).toString();
const path = (points, close) =>
  `M${points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L")}${close ? "Z" : ""}`;

function rings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}
function lines(geometry) {
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

let landPath = "";
for (const feature of land.features) {
  for (const ring of rings(feature.geometry)) {
    const pts = simplifyRing(
      ring.map(([lon, lat]) => mapPoint(lon, lat)),
      0.45,
    );
    if (pts.length >= 4) landPath += path(pts, true);
  }
}

/** PB2002 stores boundaries as thousands of two-point steps; join steps that share an end. */
function chain(segments) {
  const key = ([lon, lat]) => `${lon.toFixed(5)},${lat.toFixed(5)}`;
  const at = new Map();
  segments.forEach((seg, i) => {
    for (const end of [seg[0], seg[seg.length - 1]]) {
      const k = key(end);
      if (!at.has(k)) at.set(k, []);
      at.get(k).push(i);
    }
  });
  const used = new Uint8Array(segments.length);
  const next = (point) => (at.get(key(point)) ?? []).find((i) => !used[i]);
  const chains = [];
  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    let line = [...segments[i]];
    for (let j = next(line[line.length - 1]); j !== undefined; j = next(line[line.length - 1])) {
      used[j] = 1;
      const seg = segments[j];
      line = line.concat(
        key(seg[0]) === key(line[line.length - 1]) ? seg.slice(1) : [...seg].reverse().slice(1),
      );
    }
    for (let j = next(line[0]); j !== undefined; j = next(line[0])) {
      used[j] = 1;
      const seg = segments[j];
      line = (
        key(seg[seg.length - 1]) === key(line[0])
          ? seg.slice(0, -1)
          : [...seg].reverse().slice(0, -1)
      ).concat(line);
    }
    chains.push(line);
  }
  return chains;
}

let platePath = "";
const segments = plates.features.flatMap((feature) => lines(feature.geometry));
for (const line of chain(segments)) {
  {
    // Split where a boundary crosses the 180° meridian, so it does not streak across the map.
    let run = [];
    const flush = () => {
      const pts = simplify(run, 1);
      if (pts.length >= 2) platePath += path(pts, false);
      run = [];
    };
    for (let i = 0; i < line.length; i++) {
      if (i > 0 && Math.abs(line[i][0] - line[i - 1][0]) > 180) flush();
      run.push(mapPoint(line[i][0], line[i][1]));
    }
    flush();
  }
}

// The world's edge (the ocean's shape) and a 30° graticule, for an atlas-style frame.
const range = (from, to, step) =>
  Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
const outline = path(
  [
    ...range(-90, 90, 2).map((lat) => mapPoint(-180, lat)),
    ...range(90, -90, -2).map((lat) => mapPoint(180, lat)),
  ],
  true,
);
let graticule = "";
for (const lat of [-60, -30, 0, 30, 60])
  graticule += path([mapPoint(-180, lat), mapPoint(180, lat)], false);
for (const lon of range(-150, 150, 30))
  graticule += path(
    range(-90, 90, 3).map((lat) => mapPoint(lon, lat)),
    false,
  );

const out = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  outline,
  graticule,
  land: landPath,
  plates: platePath,
};
writeFileSync(new URL("../public/home/world-map.json", import.meta.url), JSON.stringify(out));
console.log(
  `world-map.json: ${MAP_WIDTH} × ${MAP_HEIGHT}, land ${(landPath.length / 1024).toFixed(0)} KB, plates ${(platePath.length / 1024).toFixed(0)} KB`,
);
