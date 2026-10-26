import test from 'node:test';
import assert from 'node:assert/strict';
import {waterRibbonGeometry,riverSurface} from '../src/labs/shared/river-terrain.ts';
import {icePosition,glacierBed,glacierIceGeometry} from '../src/labs/glaciers/geometry.ts';

test('water ribbons retain width and arc-length UVs through vertical falls without bank reversal',()=>{
 const path=[[-1,2,0],[0,2,0],[.025,1.5,0],[.02,1,0],[.01,.5,0],[0,0,0],[1,0,0]];
 const g=waterRibbonGeometry(path,.19),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<path.length;i++){
  assert.ok(Math.abs(Math.hypot(p.getX(i*2)-p.getX(i*2+1),p.getZ(i*2)-p.getZ(i*2+1))-.38)<1e-6);
  assert.ok(p.getZ(i*2)<p.getZ(i*2+1),'consistent banks through the drop');
  if(i)assert.ok(uv.getX(i*2)>uv.getX((i-1)*2),'UV distance advances downstream');
 }
 assert.ok([...p.array,...g.attributes.normal.array].every(Number.isFinite));g.dispose();
});
test('horizontal ribbons and main river surfaces face upward',()=>{
 for(const g of [waterRibbonGeometry([[-1,0,0],[0,0,0],[1,0,0]],.1),riverSurface(.7)]){
  const n=g.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(n.getY(i)>0);g.dispose();
 }
});
test('glacier crevasses remain within a finite solid-ice layer and close at lateral margins',()=>{
 for(const length of [2.2,3.75,5.3]){
  const g=glacierIceGeometry(length);g.computeBoundingSphere();
  assert.ok([...g.attributes.position.array,...g.attributes.normal.array,...g.attributes.uv.array].every(Number.isFinite));
  assert.ok(Number.isFinite(g.boundingSphere.radius));g.dispose();
  for(let i=0;i<=100;i++)for(const q of [-1,-.7,0,.7,1]){
   const p=icePosition(i/100,q,length),bed=glacierBed(p[0],p[2]);assert.ok(p[1]>=bed-1e-9);
   if(Math.abs(q)===1)assert.ok(Math.abs(p[1]-bed)<1e-9);
  }
  const s=.25+.006*Math.sin(.25*8),crack=icePosition(s,0,length),shoulder=icePosition(s+.025,0,length);
  assert.ok(crack[1]-glacierBed(crack[0],crack[2])<shoulder[1]-glacierBed(shoulder[0],shoulder[2])-.04);
 }
});
