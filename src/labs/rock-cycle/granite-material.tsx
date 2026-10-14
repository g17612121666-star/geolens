import { useMemo } from "react";
import * as THREE from "three";
import { useRockNormal } from "../shared/materials";

/** Interlocking mineral grains, a material illustration rather than a sampled specimen. */
export function GraniteMaterial() {
  const normal = useRockNormal();
  const shader = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.vertexShader =
        "varying vec3 grainPosition;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ngrainPosition=position;",
        );
      s.fragmentShader =
        `varying vec3 grainPosition;
   vec3 mineralHash(vec3 p){return fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453);}
  ` + s.fragmentShader;
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
   vec3 gp=grainPosition*52., cell=floor(gp), fraction=fract(gp), mineral=vec3(0.);
   float nearest=10.,second=10.;
   for(int gx=-1;gx<=1;gx++)for(int gy=-1;gy<=1;gy++)for(int gz=-1;gz<=1;gz++){
    vec3 neighbour=vec3(float(gx),float(gy),float(gz)), seed=mineralHash(cell+neighbour);
    float distanceToGrain=length(neighbour+seed-fraction);
    if(distanceToGrain<nearest){second=nearest;nearest=distanceToGrain;mineral=seed;}else second=min(second,distanceToGrain);
   }
   vec3 gc=mineral.x<.15?vec3(.13,.16,.16):mineral.x<.49?vec3(.60,.64,.63):mineral.x<.76?vec3(.85,.76,.67):vec3(.87,.87,.80);
   float edge=smoothstep(0.,.06,second-nearest);
   diffuseColor.rgb*=gc*(.82+.18*edge)*(.91+.15*mineral.y);
  `,
      );
    },
    [],
  );
  return (
    <meshStandardMaterial
      color="#ffffff"
      normalMap={normal}
      normalScale={new THREE.Vector2(0.2, 0.2)}
      roughness={0.78}
      onBeforeCompile={shader}
      customProgramCacheKey={() => "interlocking-granitic-grains-v1"}
    />
  );
}
