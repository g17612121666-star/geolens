import test from 'node:test';
import assert from 'node:assert/strict';
import {annualRiverRegime,catchmentRelief} from '../src/lib/river-regime-science.ts';
import {terrainBlockGeometry} from '../src/labs/shared/science-geometry.ts';
test('catchment mesh stays finite at Float32 outlet edges in both relief modes',()=>{
 for(const vertical of [.1,1]){
  const g=terrainBlockGeometry((x,z)=>catchmentRelief(x,z)*vertical,3.2,3.2,80,-.12);
  g.computeBoundingSphere();g.computeBoundingBox();
  assert.ok([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite));
  assert.ok(Number.isFinite(g.boundingSphere.radius));
  assert.ok(Math.abs(catchmentRelief(Math.fround(1.6),0)-.08)<1e-8);
  assert.ok(catchmentRelief(-1.6,0)>catchmentRelief(1.6,0));
  g.dispose();
 }
});
test('annual catchment budget closes across snow, losses, routing and optional dam',()=>{
 for(const snow of [false,true])for(const dam of [false,true]){const a=annualRiverRegime(snow,dam);assert.equal(a.series.length,365);assert.ok(Math.abs(a.initialStore+a.precipitationTotal-a.finalStore-a.lossTotal-a.outflowTotal)<1e-7);assert.ok(a.series.every(s=>s.snow>=0&&s.flow>=0));}
});
test('snowfall is delayed into melt and reservoir attenuates the annual discharge peak',()=>{
 const snow=annualRiverRegime(true,false),dam=annualRiverRegime(true,true);assert.ok(snow.series.some(s=>s.snowfall>0&&s.melt===0));assert.ok(snow.series.some(s=>s.snowfall===0&&s.melt>s.precipitation));assert.ok(Math.max(...dam.series.map(s=>s.flow))<Math.max(...snow.series.map(s=>s.flow)));assert.ok(Math.abs(dam.outflowTotal-snow.outflowTotal)<1e-6);
});
