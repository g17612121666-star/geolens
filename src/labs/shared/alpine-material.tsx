import {useMemo,useEffect} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';

/** Photographic rock outcrops and vegetated valley benches, not a soil texture on cliffs. */
export function AlpineMaterial({attach}:{attach?:string}){
 const originals=useTexture(['/textures/pbr/rock_face_diff.webp','/textures/pbr/rock_face_disp.webp','/textures/pbr/forest_ground_04_diff.webp']);
 const maps=useMemo(()=>originals.map((source,i)=>{const t=source.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=i===1?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=8;return t;}),[...originals]);
 useEffect(()=>()=>maps.forEach(t=>t.dispose()),[maps]);
 const shader=useMemo(()=>(s:THREE.WebGLProgramParametersWithUniforms)=>{
  s.uniforms.alpineRock={value:maps[0]};s.uniforms.alpineHeight={value:maps[1]};s.uniforms.alpineSoil={value:maps[2]};
  s.vertexShader='varying vec3 alpineP; varying vec3 alpineN;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nalpineP=position; alpineN=normal;');
  s.fragmentShader=`varying vec3 alpineP; varying vec3 alpineN; uniform sampler2D alpineRock; uniform sampler2D alpineHeight; uniform sampler2D alpineSoil;
   vec4 alpineSample(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.zy)*w.x+texture2D(tex,p.xz)*w.y+texture2D(tex,p.xy)*w.z;}
   `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 aw=pow(abs(normalize(alpineN)),vec3(5.));aw/=max(dot(aw,vec3(1.)),.001);
   vec3 ar=alpineSample(alpineRock,alpineP*2.8,aw).rgb;
   ar=mix(ar,vec3(dot(ar,vec3(.2126,.7152,.0722))),.76)*1.35;
   vec3 ag=texture2D(alpineSoil,alpineP.xz*3.2).rgb*vec3(.56,.79,.48);
   float plants=smoothstep(.48,.92,abs(alpineN.y))*(1.-smoothstep(.75,1.7,alpineP.y));
   diffuseColor.rgb*=mix(ar,ag,plants);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`float ah=alpineSample(alpineHeight,alpineP*2.8,aw).r;normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(ah),dFdy(ah))*.032,faceDirection);`);
 },[maps]);
 return <meshStandardMaterial attach={attach} color="#d3d7d4" bumpMap={maps[1]} roughness={.96} onBeforeCompile={shader} customProgramCacheKey={()=>'alpine-rock-vegetation-v1'}/>;
}

/** Opaque bubbly ice with subdued flow-parallel debris; cracks are actual surface geometry. */
export function GlacierMaterial(){
 const shader=useMemo(()=>(s:THREE.WebGLProgramParametersWithUniforms)=>{
  s.vertexShader='varying vec3 iceP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\niceP=position;');
  s.fragmentShader='varying vec3 iceP;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float fine=sin(iceP.z*280.+sin(iceP.x*3.5)*1.8)*sin(iceP.z*139.+iceP.x*2.);
    float bands=.5+.5*sin(iceP.z*31.+sin(iceP.x*1.7)*.75);
    diffuseColor.rgb*=mix(vec3(.79,.89,.92),vec3(.99,1.,1.),bands*.6+fine*.09);
  `);
 },[]);
 return <meshPhysicalMaterial color="#d7e6e7" roughness={.46} clearcoat={.12} clearcoatRoughness={.5} onBeforeCompile={shader} customProgramCacheKey={()=>'glacial-bubbly-ice-v1'}/>;
}
