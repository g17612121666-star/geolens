import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useLabControls} from '@/lib/store/lab-controls';

/** Waves are an illustrative optical surface, not a wave-energy simulation. */
export function CoastalWater({height,vertical=1,headland=false,stage=1}:{stage?:number;height:(x:number,z:number)=>number;vertical?:number;headland?:boolean}){
 const clock=useMemo(()=>({value:0}),[]);
 useFrame(()=>{clock.value=useLabControls.getState().t*Math.PI*8;});
 const geometry=useMemo(()=>{
  const g=new THREE.PlaneGeometry(7,5,192,144);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,depth=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i);
   if(headland){
    const outsideBox=(cx:number,cz:number,hx:number,hz:number)=>{const qx=Math.abs(x-cx)-hx,qz=Math.abs(z-cz)-hz;return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0);};
    const mainland=outsideBox(-2.23,-.83,1.04,1.82),pillar=outsideBox(.62,0,.28,stage<2?.68:.54);
    depth[i]=Math.min(mainland,pillar)*.45+.015;
   }else depth[i]=.02-height(x,z)*vertical;
   p.setY(i,.02);
  }
  g.setAttribute('coastDepth',new THREE.BufferAttribute(depth,1));return g;
 },[height,vertical,headland,stage]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const shader=useMemo(()=>(s:THREE.WebGLProgramParametersWithUniforms)=>{
  s.uniforms.coastClock=clock;
  s.vertexShader='attribute float coastDepth; varying float waterDepth; varying vec2 shorePoint; uniform float coastClock;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   shorePoint=position.xz;waterDepth=coastDepth;
   float a=position.z*9.+position.x*1.25+coastClock;
   float b=position.z*15.-position.x*2.1+coastClock*1.3;
   transformed.y+=(sin(a)*.018+sin(b)*.006)*smoothstep(0.,.2,max(coastDepth,0.));
  `);
  s.fragmentShader='varying float waterDepth; varying vec2 shorePoint; uniform float coastClock;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(waterDepth<0.)discard;
   float phase=shorePoint.y*9.+shorePoint.x*1.25+coastClock;
   float broken=sin(shorePoint.x*18.+sin(shorePoint.y*13.))*sin(shorePoint.y*25.-shorePoint.x*8.);
   float crest=smoothstep(.74,.98,sin(phase)+broken*.12);
   float breaker=crest*smoothstep(.025,.09,waterDepth)*(1.-smoothstep(.15,.35,waterDepth));
   float lace=(1.-smoothstep(.005,.07,waterDepth))*(.35+.3*sin(phase))*(.55+.45*broken);
   vec3 sea=mix(vec3(.085,.23,.20),vec3(.014,.065,.09),smoothstep(0.,.6,waterDepth));
   diffuseColor.rgb=mix(sea,vec3(.55,.67,.61),clamp(breaker*.7+lace,0.,.8));
   diffuseColor.a*=smoothstep(0.,.022,waterDepth)*mix(.58,.97,smoothstep(0.,.45,waterDepth));
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float ripple=sin(shorePoint.x*31.+shorePoint.y*17.+coastClock)*.025;
   normal=normalize(normal+normalize(dFdx(vViewPosition))*ripple+normalize(dFdy(vViewPosition))*cos(shorePoint.y*27.-coastClock)*.019);
  `);
 },[clock]);
 return <mesh geometry={geometry} receiveShadow><meshPhysicalMaterial color="white" roughness={.42} metalness={0} ior={1.333} specularIntensity={.08} envMapIntensity={.15} transparent opacity={.97} depthWrite={false} side={THREE.DoubleSide} onBeforeCompile={shader} customProgramCacheKey={()=>'coastal-water-v1'}/></mesh>;
}
