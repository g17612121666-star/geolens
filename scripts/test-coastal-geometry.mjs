import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHeadlandFront,weatherCliff } from '../src/labs/coasts/cliff-geometry.ts';

for(const cave of [false,true]) {
 const geometry=createHeadlandFront(cave),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),ids=geometry.index.array,edges=new Map();
 for(let i=0;i<ids.length;i+=3) {
  const [a,b,c]=Array.from(ids.slice(i,i+3));
  const ab=new THREE.Vector3().fromBufferAttribute(p,b).sub(new THREE.Vector3().fromBufferAttribute(p,a));
  const ac=new THREE.Vector3().fromBufferAttribute(p,c).sub(new THREE.Vector3().fromBufferAttribute(p,a));
  assert.ok(ab.cross(ac).length()>1e-10,'No degenerate surface triangles');
  for(const [u,v] of [[a,b],[b,c],[c,a]]) {const key=u<v?`${u}:${v}`:`${v}:${u}`;const edge=edges.get(key)??[0,0];edge[0]++;edge[1]+=u<v?1:-1;edges.set(key,edge);}
 }
 for(const [count,winding] of edges.values()) {assert.equal(count,2,'Surface remains watertight');assert.equal(winding,0,'Consistent outward winding');}
 assert.equal(p.count-edges.size+ids.length/3,0,'Arch retains one through-hole');
 assert.ok(ids.length/3<50000,'Bounded geometry for mobile');
 assert.ok([...p.array,...n.array].every(Number.isFinite));
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
 for(const y of [.25,.5,.8]) for(const x of [-.5,-.25,0]) {
  assert.equal(new THREE.Raycaster(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length,0,'A ray passes through the opening');
 }
 assert.ok(new THREE.Raycaster(new THREE.Vector3(-.25,1.4,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length>=2,'The roof remains solid');
 console.log(`${cave?'Cave front':'Arch'}: ${p.count} vertices, ${ids.length/3} triangles; closed, finite, opening clear, roof solid`);
 geometry.dispose();mesh.material.dispose();
}
const cube=weatherCliff(new THREE.BoxGeometry(1,1,1));assert.ok(cube.index.count<10000);cube.dispose();
