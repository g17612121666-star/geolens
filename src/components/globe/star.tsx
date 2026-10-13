import { useMemo } from 'react';
import * as THREE from 'three';

/** Emissive stellar surface, with illustrative granulation and limb darkening.
 * Procedural material, not an observation or a resolved map of any star. */
export function StarMesh({radius=.28,colour='#fff0d7'}:{radius?:number;colour?:string}) {
 const uniforms=useMemo(()=>({surfaceColour:{value:new THREE.Color(colour)}}),[colour]);
 return <mesh><sphereGeometry args={[radius,96,64]}/><shaderMaterial uniforms={uniforms}
  vertexShader={`varying vec3 n; varying vec3 p; varying vec3 local;
   void main(){local=position; p=(modelMatrix*vec4(position,1.)).xyz; n=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`}
  fragmentShader={`uniform vec3 surfaceColour; varying vec3 n; varying vec3 p; varying vec3 local;
   void main(){vec3 v=normalize(cameraPosition-p); float mu=max(0.,dot(normalize(n),v));
    vec3 q=normalize(local); float granules=sin(q.x*193.+sin(q.y*91.))*sin(q.y*217.+sin(q.z*127.))*sin(q.z*171.);
    float limb=.42+.58*mu; gl_FragColor=vec4(surfaceColour*limb*(1.+.065*granules),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`}/></mesh>;
}
