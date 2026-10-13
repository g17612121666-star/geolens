import test from 'node:test';
import assert from 'node:assert/strict';
import {spreadingCrust} from '../src/lib/spreading-science.ts';
test('full rate and half rate retain SI conversion and flank symmetry',()=>{
  assert.equal(spreadingCrust(50,25,4.4).ageMa,4);
  for(const x of [0,5,15,50])assert.deepEqual(spreadingCrust(-x,25,4.4),spreadingCrust(x,25,4.4));
});
test('a material marker moves with the flank while preserving its formation time and polarity',()=>{
  const a=spreadingCrust(10,25,4),b=spreadingCrust(22.5,25,5);
  assert.ok(Math.abs(a.formationMa-b.formationMa)<1e-12);assert.equal(a.polarity,b.polarity);assert.equal(b.ageMa-a.ageMa,1);
});
