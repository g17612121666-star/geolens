import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/labs/continental-drift/fossil-sites.json', import.meta.url), 'utf8'));

function angle([la1, lo1], [la2, lo2]) {
  const r = Math.PI / 180, a = Math.sin(la1 * r) * Math.sin(la2 * r) + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return Math.acos(Math.min(1, Math.max(-1, a))) / r;
}

test('fossil sites use the same 10 Ma snapshots as the coastline textures', () => {
  assert.deepEqual(data.ages, Array.from({ length: 26 }, (_, i) => i * 10));
  for (const age of data.ages.slice(1))
    assert.ok(existsSync(new URL(`../public/geo/reconstruction/coastlines-${age}-4k.webp`, import.meta.url)), `missing texture ${age}`);
});

test('every site has a valid position at every snapshot and sits on a plate', () => {
  for (const taxon of data.taxa)
    for (const site of taxon.sites) {
      assert.ok(site.plate > 0, site.label);
      assert.equal(site.positions.length, data.ages.length, site.label);
      for (const [lat, lon] of site.positions) {
        assert.ok(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180, site.label);
      }
    }
});

test('Mesosaurus sites in Brazil and southern Africa were close at 250 Ma and far apart today', () => {
  const sites = data.taxa.find((t) => t.key === 'mesosaurus').sites;
  const brazil = sites.find((s) => s.label.includes('Brazil')), namibia = sites.find((s) => s.label.includes('Namibia'));
  const today = angle(brazil.positions[0], namibia.positions[0]);
  const pangaea = angle(brazil.positions.at(-1), namibia.positions.at(-1));
  assert.ok(today > 55, `today ${today.toFixed(1)}°`);
  assert.ok(pangaea < 15, `250 Ma ${pangaea.toFixed(1)}°`);
});
