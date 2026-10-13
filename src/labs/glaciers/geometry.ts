import * as THREE from 'three';
import {landscapeNoise as noise} from '../shared/landscape-noise.ts';
export {landscapeNoise as glacialNoise} from '../shared/landscape-noise.ts';
export const glacierFloor=(x:number)=>.18+.8*((3-x)/6)**2;
export const glacierBed=(x:number,z:number)=>{
 const walls=1-Math.exp(-((z/1.12)**4));
 // Asymmetric rock shoulders retain a U-shaped trough and its down-valley floor gradient.
 const relief=.96+.3*noise(x*1.3,z*.8)+.19*noise(x*3.7,z*2.9)+.1*noise(x*9.1,z*8.3);
 const gullies=.13*Math.abs(2*noise(x*6.7+noise(z,x)*2,z*2.1)-1);
 return glacierFloor(x)+walls*(relief-gullies)+.18*Math.exp(-((x+2.8)**2)/.13);
};
export function icePosition(s:number,q:number,length:number):[number,number,number]{
 const u=Math.max(0,Math.min(1,s)),cross=Math.max(-1,Math.min(1,q)),x=-2.7+u*length,w=(.72+.15*Math.sin(u*Math.PI))*Math.sqrt(1-u),z=cross*w;
 const thickness=.28*Math.max(0,Math.sin(Math.PI*u))**.45*Math.sqrt(Math.max(0,1-cross*cross));
 const crevasse=[.25,.42,.58].reduce((sum,c)=>sum+Math.exp(-(((u-c-.006*Math.sin(cross*12+c*8))/.008)**2)),0)*.075*Math.max(0,1-cross*cross);
 return[x,glacierBed(x,z)+Math.max(thickness*.3,thickness-crevasse),z];
}
export function glacierIceGeometry(length:number){
 const p:number[]=[],uv:number[]=[],indices:number[]=[],nx=160,nz=48,stride=nz+1,layer=(nx+1)*stride;
 for(const upper of [true,false])for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const a=icePosition(i/nx,j/nz*2-1,length);p.push(a[0],upper?a[1]:glacierBed(a[0],a[2]),a[2]);uv.push(i/nx*3,j/nz);}
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=i*stride+j;indices.push(a,a+1,a+stride,a+1,a+stride+1,a+stride);const b=a+layer;indices.push(b,b+stride,b+1,b+1,b+stride,b+stride+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

