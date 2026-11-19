import { useMemo } from "react";
import * as THREE from "three";

/** GLSL value noise for the ice surface. */
const ICE_NOISE = `
float iHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float iNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(iHash(i),iHash(i+vec2(1.,0.)),f.x),mix(iHash(i+vec2(0.,1.)),iHash(i+vec2(1.,1.)),f.x),f.y);}
float iFbm(vec2 p){return .55*iNoise(p)+.3*iNoise(p*2.1+3.7)+.15*iNoise(p*4.3-1.3);}
`;

/**
 * Glacier surface for a draped ice sheet whose vertices carry `iceDepth` (≤ 0 off the ice, where
 * it is discarded), `along` (0 at the head, 1 at the snout) and `edge` (distance from the nearer
 * margin, km). Snow and firn lie above the equilibrium line and bare ice below it, with layering
 * bowed down-glacier, crevasses where the ice is stretched, debris along the edges and a dirty
 * snout.
 *
 * The valley glacier adds its icefall, the ogives below it and the medial moraine where its two
 * cirque glaciers meet; a cirque glacier adds the bergschrund, the crevasse where the moving ice
 * pulls away from the headwall.
 */
export function IceMaterial({ ela, kind }: { ela: number; kind: "valley" | "cirque" }) {
  const uniforms = useMemo(() => ({ uEla: { value: ela } }), [ela]);
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "attribute float iceDepth; attribute float along; attribute float edge; varying float vDepth; varying float vAlong; varying float vEdge; varying vec3 vIce;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n  vDepth = iceDepth; vAlong = along; vEdge = edge; vIce = position;",
        );
      s.fragmentShader =
        `#define ${kind === "valley" ? "VALLEY" : "CIRQUE"} 1\nuniform float uEla; varying float vDepth; varying float vAlong; varying float vEdge; varying vec3 vIce;\n${ICE_NOISE}\n` +
        s.fragmentShader
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
  if (vDepth < .002) discard;
  vec2 p = vIce.xz;
  float n = iFbm(p * 3.), fine = iFbm(p * 16.);
  // Snow and firn survive the summer above the equilibrium line.
  float line = uEla + .05 * (n - .5);
  float snow = 1. - smoothstep(line - .012, line + .012, vAlong);
  float stretched = 0., ogives = 0., medial = 0., bow = 0.;
#ifdef VALLEY
  // Layering is bowed down-glacier, because the middle flows fastest.
  bow = .2 * (1. - min(1., pow(abs(p.y) / .7, 2.)));
  // Ogives: dark and light arcs formed each year below the icefall.
  ogives = smoothstep(-1.2, -1., p.x) * (1. - smoothstep(-.3, .4, p.x));
  // Crevasses across the icefall, where the ice is stretched over the rock step.
  stretched = smoothstep(-2., -1.85, p.x) * (1. - smoothstep(-1.3, -1.12, p.x));
  // The medial moraine starts at the ridge where the two cirque glaciers meet.
  medial = exp(-pow(p.y / (.04 + .04 * vAlong), 2.)) * smoothstep(-1.98, -1.85, p.x);
  float across = p.x + .15 * p.y * p.y;
#else
  // Crevasses where the ice spills over the cirque's rock lip.
  stretched = smoothstep(.62, .7, vAlong) * (1. - smoothstep(.8, .88, vAlong));
  float across = vAlong * 3.;
  // The bergschrund: one crevasse just below the headwall, where the moving ice pulls away from
  // the ice frozen to the rock.
  float berg = 1. - smoothstep(.006, .014, abs(vAlong - .08 - .015 * (n - .5)));
#endif
  float band = .5 + .5 * sin((p.x - bow) * 28. + 2.5 * n);
  vec3 ice = mix(vec3(.075, .105, .13), vec3(.15, .185, .21), band * .55 + .45 * fine);
  ice *= 1. - .22 * ogives * smoothstep(.5, .95, .5 + .5 * sin((p.x - 1.5 * bow) * 14.));
  // Crevasses where the ice is stretched, and angled up-glacier near the edges, where the sides
  // drag on the valley walls.
  float cross = 1. - smoothstep(0., .1, fract(across * 22. + .5 * n));
  float margin = smoothstep(.015, .035, vDepth) * (1. - smoothstep(.06, .13, vDepth));
  float chevron = 1. - smoothstep(0., .08, fract((p.x - .9 * abs(p.y)) * 15. + .4 * n));
  float crevasse = max(min(1., cross * stretched) * smoothstep(.04, .08, vDepth), chevron * margin * .8);
  ice = mix(ice, vec3(.02, .055, .09), crevasse);
  // Rock debris: lateral moraines along the edges, the medial moraine, and a dirty snout.
  float lateral = 1. - smoothstep(.035, .1, vEdge + .02 * (n - .5));
  float dirty = smoothstep(.84, 1., vAlong);
  float debris = clamp(max(max(lateral, medial * .9), dirty * .75) * (.65 + .55 * fine), 0., 1.);
  vec3 col = mix(ice, vec3(.05, .043, .036), debris);
  col = mix(col, mix(vec3(.47, .5, .53), vec3(.55, .57, .59), fine), snow);
  // Crevasses open through the snow too.
  col = mix(col, vec3(.05, .11, .16), min(1., cross * stretched) * smoothstep(.04, .08, vDepth) * snow * .75);
#ifdef CIRQUE
  col = mix(col, vec3(.03, .07, .1), berg * smoothstep(.03, .06, vDepth));
#endif
  // Albedos are kept low: this scene's key light and studio reflections are bright, and brighter
  // values would turn ice, firn and debris all white.
  diffuseColor.rgb *= col;`,
          )
          .replace(
            "#include <roughnessmap_fragment>",
            "#include <roughnessmap_fragment>\n  roughnessFactor = mix(mix(.62, .9, debris), .95, snow);",
          );
    },
    [uniforms, kind],
  );
  return (
    <meshStandardMaterial
      color="#ffffff"
      roughness={0.7}
      envMapIntensity={0.35}
      onBeforeCompile={compile}
      customProgramCacheKey={() => `glacier-ice-v2-${kind}-${ela.toFixed(3)}`}
    />
  );
}
