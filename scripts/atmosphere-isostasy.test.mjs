import test from 'node:test';
import assert from 'node:assert/strict';
import {mountainParcel} from '../src/lib/atmosphere-science.ts';
import {isostaticColumn,AIRY} from '../src/lib/isostasy-science.ts';
test('dry ascent below cloud base returns to the same sea-level temperature and humidity',()=>{
  const p=mountainParcel(0,900,.2,true);assert.ok(p.lcl>900);assert.ok(Math.abs(p.temperature-20)<1e-10);assert.ok(Math.abs(p.relativeHumidity-.2)<1e-10);assert.equal(p.condensedGrams,0);
});
test('condensing ascent and rainout lead to warmer, less humid lee air',()=>{
  const windward=mountainParcel(2100,2100,.7),lee=mountainParcel(0,2100,.7,true);
  assert.ok(windward.lcl<2100);assert.ok(windward.condensedGrams>0);assert.ok(lee.temperature>20);assert.ok(lee.relativeHumidity<.7);
  assert.ok(Math.abs(mountainParcel(2100,2100,.7,true).temperature-windward.temperature)<1e-10);
});
test('Airy ice loading balances column mass and preserves rock thickness',()=>{
  for(const ice of [0,1000,3000]){const c=isostaticColumn(ice);assert.ok(Math.abs(c.root+c.landElevation-AIRY.crustThickness)<1e-9);assert.ok(Math.abs(c.root*AIRY.mantleDensity-AIRY.crustThickness*AIRY.crustDensity-ice*AIRY.iceDensity)<1e-5);}
  assert.ok(Math.abs(isostaticColumn(3000).depression-833.636363636)<1e-6);
});
