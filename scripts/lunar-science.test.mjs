import test from 'node:test';
import assert from 'node:assert/strict';
import {LUNAR,lunarPosition,illuminatedFraction,lunarEclipse,shadowRadii,equilibriumTide} from '../src/lib/lunar-science.ts';

test('inclined circular orbit preserves distance and has two nodes, not an eclipse every month',()=>{
  for(let t=0;t<1;t+=.01)assert.ok(Math.abs(Math.hypot(...lunarPosition(t))-LUNAR.distance)<1e-7);
  assert.ok(Math.abs(lunarPosition(60/360)[1])<1e-8);
  assert.ok(Math.abs(lunarPosition(240/360)[1])<1e-8);
  assert.equal(lunarEclipse(lunarPosition(.5,60)), 'Moon misses Earth’s shadow');
  assert.equal(lunarEclipse(lunarPosition(.5,0)), 'Total lunar eclipse');
  assert.equal(lunarEclipse(lunarPosition(.5,60,true)), 'Total lunar eclipse');
});
test('phase follows illumination geometry; quarters do not depend on Earth casting a shadow',()=>{
  for(const [phase,want] of [[0,0],[.25,.5],[.5,1],[.75,.5]])assert.ok(Math.abs(illuminatedFraction(lunarPosition(phase,0,true))-want)<1e-10);
});
test('shadow cones narrow and widen correctly; lunar distance allows total or annular solar geometry',()=>{
  const earth=shadowRadii(LUNAR.earth,LUNAR.au,LUNAR.distance);
  assert.ok(earth.umbra>4500&&earth.umbra<4700);assert.ok(earth.penumbra>8100&&earth.penumbra<8300);
  const atNearEarth=d=>shadowRadii(LUNAR.moon,LUNAR.au-d,d-LUNAR.earth).umbra;
  assert.ok(atNearEarth(356500)>0);assert.ok(atNearEarth(406700)<0);
});
test('equilibrium tide has opposite bulges, stronger alignment and zero spherical mean potential',()=>{
  assert.equal(equilibriumTide([1,0,0],[1,0,0]),equilibriumTide([-1,0,0],[1,0,0]));
  assert.ok(equilibriumTide([1,0,0],[1,0,0])>equilibriumTide([1,0,0],[0,0,1]));
  let sum=0;const n=10000;
  for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);sum+=equilibriumTide([r*Math.cos(a),y,r*Math.sin(a)],[.2,.1,1]);}
  assert.ok(Math.abs(sum/n)<1e-5);
});
