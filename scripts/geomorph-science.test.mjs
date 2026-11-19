import test from 'node:test';
import assert from 'node:assert/strict';
import {waterfallLip,waterfallBed,settlingVelocity,settlingDistance} from '../src/lib/fluvial-science.ts';
import {COOL_BRANCH,SUBTROPICAL_GYRES,WARM_BRANCH} from '../src/lib/ocean-circulation-science.ts';
test('waterfall retreats upstream while both reaches descend downstream',()=>{
 assert.equal(waterfallLip(0)-waterfallLip(1),2.5);
 for(const t of [0,.5,1]){const x=waterfallLip(t);assert.ok(waterfallBed(x-.001,t)>waterfallBed(x+.001,t)+1);assert.ok(waterfallBed(-3,t)>waterfallBed(x-.01,t));assert.ok(waterfallBed(x+1,t)>waterfallBed(3,t));}
});
test('Stokes fine-silt settling has quadratic diameter scaling and low Reynolds number',()=>{
 assert.ok(Math.abs(settlingVelocity(40e-6)/settlingVelocity(20e-6)-4)<1e-12);
 for(const d of [10e-6,50e-6]){const w=settlingVelocity(d);assert.ok(w>0);assert.ok(998*w*d/1.002e-3<.12);assert.ok(Math.abs(settlingDistance(d)*w-.2)<1e-12);}
});
test('warm western branches move poleward and cool eastern branches equatorward',()=>{
 for(const g of SUBTROPICAL_GYRES)for(let i=1;i<g.route.length;i++){const a=g.route[i-1],b=g.route[i];
  if(a[3]>=WARM_BRANCH&&b[3]>=WARM_BRANCH)assert.ok(Math.abs(b[0])>Math.abs(a[0]),g.name);
  if(a[3]<=COOL_BRANCH&&b[3]<=COOL_BRANCH)assert.ok(Math.abs(b[0])<Math.abs(a[0]),g.name);}
});
