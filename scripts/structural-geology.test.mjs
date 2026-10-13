import test from 'node:test';
import assert from 'node:assert/strict';
import {foldedBed,faultBed,faultSlip} from '../src/labs/folds-faults/geometry.ts';
test('normal and reverse slip stay parallel to a 60 degree dipping plane; strike slip has no throw',()=>{
  for(const kind of [2,3]){const [x,y,z]=faultSlip(kind,.7);assert.ok(Math.abs(x+y/Math.tan(Math.PI/3))<1e-12);assert.equal(z,0);assert.equal(Math.sign(y),kind===2?-1:1);}
  assert.deepEqual(faultSlip(4,.7),[0,0,.7]);
});
test('folded and faulted bed geometries have finite closed extrusion faces',()=>{
  for(const g of [foldedBed(0,.7),foldedBed(4,.7,true),faultBed(0,false),faultBed(4,true),faultBed(2,true,true)]){
    const p=g.attributes.position,n=g.attributes.normal;assert.ok(p.count>20);assert.ok(g.groups.some(group=>group.materialIndex===0));assert.ok(g.groups.some(group=>group.materialIndex===1));
    for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));assert.ok(Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)));}
    g.dispose();
  }
});
test('each folded bed preserves its cross-section area during shortening and thickening',()=>{
  for(const amplitude of [0,.4,1])for(const syncline of [false,true]){const g=foldedBed(2,amplitude,syncline),p=g.attributes.position;let area=0;
    for(let i=0;i<p.count;i+=3){if([0,1,2].some(j=>Math.abs(p.getZ(i+j)+1.1)>1e-5))continue;
      const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i);area+=Math.abs(ax*by-ay*bx)/2;}
    assert.ok(Math.abs(area-5.2*.35)<1e-5);g.dispose();
  }
});
