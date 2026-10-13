import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const hash = (x:number,y:number,z:number) => {
  const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;
  return n-Math.floor(n);
};
function noise(x:number,y:number,z:number) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const smooth=(v:number)=>v*v*(3-2*v),a=smooth(x-ix),b=smooth(y-iy),c=smooth(z-iz);
  const mix=THREE.MathUtils.lerp;
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),
    mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c)-.5;
}

/** A continuous, non-periodic field preserves shared edges and the arch opening. */
export function cliffPoint(x:number,y:number,z:number):[number,number,number] {
  const broad=noise(x*2.3,y*3.1,z*2.1),chip=noise(x*9.3,y*8.1,z*8.7);
  return [x+.12*broad+.045*chip,
    y+.055*noise(x*4.2,y*1.7,z*3.8),
    z+.19*broad+.065*chip+.04*noise(x*4.7,y*12.3,z*3.2)];
}

export function createHeadlandFront(cave=false) {
  const outline=[[-3,-.2],[.9,-.2],[.86,.46],[.98,.85],[.83,1.38],[.54,1.72],[.21,1.79],[-.26,1.71],[-.7,1.69],[-1.22,1.79],[-1.8,1.85],[-2.36,1.76],[-3,1.73]];
  const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(...p))),hole=new THREE.Path();
  hole.moveTo(-.9,-.09);hole.lineTo(.42,-.09);hole.lineTo(.42,.48);
  hole.absellipse(-.24,.48,.66,.63,0,Math.PI,false,0);hole.lineTo(-.9,-.09);shape.holes.push(hole);
  const depth=cave?.48:1.3,source=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:18});
  source.translate(0,0,.65-depth);return weatherCliff(source);
}

/** Subdivide every long edge consistently on both incident faces before weathering.
 * Extruded caps otherwise contain metre-wide triangle fans: displacing only their
 * boundary vertices creates the stretched fabric creases seen around the arch.
 */
export function weatherCliff(source:THREE.BufferGeometry) {
  source.deleteAttribute('normal');source.deleteAttribute('uv');source.clearGroups();
  const welded=mergeVertices(source,1e-5),p=welded.getAttribute('position');
  const vertices=Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)]);
  let indices=Array.from(welded.index!.array);
  for(let pass=0;pass<9;pass++) {
    const edges=new Map<string,number>();
    const mid=(a:number,b:number)=>{
      const key=a<b?`${a}:${b}`:`${b}:${a}`;
      if(edges.has(key))return edges.get(key)!;
      const u=vertices[a],v=vertices[b];
      if((u[0]-v[0])**2+(u[1]-v[1])**2+(u[2]-v[2])**2<=.14**2)return -1;
      const index=vertices.length;vertices.push(u.map((n,j)=>(n+v[j])/2));edges.set(key,index);return index;
    };
    const next:number[]=[];
    for(let i=0;i<indices.length;i+=3) {
      const [a,b,c]=indices.slice(i,i+3),d=mid(a,b),e=mid(b,c),f=mid(c,a);
      if(d>=0&&e>=0&&f>=0)next.push(a,d,f,d,b,e,f,e,c,d,e,f);
      else if(d>=0&&e>=0)next.push(b,e,d,a,d,c,d,e,c);
      else if(d>=0&&f>=0)next.push(a,d,f,d,b,c,d,c,f);
      else if(e>=0&&f>=0)next.push(c,f,e,a,b,f,b,e,f);
      else if(d>=0)next.push(a,d,c,d,b,c);
      else if(e>=0)next.push(a,b,e,a,e,c);
      else if(f>=0)next.push(a,b,f,b,c,f);
      else next.push(a,b,c);
    }
    indices=next;if(!edges.size)break;
  }
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(v=>cliffPoint(v[0],v[1],v[2])),3));
  // The material projects in 3D. Dummy UVs satisfy Three's unused bump-map varying.
  result.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length*2),2));
  result.setIndex(indices);result.computeVertexNormals();result.computeBoundingSphere();
  welded.dispose();source.dispose();return result;
}
