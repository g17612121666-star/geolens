import test from 'node:test';
import assert from 'node:assert/strict';
import {waterfallLip,waterfallBed,settlingVelocity,settlingDistance} from '../src/lib/fluvial-science.ts';
import {duneHeight} from '../src/lib/aeolian-science.ts';
import {GYRE_BRANCHES,SUBTROPICAL_GYRES} from '../src/lib/ocean-circulation-science.ts';
test('waterfall retreats upstream while both reaches descend downstream',()=>{
 assert.equal(waterfallLip(0)-waterfallLip(1),2.5);
 for(const t of [0,.5,1]){const x=waterfallLip(t);assert.ok(waterfallBed(x-.001,t)>waterfallBed(x+.001,t)+1);assert.ok(waterfallBed(-3,t)>waterfallBed(x-.01,t));assert.ok(waterfallBed(x+1,t)>waterfallBed(3,t));}
});
test('Stokes fine-silt settling has quadratic diameter scaling and low Reynolds number',()=>{
 assert.ok(Math.abs(settlingVelocity(40e-6)/settlingVelocity(20e-6)-4)<1e-12);
 for(const d of [10e-6,50e-6]){const w=settlingVelocity(d);assert.ok(w>0);assert.ok(998*w*d/1.002e-3<.12);assert.ok(Math.abs(settlingDistance(d)*w-.2)<1e-12);}
});
test('barchan centre has a 32 degree lee slope and downwind horns',()=>{
 const dx=.001,lee=(duneHeight(-.4,0)-duneHeight(-.4+dx,0))/dx;
 assert.ok(Math.abs(lee-Math.tan(32*Math.PI/180))<1e-10);
 assert.ok(duneHeight(1.12,1.3)>0);assert.equal(duneHeight(-1,1.3),0);
 const volume=(offset)=>{let sum=0;for(let i=0;i<500;i++)for(let j=0;j<300;j++)sum+=duneHeight(-4+i*.016-offset,-2+j*.013333333);return sum;};
 assert.ok(Math.abs(volume(.3)/volume(0)-1)<.002);
});
test('warm western branches move poleward and cool eastern branches equatorward',()=>{
 SUBTROPICAL_GYRES.forEach((g,k)=>{for(const i of GYRE_BRANCHES[k].warm)assert.ok(Math.abs(g.points[i+1][0])>Math.abs(g.points[i][0]),g.name);for(const i of GYRE_BRANCHES[k].cool)assert.ok(Math.abs(g.points[i+1][0])<Math.abs(g.points[i][0]),g.name);});
});
