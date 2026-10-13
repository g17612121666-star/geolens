import test from 'node:test';
import assert from 'node:assert/strict';
import {sphericalAreaKm2,geodesicCoordinates} from '../src/lib/map-measure.ts';
test('dateline area equals same polygon shifted to Greenwich',()=>{
  const a=[{lat:0,lon:179},{lat:0,lon:-179},{lat:2,lon:-179},{lat:2,lon:179}];
  const b=a.map(p=>({...p,lon:p.lon>0?p.lon-180:p.lon+180}));
  assert.ok(Math.abs(sphericalAreaKm2(a)-sphericalAreaKm2(b))<1e-6);
  assert.ok(sphericalAreaKm2(a)>49000&&sphericalAreaKm2(a)<50000);
  const line=geodesicCoordinates(a,true);assert.ok(line.every((p,i)=>!i||Math.abs(p[0]-line[i-1][0])<3));
});
test('spherical triangle of three right angles covers one eighth of Earth',()=>{
  const area=sphericalAreaKm2([{lat:0,lon:0},{lat:0,lon:90},{lat:90,lon:0}]);
  assert.ok(Math.abs(area-Math.PI*6371**2/2)<0.01);
});
