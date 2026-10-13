import {useEffect,useMemo,useLayoutEffect,useRef} from 'react';
import * as THREE from 'three';
import {waterRibbonGeometry} from './river-terrain';
import {terrainBlockGeometry} from './science-geometry';
import {RockMaterial} from './rock-material';
import {TerrainMaterial} from './natural-world';
import {FlowWaterMaterial} from './flow-water';
import {AlpineMaterial} from './alpine-material';
/** Closed terrain, with independent rock sides and an explicitly supplied surface colour. */
export function GeomorphicTerrain({height,colour,width=6,depth=4,base=-.3,resolution=128,material='grass'}:{height:(x:number,z:number)=>number;colour:(x:number,y:number,z:number)=>string;width?:number;depth?:number;base?:number;resolution?:number;material?:'grass'|'rock'|'sand'|'beach'|'soil'|'snow'|'alpine'}){
 const geometry=useMemo(()=>{const g=terrainBlockGeometry(height,width,depth,resolution,base),p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const col=new THREE.Color(colour(p.getX(i),p.getY(i),p.getZ(i)));col.multiplyScalar(.94+.06*Math.sin(p.getX(i)*31+p.getZ(i)*19)**2);c.set([col.r,col.g,col.b],i*3);}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;},[height,colour,width,depth,base,resolution]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} castShadow receiveShadow>{material==='alpine'?<AlpineMaterial attach="material-0"/>:<TerrainMaterial attach="material-0" kind={material} color="#ffffff" vertexColors roughness={.95}/>}<RockMaterial attach="material-1" color={material==='alpine'?'#b6b4ad':'#aa9276'} roughness={.96}/></mesh>;
}
/** Sampled, UV-mapped channel surface. Arc-length UVs keep flow coherent through bends and waterfalls. */
export function WaterRibbon({path,width=.12,color='#6caeba',opacity=.8,frozen=false}:{path:[number,number,number][];width?:number;color?:string;opacity?:number;frozen?:boolean}){
 const pathKey=path.map(p=>p.join(',')).join(';');
 const geometry=useMemo(()=>waterRibbonGeometry(path,width),[pathKey,width]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} receiveShadow>{frozen?<meshPhysicalMaterial color={color} roughness={.39} clearcoat={.15} side={THREE.DoubleSide}/>:<FlowWaterMaterial color={color} opacity={opacity} flow={[1,0]} speed={.8}/>}</mesh>;
}
/** Repeated exposed clasts use one draw call; these are geometric material details, never quantitative grains. */
export function DebrisField({points,size=.04,color='#9f947e'}:{points:[number,number,number][];size?:number;color?:string}){
 const pointsKey=points.map(p=>p.join(',')).join(';');
 const mesh=useRef<THREE.InstancedMesh>(null);useLayoutEffect(()=>{if(!mesh.current)return;const dummy=new THREE.Object3D();points.forEach((p,i)=>{dummy.position.set(...p);dummy.rotation.set(i*.81,i*2.399,i*.31);const r=size*(.55+.45*Math.sin(i*19)**2);dummy.scale.set(r*1.4,r*.72,r);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);});mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();},[pointsKey,size]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,points.length]} castShadow receiveShadow><icosahedronGeometry args={[1,1]}/><TerrainMaterial kind="rock" color={color} roughness={.98}/></instancedMesh>;
}
/** Bladed grasses are a single geometry, rooted on the supplied surface. */
export function GrassPatch({positions,height=.14,color='#6b8151'}:{positions:[number,number,number][];height?:number;color?:string}){
 const positionsKey=positions.map(p=>p.join(',')).join(';');
 const geometry=useMemo(()=>{const p:number[]=[],uv:number[]=[],idx:number[]=[];positions.forEach(([x,y,z],i)=>{for(let b=0;b<5;b++){const a=i*2.399+b*1.257,h=height*(.55+.45*Math.sin(i*9+b*3)**2),w=h*.09,dx=Math.cos(a),dz=Math.sin(a),k=p.length/3;p.push(x-w*dx,y,z-w*dz,x+w*dx,y,z+w*dz,x+h*.18*dz-w*.5*dx,y+h*.65,z+h*.18*dx-w*.5*dz,x+h*.18*dz+w*.5*dx,y+h*.65,z+h*.18*dx+w*.5*dz,x+h*.32*dz,y+h,z+h*.32*dx);uv.push(0,0,1,0,0,.65,1,.65,.5,1);idx.push(k,k+1,k+2,k+1,k+3,k+2,k+2,k+3,k+4);}});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;},[positionsKey,height]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.95} side={THREE.DoubleSide}/></mesh>;
}
/** A branching root cut-face, with radius tapering towards the tips. */
export function RootNetwork({x=0,y=0,z=0,depth=.5,spread=.2,seed=0}:{x?:number;y?:number;z?:number;depth?:number;spread?:number;seed?:number}){
 const geometry=useMemo(()=>{const p:number[]=[],uv:number[]=[],idx:number[]=[];
 const branch=(start:THREE.Vector3,end:THREE.Vector3,r:number)=>{const curve=new THREE.CatmullRomCurve3([start,start.clone().lerp(end,.45).add(new THREE.Vector3(spread*.12*Math.sin(seed+end.x*8),0,.012)),end]);const g=new THREE.TubeGeometry(curve,12,r,5,false),pos=g.attributes.position,tex=g.attributes.uv,base=p.length/3;p.push(...Array.from(pos.array));uv.push(...Array.from(tex.array));idx.push(...Array.from(g.index!.array).map(v=>v+base));g.dispose();};
 for(let i=0;i<7;i++){const end=new THREE.Vector3(x+spread*Math.sin(i*2.399+seed),y-depth*(.35+.65*(i+1)/7),z+.02*Math.cos(i*3));branch(new THREE.Vector3(x,y,z),end,.006*(1-i*.07));for(const side of [-1,1])branch(end.clone().lerp(new THREE.Vector3(x,y,z),.4),end.clone().add(new THREE.Vector3(side*spread*.3,-depth*.15,.018)),.0025);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;},[x,y,z,depth,spread,seed]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry}><meshStandardMaterial color="#a68a5f" roughness={1}/></mesh>;
}

/** Enlarged pore markers are instanced to keep cutaways usable on classroom phones. */
export function PoreMarkers({positions,colours,radius=.024}:{positions:[number,number,number][];colours:string[];radius?:number}){
 const mesh=useRef<THREE.InstancedMesh>(null),key=positions.map(p=>p.join(',')).join(';')+colours.join(',');
 useLayoutEffect(()=>{if(!mesh.current)return;const dummy=new THREE.Object3D(),colour=new THREE.Color();positions.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.setScalar(radius);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);mesh.current!.setColorAt(i,colour.set(colours[i]??'#80c8d6'));});mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;mesh.current.computeBoundingSphere();},[key,radius]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,positions.length]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial/></instancedMesh>;
}
