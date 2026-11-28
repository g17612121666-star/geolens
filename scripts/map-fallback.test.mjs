import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  attachStyleFallback, LIBERTY, OSM_RASTER_STYLE, NATURAL_EARTH_STYLE, TERRAIN_TILES, withBathymetry, withRelief,
} from '../src/lib/map-style.ts';

// The parts of OpenFreeMap's Liberty style that relief and bathymetry build on, in Liberty's order.
const LIBERTY_JSON = {
  version: 8,
  sources: { ne2_shaded: { type: 'raster' }, openmaptiles: { type: 'vector' } },
  layers: [
    { id: 'background', type: 'background' },
    { id: 'natural_earth', type: 'raster', source: 'ne2_shaded' },
    { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park' },
    { id: 'landcover_wood', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover' },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'] },
    { id: 'place_label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place' },
  ],
};
const ids = style => style.layers.map(l => l.id);

function harness(t, opts = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const listeners = new Map();
  const styles = [], phases = [], transforms = [], diffs = [];
  let style = { sources: { openmaptiles: { type: 'vector' } } };
  const map = {
    on(name, fn) { const fns = listeners.get(name) ?? new Set(); fns.add(fn); listeners.set(name, fns); },
    off(name, fn) { listeners.get(name)?.delete(fn); },
    getStyle() { return style; },
    setStyle(next, options) {
      // A style URL arrives as Liberty; the basemap's transform then adds its layers.
      style = options?.transformStyle ? options.transformStyle(style, structuredClone(LIBERTY_JSON)) : next;
      styles.push(next); transforms.push(options?.transformStyle); diffs.push(options?.diff);
      this.emit('style.load');
    },
    emit(name, event) { for (const fn of listeners.get(name) ?? []) fn(event); },
  };
  const stop = attachStyleFallback(map, { ...opts, onPhase: p => phases.push(p) });
  t.after(stop);
  return { map, styles, phases, stop, listeners, transforms, diffs };
}

test('a real content tile keeps a healthy map beyond every fallback timeout', t => {
  const h = harness(t);
  h.map.emit('sourcedata', { sourceId: 'openmaptiles', sourceDataType: 'content', tile: { state: 'loaded' } });
  t.mock.timers.tick(40000);
  assert.deepEqual(h.styles, []);
  assert.equal(h.phases.at(-1), 'ready');
});

test('metadata and teaching overlays do not count as loaded basemap tiles', t => {
  const h = harness(t);
  h.map.emit('sourcedata', { sourceId: 'openmaptiles', sourceDataType: 'metadata', isSourceLoaded: true });
  h.map.emit('sourcedata', { sourceId: 'plates', tile: { state: 'loaded' } });
  t.mock.timers.tick(8000);
  assert.equal(h.styles[0], OSM_RASTER_STYLE);
  h.map.emit('sourcedata', { sourceId: 'osm', sourceDataType: 'content', tile: { state: 'loaded' } });
  t.mock.timers.tick(40000);
  assert.equal(h.styles.length, 1);
});

test('provider failure advances once; stale and overlay errors do not skip providers', t => {
  const h = harness(t);
  const error = { status: 403, message: 'Forbidden' };
  for (let i = 0; i < 5; i++) h.map.emit('error', { sourceId: 'openmaptiles', error });
  t.mock.timers.tick(250);
  assert.equal(h.styles[0], OSM_RASTER_STYLE);
  h.map.emit('error', { sourceId: 'openmaptiles', error });
  h.map.emit('error', { sourceId: 'plates', error });
  t.mock.timers.tick(250);
  assert.equal(h.styles.length, 1);
  h.map.emit('error', { sourceId: 'osm', error: { status: 429 } });
  t.mock.timers.tick(250);
  assert.equal(h.styles.at(-1), NATURAL_EARTH_STYLE);
});

