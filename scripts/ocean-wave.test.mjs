import test from 'node:test';
import assert from 'node:assert/strict';
import {longWaveTransect,shelfSetup,GRAVITY,WATER_DENSITY} from '../src/lib/ocean-wave-science.ts';
test('long-wave speed, travel time and Green-law energy flux are internally consistent',()=>{
  const tr=longWaveTransect(),first=tr.points[0],last=tr.points.at(-1);
  assert.ok(Math.abs(first.speed-Math.sqrt(GRAVITY*4000))<1e-10);assert.ok(Math.abs(last.depth-100)<1e-8);
  for(let i=1;i<tr.points.length;i++){const p=tr.points[i];assert.ok(p.travel>tr.points[i-1].travel);assert.ok(Math.abs(p.amplitude*p.amplitude*p.speed-first.amplitude**2*first.speed)<1e-9);}
  assert.ok(last.speed<first.speed);assert.ok(last.amplitude>first.amplitude);assert.ok(tr.totalTravel>tr.length/first.speed);
});
test('steady wind setup agrees with the closed-form uniform-shelf solution',()=>{
  const w=shelfSetup(30,20,0),exact=Math.sqrt(20**2+2*w.stress*w.length/(WATER_DENSITY*GRAVITY))-20;
  assert.ok(Math.abs(w.coastalSetup-exact)<1e-8);assert.equal(shelfSetup(0,20,0).coastalSetup,0);
  assert.ok(shelfSetup(30,5,0).coastalSetup>w.coastalSetup);assert.ok(shelfSetup(40,20,0).coastalSetup>w.coastalSetup);
});
test('pressure-only setup has the inverse-barometer limit; combined water depth stays positive',()=>{
  const p=shelfSetup(0,20,5000);assert.ok(Math.abs(p.coastalSetup-5000/(WATER_DENSITY*GRAVITY))<1e-10);
  const both=shelfSetup(45,5,8000);for(const point of both.points)assert.ok(point.eta>=0&&Number.isFinite(point.eta));assert.ok(both.coastalSetup>shelfSetup(45,5,0).coastalSetup);
});
