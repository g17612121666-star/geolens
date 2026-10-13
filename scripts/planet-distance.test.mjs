import test from 'node:test';import assert from 'node:assert/strict';
import {PLANETS,planetPosition,planetRadiusAtOrbitScale} from '../src/lib/planet-science.ts';
import {AU_KM,LIGHT_YEAR_KM,distanceModel} from '../src/lib/distance-science.ts';
test('each ellipse closes after its period and reaches the specified apsidal distances',()=>{
 PLANETS.forEach((p,i)=>{const a=planetPosition(i,0),b=planetPosition(i,p.period),far=planetPosition(i,p.period/2);assert.ok(Math.hypot(...a.map((v,k)=>v-b[k]))<1e-10);assert.ok(Math.abs(Math.hypot(...a)-p.a*(1-p.e))<1e-10);assert.ok(Math.abs(Math.hypot(...far)-p.a*(1+p.e))<1e-10);});
});
test('orbital areal velocity is conserved and inner orbits have shorter periods',()=>{
 PLANETS.forEach((p,i)=>{const h=[];for(const f of [.07,.31,.69]){const dt=p.period*1e-5,a=planetPosition(i,f*p.period),before=planetPosition(i,f*p.period-dt),after=planetPosition(i,f*p.period+dt),v=after.map((x,k)=>(x-before[k])/(2*dt));h.push(Math.hypot(a[1]*v[2]-a[2]*v[1],a[2]*v[0]-a[0]*v[2],a[0]*v[1]-a[1]*v[0]));}assert.ok((Math.max(...h)-Math.min(...h))/h[0]<1e-7);if(i)assert.ok(p.period>PLANETS[i-1].period);});
});
test('physical radii retain AU scale; light time and model progress use the same distance',()=>{
 PLANETS.forEach((p,i)=>assert.ok(Math.abs(planetRadiusAtOrbitScale(i,2)/2*AU_KM-p.radius)<1e-9));
 assert.ok(Math.abs(LIGHT_YEAR_KM-9460730472580.8)<.01);
 for(let i=0;i<3;i++){const a=distanceModel(i,.5);assert.equal(a.pulseKm,a.distanceKm/2);assert.ok(Math.abs(a.originRadius/6-a.originRadiusKm/a.distanceKm)<1e-16);}
 assert.ok(Math.abs(distanceModel(1,1).lightSeconds-499.004784)<1e-6);
});
