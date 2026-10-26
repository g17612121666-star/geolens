import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

/** CC0 photographed rock, projected in three directions without stretched cap UVs. */
export function PhotographicRockMaterial({
  attach,
  tint = "white",
  desaturate = 0,
  wet = true,
  sceneScale = 10,
  exposure = 1,
  strata = false,
  ...props
}: ThreeElements["meshStandardMaterial"] & {
  tint?: string;
  desaturate?: number;
  wet?: boolean;
  sceneScale?: number;
  exposure?: number;
  /** Horizontal sedimentary banding, for cut faces of layered terrain. */
  strata?: boolean;
}) {
  const originals = useTexture([
    "/textures/pbr/rock_face_diff.webp",
    "/textures/pbr/rock_face_disp.webp",
    "/textures/pbr/rock_face_rough.webp",
  ]);
  const [diffMap, dispMap, roughMap] = originals;
  const maps = useMemo(
    () =>
      [diffMap, dispMap, roughMap].map((source, i) => {
        const map = source.clone();
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = 8;
        map.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        return map;
      }),
    [diffMap, dispMap, roughMap],
  );
  useEffect(() => () => maps.forEach((map) => map.dispose()), [maps]);
  const shader = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.uniforms.rockDesaturate = { value: desaturate };
      s.uniforms.rockWet = { value: wet ? 1 : 0 };
      s.uniforms.rockScale = { value: sceneScale / 2.4 };
      s.uniforms.rockExposure = { value: exposure };
      s.uniforms.rockStrata = { value: strata ? 1 : 0 };
      s.uniforms.cliffAlbedo = { value: maps[0] };
      s.uniforms.cliffHeight = { value: maps[1] };
      s.uniforms.cliffRoughness = { value: maps[2] };
      s.vertexShader =
        "varying vec3 cliffPosition; varying vec3 cliffNormal;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
    cliffPosition=(modelMatrix*vec4(position,1.)).xyz;
    cliffNormal=normalize(mat3(modelMatrix)*normal);`,
        );
      s.fragmentShader =
        `varying vec3 cliffPosition; varying vec3 cliffNormal;
    uniform float rockDesaturate; uniform float rockWet; uniform float rockScale; uniform float rockExposure; uniform float rockStrata;
    uniform sampler2D cliffAlbedo; uniform sampler2D cliffHeight; uniform sampler2D cliffRoughness;
    vec2 rockOffset(vec2 cell){return fract(sin(vec2(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3))))*43758.5453)*7.;}
    vec4 rockPatch(sampler2D tex,vec2 uv){
      vec2 cell=floor(uv),blend=fract(uv);blend=blend*blend*(3.-2.*blend);
      vec2 dx=dFdx(uv),dy=dFdy(uv);
      // Randomized phase, with shared derivatives, prevents visible tile grids
      // and mip seams. The same projection is used for color, height and roughness.
      return mix(mix(textureGrad(tex,uv+rockOffset(cell),dx,dy),textureGrad(tex,uv+rockOffset(cell+vec2(1.,0.)),dx,dy),blend.x),
        mix(textureGrad(tex,uv+rockOffset(cell+vec2(0.,1.)),dx,dy),textureGrad(tex,uv+rockOffset(cell+vec2(1.,1.)),dx,dy),blend.x),blend.y);
    }
    vec4 cliffSample(sampler2D tex,vec3 p,vec3 weights){
      return rockPatch(tex,p.zy)*weights.x+rockPatch(tex,p.xz)*weights.y+rockPatch(tex,p.xy)*weights.z;
    }
    ` + s.fragmentShader;
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    vec3 cliffWeights=pow(abs(normalize(cliffNormal)),vec3(6.));
    cliffWeights/=max(dot(cliffWeights,vec3(1.)),.001);
    // The source photograph spans 2.4 m; one headland scene unit is 10 m.
    vec3 cliffUv=cliffPosition*rockScale;
    vec3 rock=cliffSample(cliffAlbedo,cliffUv,cliffWeights).rgb;
    rock=mix(rock,vec3(dot(rock,vec3(.2126,.7152,.0722))),rockDesaturate);
    float wet=(1.-smoothstep(.015,.24,cliffPosition.y))*rockWet;
    diffuseColor.rgb*=rock*rockExposure*mix(1.,.56,wet);
    if(rockStrata>.5){
      // Gently undulating beds of alternating tone with thin dark partings.
      float bed=cliffPosition.y*7.+.22*sin(cliffPosition.x*1.3+cliffPosition.z*.9);
      float f=fract(bed),k=floor(bed);
      float tone=.86+.22*fract(sin(k*91.7)*437.1);
      float parting=1.-.3*(1.-smoothstep(0.,.05,f));
      diffuseColor.rgb*=tone*parting*mix(vec3(1.),vec3(1.06,1.,.92),step(.5,fract(sin(k*12.9)*78.2)));
    }
  `,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
    roughnessFactor=clamp(cliffSample(cliffRoughness,cliffUv,cliffWeights).r,.68,1.);
  `,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `
    float rockHeight=cliffSample(cliffHeight,cliffUv,cliffWeights).r;
    normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(rockHeight),dFdy(rockHeight))*.055,faceDirection);
  `,
      );
    },
    [maps, desaturate, wet, sceneScale, exposure, strata],
  );
  return (
    <meshStandardMaterial
      attach={attach}
      color={tint}
      bumpMap={maps[1]}
      roughness={0.93}
      envMapIntensity={0.18}
      {...props}
      onBeforeCompile={shader}
      customProgramCacheKey={() => `coastal-photographed-rock-v5-${strata ? "strata" : "plain"}`}
    />
  );
}
