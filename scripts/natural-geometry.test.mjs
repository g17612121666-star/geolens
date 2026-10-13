import test from 'node:test';
import assert from 'node:assert/strict';
import {treeGeometry} from '../src/labs/shared/natural-geometry.ts';
test('botanical meshes have finite outward surfaces, UVs and distinct foliage at classroom scales',()=>{
 for(const kind of ['conifer','broadleaf','palm']){
  const {trunk,foliage}=treeGeometry(kind,12);
  for(const g of [trunk,foliage]){
   for(const key of ['position','normal','uv'])assert.ok(Array.from(g.attributes[key].array).every(Number.isFinite),`${kind} ${key}`);
   g.computeBoundingBox();assert.ok(g.boundingBox.min.y>-.1);assert.ok(g.boundingBox.max.y<3);
   const normals=g.attributes.normal;for(let i=0;i<normals.count;i++)assert.ok(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))>.99);
  }
  assert.ok(foliage.attributes.position.count>1000);assert.ok(trunk.boundingBox.max.y>1.5);
  trunk.dispose();foliage.dispose();
 }
});
test('tree seed reconstructs identical geometry without accumulating leaves on repeated scrubbing',()=>{
 const a=treeGeometry('conifer',4),b=treeGeometry('conifer',4),c=treeGeometry('conifer',5);
 assert.deepEqual(a.foliage.attributes.position.array,b.foliage.attributes.position.array);
 assert.notDeepEqual(a.foliage.attributes.position.array,c.foliage.attributes.position.array);
 for(const t of [a,b,c]){t.trunk.dispose();t.foliage.dispose();}
});
