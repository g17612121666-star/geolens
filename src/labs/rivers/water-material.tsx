import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";

/** Depth-tinted, semi-transparent river water. Optical detail follows the lesson clock;
 * neither the ripples nor their speed are a solved hydraulic simulation. */
export function RiverWaterMaterial() {
  const phase = useMemo(() => ({ value: 0 }), []);
  useFrame(() => {
    phase.value = useLabControls.getState().t * 18;
  });
  const compile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.riverPhase = phase;
      shader.vertexShader =
        "attribute float waterDepth; varying float riverDepth; varying vec2 riverUv;\n" +
        shader.vertexShader.replace(
          "#include <uv_vertex>",
          "#include <uv_vertex>\nriverUv=uv; riverDepth=waterDepth;",
        );
      shader.fragmentShader =
        "varying float riverDepth; varying vec2 riverUv; uniform float riverPhase;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
    float opticalDepth=1.0-exp(-riverDepth*20.0);
    diffuseColor.rgb *= mix(vec3(.95,1.0,.78),vec3(.30,.53,.47),opticalDepth);
    diffuseColor.a *= mix(.10,.96,opticalDepth);
  `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
    vec2 q=vec2(riverUv.x*8.0-riverPhase,riverUv.y*32.0);
    float a=sin(q.x*2.1+sin(q.y*.73)*1.5);
    float b=sin(q.x*3.7-q.y*1.6+sin(q.x*.61));
    vec3 dp1=dFdx(-vViewPosition),dp2=dFdy(-vViewPosition);
    vec2 duv1=dFdx(riverUv),duv2=dFdy(riverUv);
    vec3 T=normalize(dp1*duv2.y-dp2*duv1.y);
    vec3 B=normalize(-dp1*duv2.x+dp2*duv1.x);
    normal=normalize(normal+T*(a*.026+b*.013)+B*(b*.035));
  `,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
    roughnessFactor += .04*(.5+.5*sin(riverUv.x*31.0-riverPhase*2.0+sin(riverUv.y*23.0)));
  `,
        );
    },
    [phase],
  );
  return (
    <meshPhysicalMaterial
      color="#518a80"
      metalness={0}
      roughness={0.34}
      ior={1.333}
      specularIntensity={0.08}
      clearcoat={0}
      envMapIntensity={0.2}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      onBeforeCompile={compile}
      customProgramCacheKey={() => "terralens-river-depth-v5"}
    />
  );
}
