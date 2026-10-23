import test from 'node:test';
import assert from 'node:assert/strict';
import {riverBanks,riverStage,riverGround,riverSurface,riverTerrain,riverBed,riverSection} from '../src/labs/shared/river-terrain.ts';

test('shoreline height sampling agrees with the actual indexed terrain triangles',()=>{
 const g=riverTerrain(),p=g.attributes.position,index=g.index;
 for(let i=0;i<80;i++){
  const x=-2.95+((i*.61803398875)%1)*5.9,z=-1.95+((i*.41421356)%1)*3.9;
  const cellX=Math.floor((x+3)/6*256),cellZ=Math.floor((z+2)/4*256);let height;
  for(let t=0;t<2;t++){
   const ids=[0,1,2].map(k=>index.getX((cellZ*256+cellX)*6+t*3+k)),[a,b,c]=ids.map(k=>[p.getX(k),p.getY(k),p.getZ(k)]);
   const determinant=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
   const wa=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/determinant;
   const wb=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/determinant,wc=1-wa-wb;
   if(Math.min(wa,wb,wc)>=-1e-7)height=wa*a[1]+wb*b[1]+wc*c[1];
  }
  assert.ok(Number.isFinite(height));assert.ok(Math.abs(height-riverGround(x,z))<1e-6);
 }
 g.dispose();
});

test('water meets both banks and rising stage expands the wetted channel on a fixed bed',()=>{
 for(let i=0;i<=120;i++){
  const x=-3+i*.05;
  let previousWidth=0,previousStage=-Infinity;
  for(const q of [.2,.7,1,1.6]){
   const [left,right]=riverBanks(x,q),stage=riverStage(x,q);
   assert.ok(right-left>previousWidth);assert.ok(stage>previousStage);
   for(const z of [left,right])assert.ok(Math.abs(riverGround(x,z)-stage)<5e-8,'wet edge meets the actual rendered bank triangles');
   for(let j=1;j<20;j++)assert.ok(riverGround(x,left+(right-left)*j/20)<stage,'entire channel is submerged');
   previousWidth=right-left;previousStage=stage;
  }
 }
});
test('river water has finite depth, upward faces and identical footprint at true vertical scale',()=>{
 for(const q of [.2,.7,1.6]){
  const a=riverSurface(q),b=riverSurface(q,1/12),p=a.attributes.position,r=b.attributes.position;
  assert.ok([...p.array,...a.attributes.normal.array,...a.attributes.waterDepth.array].every(Number.isFinite));
  for(let i=0;i<p.count;i++){
   assert.equal(p.getX(i),r.getX(i));assert.equal(p.getZ(i),r.getZ(i));
   assert.ok(Math.abs((p.getY(i)-.001)/12+.001-r.getY(i))<1e-7);
   assert.ok(a.attributes.normal.getY(i)>0);assert.ok(a.attributes.waterDepth.getX(i)>=0);
  }
  a.dispose();b.dispose();
 }
});

test('the channel and the water both deepen downstream, as in real rivers', () => {
  for (const q of [0.2, 0.7, 1.6]) {
    let previousWater = 0, previousDepth = 0;
    for (let i = 0; i <= 12; i++) {
      const x = -3 + i * 0.5;
      const water = riverStage(x, q) - riverBed(x), depth = riverSection(x, 1).depth;
      assert.ok(water > previousWater, `water depth grows downstream at q=${q}, x=${x}`);
      assert.ok(depth > previousDepth, `channel depth grows downstream at x=${x}`);
      assert.ok(water < depth, `water stays within the banks at q=${q}, x=${x}`);
      previousWater = water; previousDepth = depth;
    }
  }
});
