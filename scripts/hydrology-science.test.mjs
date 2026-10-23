import test from 'node:test';
import assert from 'node:assert/strict';
import {stormHydrograph,wellHead,BASEFLOW} from '../src/lib/hydrology-science.ts';
test('storm reservoir conserves rainfall between losses, routing storage and runoff',()=>{
  for(const urban of [0,.2,1])for(const rain of [.2,1,1.6]){const s=stormHydrograph(urban,rain);assert.ok(Math.abs(s.precipitation-40000*rain)<1e-6);assert.ok(Math.abs(s.precipitation-s.loss-s.outflow-s.storage-s.queued)<1e-6);assert.ok(s.rows.every(r=>r.q>=0&&r.storage>=0));}
});
test('impervious cover increases the peak and shortens lag; rainfall scaling preserves timing',()=>{
  const rural=stormHydrograph(0,1),urban=stormHydrograph(1,1),double=stormHydrograph(0,1.6);
  assert.ok(urban.peak.q>rural.peak.q&&urban.lag<rural.lag);assert.equal(double.peak.hour,rural.peak.hour);assert.ok(Math.abs((double.peak.q-BASEFLOW)/(rural.peak.q-BASEFLOW)-1.6)<1e-10);
  assert.ok(rural.rows[0].q>=BASEFLOW&&Math.abs(rural.rows.at(-1).q-BASEFLOW)<.01);
});
test('radial well has fixed boundary head, logarithmic confined drawdown and a saturated confined thickness',()=>{
  for(const confined of [false,true]){assert.equal(wellHead(500,1,23,confined),23);assert.equal(wellHead(1,0,23,confined),23);assert.ok(wellHead(1,1,23,confined)<wellHead(100,1,23,confined));}
  assert.ok(wellHead(.2,1,23,true)>12);
  assert.ok(Math.abs((31-wellHead(10,1,31,true))-2*(31-wellHead(10,.5,31,true)))<1e-10);
});
