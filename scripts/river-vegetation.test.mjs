import test from 'node:test';
import assert from 'node:assert/strict';
import {riverVegetation} from '../src/labs/rivers/vegetation.ts';
import {riverLand,riverZ,riverBanks} from '../src/labs/shared/river-terrain.ts';
test('river woodland has irregular depth, gaps, mixed sizes and dry, separated tree bases',()=>{
 const v=riverVegetation(),trees=[...v.conifers,...v.broadleaf],distances=trees.map(({p})=>Math.abs(p[2]-riverZ(p[0])));
 assert.ok(trees.length>40&&trees.length<140);
 assert.ok(Math.max(...distances)-Math.min(...distances)>1,'woodland must extend away from a narrow line on the bank');
 assert.ok(Math.max(...trees.map(t=>t.size))-Math.min(...trees.map(t=>t.size))>.08);
 for(let i=0;i<trees.length;i++){
  const {p:[x,y,z]}=trees[i];assert.ok(Math.abs(x)<3&&Math.abs(z)<2);assert.ok(Math.abs(y-riverLand(x,z))<1e-9);
  const banks=riverBanks(x,1.6);assert.ok(z<banks[0]-.13||z>banks[1]+.13);
  for(let j=0;j<i;j++)assert.ok(Math.hypot(x-trees[j].p[0],z-trees[j].p[2])>.25);
 }
 for(const group of [v.conifers,v.broadleaf])assert.ok(group.some(t=>t.p[0]<0)&&group.some(t=>t.p[0]>0),'species must overlap instead of changing at a hard upstream boundary');
});
test('true scale changes root height without reshuffling woodland or moving roots off the terrain',()=>{
 const a=riverVegetation(),b=riverVegetation(1/12);
 for(const kind of ['conifers','broadleaf'])a[kind].forEach((t,i)=>{assert.equal(t.p[0],b[kind][i].p[0]);assert.equal(t.p[2],b[kind][i].p[2]);assert.ok(Math.abs(t.p[1]/12-b[kind][i].p[1])<1e-9);});
});
