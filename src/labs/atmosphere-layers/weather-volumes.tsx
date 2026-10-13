import {useEffect,useLayoutEffect,useMemo} from 'react';
import * as THREE from 'three';
import {cloudVertex,cloudFragment} from '../shared/cloud-material';

const random=(n:number)=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);};
/** Constructed condensed-water cloud volume, not observation-derived cloud data. */
export function CloudVolume({position=[0,0,0],scale=[1,1,1],seed=1,density=64,opacity=.62}:{position?:[number,number,number];scale?:[number,number,number];seed?:number;density?:number;opacity?:number}){
 const uniforms=useMemo(()=>({seed:{value:seed},opacity:{value:opacity}}),[seed,opacity]);
 // Integrate density through a bounded volume: cloud droplets scatter light,
 // with a flatter condensation base and brighter sun-facing billows.
 return <group position={position} scale={scale}><mesh>
  <boxGeometry args={[2,1.4,1.5]}/><shaderMaterial vertexShader={cloudVertex} fragmentShader={cloudFragment} uniforms={uniforms} transparent depthWrite={false} side={THREE.BackSide}/>
 </mesh></group>;
}

/** Deterministic rainfall streaks: a paused or scrubbed lesson always reproduces the same positions. */
export function RainStreaks({t,position=[0,0,0],width=1,depth=.8,height=.8,count=90,wind=.08}:{t:number;position?:[number,number,number];width?:number;depth?:number;height?:number;count?:number;wind?:number}){
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6),3));return g;},[count]);
 useLayoutEffect(()=>{const p=geometry.attributes.position;for(let i=0;i<count;i++){const phase=(t*11+random(i+1))%1,x=(random(i+35)-.5)*width+wind*phase,z=(random(i+87)-.5)*depth,y=-phase*height;p.setXYZ(i*2,x,y,z);p.setXYZ(i*2+1,x+wind*.075,Math.max(-height,y-Math.min(.055,height*.12)),z);}p.needsUpdate=true;geometry.computeBoundingSphere();},[geometry,t,width,depth,height,count,wind]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <lineSegments geometry={geometry} position={position}><lineBasicMaterial color="#afdbea" transparent opacity={.45} depthWrite={false}/></lineSegments>;
}

/** Short luminous filaments display illustrative air/water transport without solid arrow shafts. */
export function FlowFilaments({paths,t,color='#aed5d9',speed=1}:{paths:[number,number,number][][];t:number;color?:string;speed?:number}){
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(paths.length*8*6),3));return g;},[paths.length]);
 useLayoutEffect(()=>{const p=geometry.attributes.position;let offset=0;for(let j=0;j<paths.length;j++){const path=paths[j];for(let k=0;k<8;k++){const u=((t*speed+j*.137+k/8)%1)*(path.length-1),a=Math.floor(u),b=Math.min(path.length-1,a+1),v=u-a,tail=Math.max(0,u-.65),c=Math.floor(tail),d=Math.min(path.length-1,c+1),w=tail-c;for(const point of [path[a].map((n,i)=>n+(path[b][i]-n)*v),path[c].map((n,i)=>n+(path[d][i]-n)*w)])p.setXYZ(offset++,point[0],point[1],point[2]);}}p.needsUpdate=true;geometry.computeBoundingSphere();},[geometry,paths,t,speed]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <lineSegments geometry={geometry}><lineBasicMaterial color={color} transparent opacity={.75} depthWrite={false}/></lineSegments>;
}
