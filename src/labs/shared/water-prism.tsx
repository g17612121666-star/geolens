import {useMemo,useEffect} from 'react';
import * as THREE from 'three';
/** Closed scientific water volume; colours encode a stated variable. */
export function WaterPrism({points,depth=1.6,colour,colour2,opacity=.68}:{points:[number,number][];depth?:number;colour:string;colour2?:string;opacity?:number}){
  const signature=JSON.stringify(points);
  const geometry=useMemo(()=>{const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);
    if(colour2){const p=g.attributes.position,c=new Float32Array(p.count*3),left=Math.min(...points.map(p=>p[0])),width=Math.max(...points.map(p=>p[0]))-left,a=new THREE.Color(colour),b=new THREE.Color(colour2);for(let i=0;i<p.count;i++){const v=a.clone().lerp(b,(p.getX(i)-left)/width);c.set([v.r,v.g,v.b],i*3);}g.setAttribute('color',new THREE.BufferAttribute(c,3));}return g;
  },[signature,depth,colour,colour2]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshPhysicalMaterial color={colour2?'#ffffff':colour} vertexColors={!!colour2} transparent={opacity<1} opacity={opacity} roughness={.24} metalness={0} ior={1.333} clearcoat={.5} clearcoatRoughness={.2} envMapIntensity={.35} depthWrite={opacity===1}/></mesh>;
}
