import test from 'node:test';
import assert from 'node:assert/strict';
import {classroomDensity,COOL_BRANCH,ensoSection,SUBTROPICAL_GYRES,WARM_BRANCH} from '../src/lib/ocean-circulation-science.ts';
test('linear density experiment distinguishes cooling from freshwater dilution',()=>{
 assert.equal(classroomDensity(10,35),1027);
 assert.ok(classroomDensity(4,35)>1027);assert.ok(classroomDensity(4,32)<1027);
 for(const t of [0,10,20])assert.ok(classroomDensity(t,36)>classroomDensity(t,32));
});
test('prescribed ENSO states change slope and eastern warming consistently',()=>{
 const cold=ensoSection(-1),normal=ensoSection(0),warm=ensoSection(1);
 assert.ok(cold.westDepth-cold.eastDepth>normal.westDepth-normal.eastDepth);
 assert.ok(warm.westDepth-warm.eastDepth<normal.westDepth-normal.eastDepth);
 assert.ok(warm.eastTemperature>normal.eastTemperature&&normal.eastTemperature>cold.eastTemperature);
 assert.ok(cold.tradeStrength>normal.tradeStrength&&normal.tradeStrength>warm.tradeStrength);
 assert.ok(warm.ascentX>normal.ascentX);
});
test('five closed gyre routes have hemisphere-correct circulation in geographic coordinates',()=>{
 assert.equal(SUBTROPICAL_GYRES.length,5);
 for(const g of SUBTROPICAL_GYRES){assert.deepEqual(g.route[0],g.route.at(-1));let area=0;
  for(let i=1;i<g.route.length;i++){const a=g.route[i-1],b=g.route[i];area+=a[1]*b[0]-b[1]*a[0];}
  assert.equal(Math.sign(area),-Math.sign(g.center[0]),g.name);
 }
});
test('western boundary currents are narrow and fast, eastern ones slow (westward intensification)',()=>{
 for(const g of SUBTROPICAL_GYRES){
  const mean=(list)=>list.reduce((s,w)=>s+w[2],0)/list.length;
  const west=g.route.filter((w)=>w[3]>=WARM_BRANCH),east=g.route.filter((w)=>w[3]<=COOL_BRANCH);
  assert.ok(west.length>=3&&east.length>=2,g.name);
  assert.ok(west.every((w)=>w[1]<g.center[1])&&east.every((w)=>w[1]>g.center[1]),g.name);
  assert.ok(mean(west)>=2*mean(east),g.name);
  for(const w of g.route)assert.ok(w[2]>0&&w[2]<=1&&Math.abs(w[3])<=1,g.name);
 }
 // One speed scale: the Gulf Stream and Agulhas outrun the weaker Brazil Current.
 const top=(k)=>Math.max(...SUBTROPICAL_GYRES[k].route.map((w)=>w[2]));
 assert.ok(top(0)>2*top(1)&&top(4)>2*top(1));
});
