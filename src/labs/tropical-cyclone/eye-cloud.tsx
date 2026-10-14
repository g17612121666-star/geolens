import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cloudFragment, cloudVertex } from "../shared/cloud-material";
import { tropicalVortex } from "@/lib/tropical-cyclone-science";

const fragment = cloudFragment
  .replace(
    "uniform float seed; uniform float opacity;",
    "uniform float seed; uniform float opacity; uniform float opening; uniform float phase;",
  )
  .replace("vec3 bounds=vec3(1.,.7,.75)", "vec3 bounds=vec3(1.4,.65,1.4)")
  .replace(
    /float densityAt\(vec3 p\)\{[\s\S]*?\n \}/,
    `float densityAt(vec3 p){
   float angle=atan(p.z,p.x),height=p.y+.65;
   if(abs(atan(sin(angle-1.5707963),cos(angle-1.5707963)))<opening*1.507964)return 0.;
   float radius=length(p.xz),centre=.64+.13*height;
   float body=1.-length(vec2((radius-centre)/.25,(height-.63)/.63));
   vec3 advected=vec3(cos(angle-phase)*radius,p.y,sin(angle-phase)*radius);
   float texture=cloudNoise(advected*11.+vec3(seed));
   return smoothstep(.0,.35,body+(texture-.52)*.65)*smoothstep(.07,.2,height);
 }`,
  );
/** A three-dimensional, lit ring of cloud density; no opaque curtain or hollow mesh shell. */
export function EyeCloud({
  slice,
  spin,
  t,
  maximum,
}: {
  slice: number;
  spin: number;
  t: number;
  maximum: number;
}) {
  const uniforms = useMemo(
    () => ({
      seed: { value: 17 },
      opacity: { value: 0.6 },
      opening: { value: 0 },
      phase: { value: 0 },
    }),
    [],
  );
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(() => {
    if (!material.current) return;
    material.current.uniforms.opening.value = slice;
    material.current.uniforms.phase.value =
      (spin * t * 7200 * tropicalVortex(35000, maximum).wind) / 35000;
  });
  // Keep the ray exit box above the opaque sea, otherwise its back faces fail
  // the depth test and erase the front half of the cloud even with no slice.
  return (
    <mesh position={[0, 0.65, 0]}>
      <boxGeometry args={[2.8, 1.3, 2.8]} />
      <shaderMaterial
        ref={material}
        vertexShader={cloudVertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
