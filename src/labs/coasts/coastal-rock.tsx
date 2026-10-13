import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {weatherCliff} from './cliff-geometry';
import {PhotographicRockMaterial as CoastalRockMaterial} from '../shared/photographic-rock';
export {CoastalRockMaterial};

export function CoastalRock({points,depth=1.8,position=[0,0,0]}:{points:[number,number][];depth?:number;position?:[number,number,number]}){
 const signature=JSON.stringify(points);
 const geometry=useMemo(()=>{
  const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));
  const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false});g.translate(0,0,-depth/2);
  return weatherCliff(g);
 },[signature,depth]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} position={position} castShadow receiveShadow><CoastalRockMaterial/></mesh>;
}
