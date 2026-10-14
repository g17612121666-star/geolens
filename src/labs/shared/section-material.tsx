import { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

/** Noise helpers available to every section shader. */
const HELPERS = `
float sHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(sHash(i),sHash(i+vec2(1.,0.)),f.x),mix(sHash(i+vec2(0.,1.)),sHash(i+vec2(1.,1.)),f.x),f.y);}
float sFbm(vec2 p){return .5*sNoise(p)+.3*sNoise(p*2.07+3.1)+.2*sNoise(p*4.13-1.7);}
float sq(float x){return x*x;}
/** Rock grain: speckle plus coarser mottling, about 0–1. */
float grain(vec2 p){return .6*sNoise(p*70.)+.4*sNoise(p*15.);}
`;

/**
 * A lit material whose colour is computed per fragment from position, for geological cut faces.
 * `glsl` must define `vec3 sectionColour(vec3 p, vec3 w)` and `vec3 sectionGlow(vec3 p, vec3 w)`,
 * where p is the object-space and w the world-space position. Declare any uniforms in `glsl`.
 * Colours are written as sRGB values (like CSS hex) and converted to linear here.
 * Return a negative red channel from sectionColour to discard the fragment.
 */
export function SectionMaterial({
  glsl,
  uniforms = {},
  cacheKey,
  ...props
}: ThreeElements["meshStandardMaterial"] & {
  glsl: string;
  uniforms?: Record<string, { value: unknown }>;
  cacheKey: string;
}) {
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "varying vec3 sectionLocal; varying vec3 sectionWorld;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
sectionLocal=transformed;
sectionWorld=(modelMatrix*vec4(transformed,1.)).xyz;`,
        );
      s.fragmentShader =
        "varying vec3 sectionLocal; varying vec3 sectionWorld;\n" +
        HELPERS +
        glsl +
        "\n" +
        s.fragmentShader
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
vec3 sectionC=sectionColour(sectionLocal,sectionWorld);
if(sectionC.r<0.)discard;
diffuseColor.rgb*=pow(sectionC,vec3(2.2));`,
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
totalEmissiveRadiance+=sectionGlow(sectionLocal,sectionWorld);`,
          );
    },
    // Uniform objects are mutated in place by callers; the program only depends on the GLSL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [glsl],
  );
  return (
    <meshStandardMaterial
      color="white"
      roughness={0.93}
      {...props}
      onBeforeCompile={compile}
      customProgramCacheKey={() => `section-${cacheKey}`}
    />
  );
}

/** Keeps a stable uniforms object whose values are refreshed on every render. */
export function useSectionUniforms(values: Record<string, unknown>) {
  const uniforms = useMemo(
    () => Object.fromEntries(Object.keys(values).map((k) => [k, { value: values[k] }])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  ) as Record<string, { value: unknown }>;
  for (const k of Object.keys(values)) uniforms[k].value = values[k];
  return uniforms;
}
