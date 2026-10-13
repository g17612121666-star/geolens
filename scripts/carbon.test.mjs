import test from 'node:test';
import assert from 'node:assert/strict';
import {CARBON_INITIAL,carbonBudget} from '../src/lib/carbon-science.ts';
test('closed carbon budget conserves atoms, stays nonnegative and accounts for combustion',()=>{
 const initial=CARBON_INITIAL.reduce((a,b)=>a+b,0);
 for(const years of [0,1,40,100])for(const tap of [0,.2,1]){const b=carbonBudget(years,tap);assert.ok(Math.abs(b.total-initial)<1e-8);assert.ok(b.stores.every(v=>v>=0));assert.ok(Math.abs(b.emitted-10*tap*years)<1e-8);}
});
test('balanced natural transfers preserve the starting budget while emissions redistribute carbon',()=>{
 const baseline=carbonBudget(100,0);baseline.stores.forEach((v,i)=>assert.ok(Math.abs(v-CARBON_INITIAL[i])<1e-8));
 const perturbed=carbonBudget(100,1);assert.ok(perturbed.stores[0]>CARBON_INITIAL[0]);assert.ok(perturbed.stores[1]>CARBON_INITIAL[1]);assert.ok(perturbed.stores[2]>CARBON_INITIAL[2]);assert.ok(perturbed.stores[0]-CARBON_INITIAL[0]<perturbed.emitted);
});
