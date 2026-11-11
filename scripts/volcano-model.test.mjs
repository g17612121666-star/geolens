import test from 'node:test';
import assert from 'node:assert/strict';
import {edifice,edificeHeight,flankProfile,meanSlope,summit} from '../src/labs/volcanoes/geometry.ts';
import {makeLandscape,traceFlow,meshSurface,SX,SZ,BASE,CHAMBER,TRUE_RELIEF,FISSURE_HALF} from '../src/labs/volcanoes/landscape.ts';
import {terrainBlockGeometry} from '../src/labs/shared/science-geometry.ts';

test('edifice shapes run from a broad shield to a steep composite cone',()=>{
 let last=null;
 for(let v=0;v<=1.0001;v+=.05){
  const e=edifice(v);
  if(last){
   assert.ok(e.radius<last.radius,'stickier lava builds a narrower edifice');
   assert.ok(e.height>=last.height,'and a taller one');
   assert.ok(e.form>=last.form);
  }
  last=e;
 }
 for(const form of [0,.5,1]){
  assert.equal(flankProfile(form,0),1);
  assert.equal(flankProfile(form,1),0);
  for(let u=0;u<1;u+=.05)assert.ok(flankProfile(form,u+.05)<=flankProfile(form,u)+1e-12,'flanks fall away from the center');
 }
 // A shield is convex near the top; a composite cone is concave (steepest near the summit).
 assert.ok(flankProfile(0,.5)>.5&&flankProfile(1,.5)<.5);
});

test('heights are finite, never negative, zero beyond the base, with a crater below the rim',()=>{
 for(const v of [0,.25,.5,.85,1]){
  const e=edifice(v),{rim,floor}=summit(e);
  assert.ok(floor<rim,'the vent lies below the crater rim');
  assert.ok(Math.abs(edificeHeight(e,0)-floor)<1e-5);
  for(let r=0;r<e.radius*1.3;r+=.013)for(let a=-Math.PI;a<Math.PI;a+=.37){
   const y=edificeHeight(e,r,a);
   assert.ok(Number.isFinite(y)&&y>=0);
   if(r>=e.radius)assert.equal(y,0);
  }
  assert.ok(Number.isFinite(edificeHeight(e,Math.fround(e.radius)+1e-7,1.5)));
 }
});

test('mean slopes at real proportions match the ranges quoted in the lab',()=>{
 // "shields about 4–8°, composite cones about 13–25° on average"
 for(const v of [0,.1,.25]){const s=meanSlope(edifice(v),TRUE_RELIEF);assert.ok(s>=4&&s<=8,`shield v=${v}: ${s}`);}
 for(const v of [.75,.85,1]){const s=meanSlope(edifice(v),TRUE_RELIEF);assert.ok(s>=13&&s<=25,`cone v=${v}: ${s}`);}
 assert.ok(meanSlope(edifice(.25))>meanSlope(edifice(.25),TRUE_RELIEF),'the teaching view exaggerates slopes');
});

test('landscapes stay inside the block, with the vent below the rim and the chamber in the crust',()=>{
 assert.ok(CHAMBER.y-CHAMBER.b>BASE&&CHAMBER.y+CHAMBER.b<0,'chamber sits between the base and the old ground surface');
 for(const fissure of [false,true])for(const v of [0,.25,.85,1])for(const k of [1,TRUE_RELIEF]){
  const L=makeLandscape(v,fissure,k);
  if(!fissure){
   assert.ok(L.vent<L.rim);
   assert.ok(L.e.radius<=SZ/2+1e-9,'the edifice fits the block');
  }else assert.ok(FISSURE_HALF<SZ/2);
  for(let x=-SX/2;x<=SX/2;x+=.17)for(let z=-SZ/2;z<=SZ/2;z+=.17){
   const y=L.h(x,z),a=L.lavaAge(x,z);
   assert.ok(Number.isFinite(y)&&y>BASE&&y<2.2);
   assert.ok(y>=L.ground(x,z)-1e-9,'old lava flows add relief, never remove it');
   assert.ok(a>=0&&a<=1);
  }
 }
});

test('lava flows run downhill and stop at the edge of the block',()=>{
 const L=makeLandscape(.25,false,1);
 for(const a of [1.8,-2.5,.4]){
  const r0=L.e.craterRadius*1.02,path=traceFlow(L.h,[Math.sin(a)*r0,Math.cos(a)*r0],L.e.radius,7,[Math.sin(a),Math.cos(a)]);
  assert.ok(path.length>20);
  const [x0,z0]=path[0],[x1,z1]=path.at(-1);
  assert.ok(L.h(x1,z1)<L.h(x0,z0)-.2,'ends well below where it started');
  for(const [x,z] of path)assert.ok(Math.abs(x)<=SX/2&&Math.abs(z)<=SZ/2);
 }
});

test('draped objects follow the drawn terrain mesh',()=>{
 const L=makeLandscape(.85,false,1),n=60,g=terrainBlockGeometry(L.h,SX,SZ,n,BASE),drape=meshSurface(g,n);
 for(let i=0;i<=n;i+=7)for(let j=0;j<=n;j+=9){
  const x=-SX/2+i*SX/n,z=-SZ/2+j*SZ/n;
  assert.ok(Math.abs(drape(x,z)-L.h(x,z))<1e-5,'matches the surface at grid vertices');
 }
 g.dispose();
});
