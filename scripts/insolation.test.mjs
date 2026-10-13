import test from 'node:test';import assert from 'node:assert/strict';
import {noonIrradiance,dailyMeanIrradiance} from '../src/lib/insolation-science.ts';
test('noon cosine and daily integral give equinox and polar limits',()=>{
 assert.equal(noonIrradiance(0,0),1361);assert.ok(Math.abs(noonIrradiance(60,0)-680.5)<1e-10);
 assert.ok(Math.abs(dailyMeanIrradiance(0,0)-1361/Math.PI)<1e-10);assert.equal(dailyMeanIrradiance(90,-23.44),0);
 assert.ok(Math.abs(dailyMeanIrradiance(90,23.44)-1361*Math.sin(23.44*Math.PI/180))<1e-10);
});
test('area-weighted daily irradiance integrates to one quarter TSI at every declination',()=>{
 for(const d of [-23.44,0,23.44]){let sum=0,weight=0;for(let i=0;i<1800;i++){const lat=-90+(i+.5)*.1,w=Math.cos(lat*Math.PI/180);sum+=dailyMeanIrradiance(lat,d)*w;weight+=w;}assert.ok(Math.abs(sum/weight-1361/4)<.001);}
});
