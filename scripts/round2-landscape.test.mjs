import test from 'node:test';
import assert from 'node:assert/strict';
import {waterRibbonGeometry,riverSurface} from '../src/labs/shared/river-terrain.ts';

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