test('local coastline fallback reports offline only after its data loads', t => {
  const h = harness(t);
  for (let i = 0; i < 2; i++) t.mock.timers.tick(8000);
  assert.equal(h.styles.at(-1), NATURAL_EARTH_STYLE);
  assert.equal(h.phases.at(-1), 'loading');
  h.map.emit('sourcedata', { sourceId: 'land', sourceDataType: 'content', isSourceLoaded: false, tile: { state: 'loaded' } });
  assert.equal(h.phases.at(-1), 'offline');
});

test('manual basemap selection starts a fresh deadline and disposal removes listeners', t => {
  const h = harness(t);
  t.mock.timers.tick(7900);
  h.stop.select('relief');
  t.mock.timers.tick(200);
  assert.deepEqual(h.styles, [LIBERTY]);
  assert.equal(typeof h.transforms[0], 'function');
  // Relief keeps OpenFreeMap's tiles: only a full reload brings the tile loads that mark it healthy.
  assert.deepEqual(h.diffs, [false]);
  h.stop();
  t.mock.timers.tick(40000);
  assert.equal(h.styles.length, 1);
  assert.ok([...h.listeners.values()].every(fns => fns.size === 0));
});

test('a relief map loads OpenFreeMap with shading added, and elevation errors do not replace it', t => {
  const h = harness(t, { start: 'relief' });
  assert.deepEqual(h.styles, [LIBERTY]);
  const style = h.map.getStyle();
  assert.equal(style.sources.terrain.type, 'raster-dem');
  assert.deepEqual(style.sources.terrain.tiles, [TERRAIN_TILES]);
  assert.deepEqual(ids(style), ['background', 'natural_earth', 'relief-tint', 'park', 'landcover_wood', 'relief-shade', 'water', 'place_label']);
  // Health is judged on the OpenFreeMap tiles only: a blocked elevation server leaves a plain map.
  h.map.emit('error', { sourceId: 'terrain', error: { status: 403, message: 'Forbidden' } });
  t.mock.timers.tick(250);
  assert.equal(h.styles.length, 1);
  h.map.emit('sourcedata', { sourceId: 'openmaptiles', sourceDataType: 'content', tile: { state: 'loaded' } });
  assert.equal(h.phases.at(-1), 'ready');
  t.mock.timers.tick(40000);
  assert.equal(h.styles.length, 1);
});

test('the relief tint leaves land at or below sea level uncolored', () => {
  const tint = withRelief(structuredClone(LIBERTY_JSON)).layers.find(l => l.id === 'relief-tint');
  const stops = tint.paint['color-relief-color'].slice(3);
  assert.equal(stops[0], 0);
  assert.match(stops[1], /,\s*0\)$/);
});

test('bathymetry colors only the sea by depth, keeps lakes and rivers blue and has no labels', () => {
  const style = withBathymetry(structuredClone(LIBERTY_JSON));
  // No place_label: the landforms quiz asks where features are on this map.
  assert.deepEqual(ids(style), ['background', 'natural_earth', 'ocean-base', 'ocean-depth', 'ocean-shade', 'park', 'landcover_wood', 'water']);
  const ocean = ['==', ['get', 'class'], 'ocean'];
  const base = style.layers.find(l => l.id === 'ocean-base');
  assert.deepEqual([base.source, base['source-layer'], base.filter], ['openmaptiles', 'water', ocean]);
  // Liberty's own water layer keeps its filter and now draws everything except the ocean.
  assert.deepEqual(style.layers.find(l => l.id === 'water').filter, ['all', ['!=', ['get', 'brunnel'], 'tunnel'], ['!', ocean]]);
  // Depth colors start below the lowest dry land (about 440 m below sea level, by the Dead Sea).
  const stops = style.layers.find(l => l.id === 'ocean-depth').paint['color-relief-color'].slice(3);
  const inputs = stops.filter((_, i) => i % 2 === 0);
  assert.ok(inputs.every((v, i) => i === 0 || v > inputs[i - 1]), 'stops rise with elevation');
  assert.ok(inputs.at(-1) <= -450);
  assert.match(stops.at(-1), /,\s*0\)$/);
});
