import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFeed, depthClass, markerRadius, boundarySegments, distanceToBoundaryKm } from '../src/lib/quakes.ts';

const plates = JSON.parse(readFileSync(new URL('../public/geo/plate-boundaries.json', import.meta.url), 'utf8'));
const segs = boundarySegments(plates);

test('parseFeed keeps well-formed events, sorted by magnitude, and skips events without a magnitude', () => {
  const quakes = parseFeed({ features: [
    { id: 'a', properties: { mag: 5.1, place: 'A', time: 1 }, geometry: { coordinates: [10, 20, 33] } },
    { id: 'b', properties: { mag: null, place: 'B', time: 2 }, geometry: { coordinates: [10, 20, 33] } },
    { id: 'c', properties: { mag: 6.4, place: 'C', time: 3, tsunami: 1 }, geometry: { coordinates: [-70, -30, 120] } },
  ] });
  assert.deepEqual(quakes.map((q) => q.id), ['c', 'a']);
  assert.equal(quakes[0].tsunami, true);
  assert.throws(() => parseFeed({ nope: true }));
});

test('depth classes and marker sizes follow the usual teaching bands', () => {
  assert.equal(depthClass(10), 'shallow');
  assert.equal(depthClass(150), 'intermediate');
  assert.equal(depthClass(600), 'deep');
  assert.ok(markerRadius(7) > markerRadius(5) && markerRadius(5) > markerRadius(4.5));
});

test('distance to the nearest plate boundary is small on a boundary and large in a plate interior', () => {
  // A vertex of the boundary data itself is (almost) zero distance away.
  const [lon, lat] = plates.features[0].geometry.coordinates[0];
  assert.ok(distanceToBoundaryKm(lat, lon, segs) < 1);
  // Chile trench region (2010 Maule earthquake epicentre, about 35.9° S, 72.7° W) lies near the boundary.
  assert.ok(distanceToBoundaryKm(-35.9, -72.7, segs) < 200);
  // Central Australia is far inside the Australian plate.
  assert.ok(distanceToBoundaryKm(-25, 134, segs) > 1000);
});

test('a real USGS feed (significant earthquakes, 2015) parses, merges duplicates and follows plate boundaries', () => {
  const raw = JSON.parse(readFileSync(new URL('./fixtures/usgs-significant-2015.geojson', import.meta.url), 'utf8'));
  const quakes = parseFeed(raw);
  assert.equal(raw.features.length, 156);
  // Nine events appear twice, reported by both the USGS and the Global CMT catalogue (within 1 s
  // and 1 km), including the M8.3 Illapel, Chile earthquake of 16 September 2015.
  assert.equal(quakes.filter((q) => q.mag === 8.3).length, 1);
  assert.equal(quakes[0].mag, 8.3);
  assert.equal(quakes.length, 147);
  const near = quakes.filter((q) => distanceToBoundaryKm(q.lat, q.lon, segs) <= 200).length;
  assert.ok(near / quakes.length > 0.8, `near ${near}/${quakes.length}`);
  assert.ok(quakes.some((q) => depthClass(q.depthKm) === 'deep'));
});
