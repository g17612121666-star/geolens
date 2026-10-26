import test from 'node:test';
import assert from 'node:assert/strict';
import {classroomDensity,ensoSection,SUBTROPICAL_GYRES} from '../src/lib/ocean-circulation-science.ts';
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
 for(const g of SUBTROPICAL_GYRES){assert.deepEqual(g.points[0],g.points.at(-1));let area=0;
  for(let i=1;i<g.points.length;i++){const a=g.points[i-1],b=g.points[i];area+=a[1]*b[0]-b[1]*a[0];}
  assert.equal(Math.sign(area),-Math.sign(g.center[0]),g.name);
 }
});
