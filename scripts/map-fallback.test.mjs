import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachStyleFallback, OSM_RASTER_STYLE, OSM_RELIEF_STYLE, NATURAL_EARTH_STYLE } from '../src/lib/map-style.ts';

function harness(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const listeners = new Map();
  const styles = [], phases = [];
  let style = { sources: { openmaptiles: { type: 'vector' } } };
  const map = {
    on(name, fn) { const fns = listeners.get(name) ?? new Set(); fns.add(fn); listeners.set(name, fns); },
    off(name, fn) { listeners.get(name)?.delete(fn); },
    getStyle() { return style; },
    setStyle(next) { style = next; styles.push(next); this.emit('style.load'); },
    emit(name, event) { for (const fn of listeners.get(name) ?? []) fn(event); },
  };
  const stop = attachStyleFallback(map, { onPhase: p => phases.push(p) });
  t.after(stop);
  return { map, styles, phases, stop, listeners };
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
  assert.deepEqual(h.styles, [OSM_RELIEF_STYLE]);
  h.stop();
  t.mock.timers.tick(40000);
  assert.equal(h.styles.length, 1);
  assert.ok([...h.listeners.values()].every(fns => fns.size === 0));
});
