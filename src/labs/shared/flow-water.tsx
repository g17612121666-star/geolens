import {useMemo,useRef} from 'react';
import {useFrame,type ThreeElements} from '@react-three/fiber';
import * as THREE from 'three';
import {useLabControls} from '@/lib/store/lab-controls';

/** Optical ripples use the same reversible lesson clock as the water transport model.
 * They do not displace vertices or claim to represent a measured wave height/speed. */
export function FlowWaterMaterial({flow=[1,0],speed=1,color='#4a8b9b',opacity=.84,roughness=.34,...props}:ThreeElements['meshPhysicalMaterial']&{flow?:[number,number];speed?:number}){
 const ref=useRef<THREE.MeshPhysicalMaterial>(null),clock=useMemo(()=>({value:0}),[]),direction=useMemo(()=>({value:new THREE.Vector2()}),[]);
 direction.value.set(...flow);
 useFrame(()=>{clock.value=useLabControls.getState().t*24*speed;});
 const shader=useMemo(()=>(s:THREE.WebGLProgramParametersWithUniforms)=>{
  s.uniforms.flowPhase=clock;s.uniforms.flowDirection=direction;
  s.vertexShader='varying vec2 waterUv;\n'+s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nwaterUv = uv;');
  s.fragmentShader='varying vec2 waterUv; uniform float flowPhase; uniform vec2 flowDirection;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 colourQ=waterUv*8.-flowDirection*flowPhase*.025;
    float waterTone=.64+.08*sin(colourQ.x+sin(colourQ.y*1.7))+.035*sin(colourQ.y*3.1+colourQ.x*.7);
    diffuseColor.rgb*=waterTone;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>' ,`#include <normal_fragment_maps>
    vec2 q = waterUv * 16.0 - flowDirection * flowPhase;
    float rippleA = cos(q.x * 2.7 + sin(q.y * 1.8)) * .035;
    float rippleB = sin(q.y * 3.3 + q.x * .6) * .025;
    vec3 tangent = normalize(dFdx(vViewPosition));
    vec3 bitangent = normalize(dFdy(vViewPosition));
    normal = normalize(normal + tangent * rippleA + bitangent * rippleB);
  `);
 },[clock,direction]);
 return <meshPhysicalMaterial ref={ref} color={color} emissive={color} emissiveIntensity={.06} roughness={roughness} metalness={0} ior={1.333} specularIntensity={.08} clearcoat={0} envMapIntensity={.35} transparent={opacity<1} opacity={opacity} depthWrite={opacity>=1} side={THREE.DoubleSide} onBeforeCompile={shader} customProgramCacheKey={()=>'terralens-flow-v2'} {...props}/>;
}
