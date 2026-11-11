import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useLabControls } from "@/lib/store/lab-controls";
import { isostaticColumn, AIRY } from "@/lib/isostasy-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { fbm } from "../shared/hazard-utils";
import { FlowWaterMaterial } from "../shared/flow-water";

const W = 6,
  D = 3.4,
  SCALE = 1 / 10000,
  RX = 2.05,
  RZ = 2.7;

/** Distance from the ice center as a fraction of the way to a lobed margin (1 at the edge). */
const marginDistance = (x: number, z: number) => {
  const u = x / RX,
    v = z / RZ,
    a = Math.atan2(v, u);
  return Math.hypot(u, v) / (1 + 0.045 * Math.sin(3 * a + 1) + 0.025 * Math.sin(7 * a + 2));
};
/** Ice thickness in meters. The cross-section follows the Vialov (1958) ice-sheet profile,
 * h = H(1 − r^4/3)^3/8: nearly flat across the interior and steepening toward the margin. */
const iceAt = (x: number, z: number, peak: number) => {
  const r = marginDistance(x, z);
  return r >= 1 ? 0 : peak * (1 - r ** (4 / 3)) ** (3 / 8);
};
const ICE_SHAPE_GLSL = `float marginDistance(vec3 w){
  vec2 q=w.xz/vec2(${RX.toFixed(2)},${RZ.toFixed(2)});
  float a=atan(q.y,q.x);
  return length(q)/(1.+.045*sin(3.*a+1.)+.025*sin(7.*a+2.));
}
float iceShape(vec3 w){
  float r=marginDistance(w);
  return r>=1.?0.:pow(1.-pow(r,4./3.),.375);
}`;

/** Crust and mantle in section; the Moho lies one crustal thickness below the local surface. */
const ROCK_GLSL = `uniform float uCrust,uTopBare,uDepress,uPeak;
${ICE_SHAPE_GLSL}
float surfaceAt(vec3 w){return uTopBare-uPeak*iceShape(w)*uDepress;}
vec3 sectionColour(vec3 p,vec3 w){
  float below=surfaceAt(w)-w.y,g=grain(w.xy+w.zy);
  vec3 c;
  if(below<.06)c=mix(vec3(.55,.45,.34),vec3(.46,.37,.28),g);
  else if(below<uCrust*.46)c=mix(vec3(.74,.60,.55),vec3(.60,.50,.48),g);
  else if(below<uCrust)c=mix(vec3(.50,.51,.55),vec3(.40,.42,.46),g);
  else{
    float flow=sFbm(vec2(w.x*1.2,w.y*3.));
    c=mix(vec3(.50,.57,.38),vec3(.38,.45,.28),flow*.7+g*.3);
  }
  float b=min(abs(below-uCrust*.46),abs(below-uCrust));
  return c*mix(.6,1.,smoothstep(0.,.015,b));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/** Ice in section: annual layers parallel to the bed, bluer with depth. */
const ICE_GLSL = `uniform float uTopBare,uDepress,uPeak,uLift;
${ICE_SHAPE_GLSL}
vec3 sectionColour(vec3 p,vec3 w){
  float thick=uPeak*iceShape(w);
  float bed=uTopBare-thick*uDepress, h=w.y-bed;
  if(thick<=0.||h<.02)return vec3(-1.);
  float layer=step(.5,fract(h*55.+.3*sin(w.x*4.)));
  vec3 deep=vec3(.55,.74,.84),fresh=vec3(.93,.96,.98);
  return mix(deep,fresh,smoothstep(0.,thick*uLift,h))*mix(.93,1.,layer);
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/**
 * Ice-sheet surface: wind-packed snow ridged by sastrugi in the accumulation zone, and bare blue
 * ice with meltwater streams and lakes, crevasses and a dusty margin below the snowline.
 * Illustrative: the zones are placed by distance from the center, not calculated.
 */
function IceSheetMaterial(props: ThreeElements["meshStandardMaterial"]) {
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.vertexShader =
        "varying vec3 isP;\n" +
        s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nisP=position;");
      s.fragmentShader =
        `varying vec3 isP;
${ICE_SHAPE_GLSL}
float isHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float isNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(isHash(i),isHash(i+vec2(1.,0.)),f.x),mix(isHash(i+vec2(0.,1.)),isHash(i+vec2(1.,1.)),f.x),f.y);}
// Bump mapping from a procedural height (three.js perturbNormalArb).
vec3 isBump(vec3 pos,vec3 nrm,vec2 dh,float face){
  vec3 sx=normalize(dFdx(pos)),sy=normalize(dFdy(pos));
  vec3 r1=cross(sy,nrm),r2=cross(nrm,sx);
  float det=dot(sx,r1)*face;
  return normalize(abs(det)*nrm-sign(det)*(dh.x*r1+dh.y*r2));
}
` + s.fragmentShader;
      s.fragmentShader = s.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
  vec2 q=isP.xz,qe=q/vec2(${RX.toFixed(2)},${RZ.toFixed(2)});
  float e=marginDistance(isP),n=isNoise(q*5.)*.65+isNoise(q*15.)*.35;
  // Accumulation zone: wind-packed snow ridged by sastrugi.
  float sas=sin(dot(q,vec2(.8,.6))*70.+isNoise(q*3.)*7.);
  vec3 c=vec3(.86,.89,.93)*(.96+.03*(n-.5));
  // Below the snowline and on the steep margin, bare ice: blue where clean, with a gray band of
  // dust (a "dark zone").
  vec3 gn=normalize(cross(dFdx(isP),dFdy(isP)));
  float bareIce=max(smoothstep(.42,.6,e+.12*(n-.5)),smoothstep(.12,.35,1.-abs(gn.y)));
  c=mix(c,mix(vec3(.17,.31,.42),vec3(.36,.49,.58),n),bareIce);
  float dust=smoothstep(.6,.7,e)*(1.-smoothstep(.84,.94,e))*smoothstep(.35,.75,isNoise(q*2.2+7.));
  c=mix(c,vec3(.23,.24,.25),dust*.65);
  // Meltwater runs straight downslope and pools in lakes.
  float ang=atan(qe.y,qe.x)*16./6.2832+.7*isNoise(q*2.5);
  float stream=(1.-smoothstep(0.,.09,abs(fract(ang)-.5)))*smoothstep(.55,.66,e)*(1.-smoothstep(.9,.97,e));
  float lake=smoothstep(.64,.72,isNoise(q*4.+3.))*smoothstep(.52,.6,e)*(1.-smoothstep(.8,.86,e));
  c=mix(c,vec3(.07,.3,.5),max(stream*.75,lake*.92));
  // Crevasses open across the flow where the ice steepens near the margin.
  float crev=(1.-smoothstep(0.,.18,abs(fract(e*26.+.5*isNoise(q*5.))-.5)*2.))*smoothstep(.78,.86,e)*step(.5,isNoise(q*6.+1.));
  c=mix(c,vec3(.12,.27,.36),crev*.8);
  // Rock debris and dirt along the margin.
  c=mix(c,vec3(.44,.41,.37),smoothstep(.9,.99,e)*(.6+.4*n));
  diffuseColor.rgb*=c;
  float iceHeight=(1.-bareIce)*.18*sas+.5*isNoise(q*7.)+.25*isNoise(q*19.)-crev*.9-lake*.4;`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
  roughnessFactor=mix(.95,.72,bareIce)*(1.-.6*max(stream,lake));`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
  normal=isBump(-vViewPosition,normal,vec2(dFdx(iceHeight),dFdy(iceHeight))*.035,faceDirection);`,
        );
    },
    [],
  );
  return (
    <meshStandardMaterial
      color="#ffffff"
      envMapIntensity={0.45}
      onBeforeCompile={compile}
      customProgramCacheKey={() => "isostasy-ice-sheet-v8"}
      {...props}
    />
  );
}

export default function Isostasy() {
  const { params, trueScale } = useLabControls(),
    ice = params.ice ?? 1650,
    result = isostaticColumn(ice),
    bare = isostaticColumn(0),
    exaggeration = trueScale ? 1 : 5;
  const topBare = bare.landElevation * SCALE,
    crust = AIRY.crustThickness * SCALE,
    base = topBare - crust - 1.4,
    depressPerMetre = (AIRY.iceDensity / AIRY.mantleDensity) * exaggeration * SCALE;
  const ground = useMemo(
    () => (x: number, z: number) =>
      topBare -
      iceAt(x, z, ice) * depressPerMetre +
      0.035 * (fbm(x * 1.3 + 2, z * 1.3) - 0.5) +
      // Terminal moraine just beyond the ice margin.
      0.03 * Math.exp(-(((marginDistance(x, z) - 1.06) / 0.035) ** 2)),
    [ice, topBare, depressPerMetre],
  );
  const rock = useMemo(() => {
    const g = terrainBlockGeometry(ground, W, D, 180, base),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        e = marginDistance(x, z),
        n = fbm(x * 3 + 1, z * 3);
      col.set("#58704a").lerp(tone.set("#7c8a58"), n);
      col.lerp(tone.set("#9b927d"), 1 - THREE.MathUtils.smoothstep(e, 1.0, 1.35));
      if (e < 1) col.set("#7a7468");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [ground, base]);
  useEffect(() => () => rock.dispose(), [rock]);
  // Ice: a surface over the dome plus vertical faces where the block cuts it.
  const iceBody = useMemo(() => {
    if (ice <= 0) return null;
    const g = terrainBlockGeometry(
      (x, z) => {
        const h = iceAt(x, z, ice);
        // Gentle surface undulations where ice flows over bedrock bumps.
        const swell = 0.016 * (fbm(x * 1.9 + 5, z * 1.9) - 0.5) * Math.min(1, h / 300);
        return h > 0 ? ground(x, z) + h * exaggeration * SCALE + swell : ground(x, z) - 0.002;
      },
      W,
      D,
      180,
      base + 0.01,
    );
    return g;
  }, [ice, ground, exaggeration, base]);
  useEffect(() => () => iceBody?.dispose(), [iceBody]);
  const rockUniforms = useSectionUniforms({
    uCrust: crust,
    uTopBare: topBare,
    uDepress: depressPerMetre,
    uPeak: ice,
  });
  const iceUniforms = useSectionUniforms({
    uTopBare: topBare,
    uDepress: depressPerMetre,
    uPeak: ice,
    uLift: exaggeration * SCALE,
  });
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 120 && i < 1500; i++) {
      const x = -W / 2 + 0.08 + (W - 0.16) * ((i * 0.618034) % 1),
        z = -D / 2 + 0.08 + (D - 0.16) * ((i * 0.7548777) % 1);
      if (marginDistance(x, z) > 1.3 && fbm(x * 2.5, z * 2.5) > 0.45)
        out.push([x, ground(x, z) - 0.004, z]);
    }
    return out;
  }, [ground]);
  const lakes = useMemo(
    () =>
      ice > 200
        ? ([
            [-RX * 1.17, 0.35],
            [RX * 1.15, -0.5],
          ] as [number, number][])
        : [],
    [ice],
  );
  const center = ground(0, D / 2),
    iceTop = center + ice * exaggeration * SCALE,
    mohoX = -0.9,
    mohoAt = topBare - crust - iceAt(mohoX, D / 2, ice) * depressPerMetre;
  return (
    <>
      <ScienceStudio
        slug="isostasy"
        scale="Ice load and vertical displacement ×5 · local Airy equilibrium · width and margin shape schematic"
        trueScale="All heights share a scale · 1 scene unit = 10 km vertically"
        camera={[2.4, 5.2, 6.4]}
      >
        <mesh geometry={rock} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
          <SectionMaterial
            attach="material-1"
            glsl={ROCK_GLSL}
            uniforms={rockUniforms}
            cacheKey="isostasy-rock-v3"
          />
        </mesh>
        {iceBody && (
          <mesh geometry={iceBody} castShadow receiveShadow>
            <IceSheetMaterial attach="material-0" />
            <SectionMaterial
              attach="material-1"
              glsl={ICE_GLSL}
              uniforms={iceUniforms}
              cacheKey="isostasy-ice-v3"
              roughness={0.3}
            />
          </mesh>
        )}
        {lakes.map(([x, z], i) => (
          <mesh key={i} position={[x, ground(x, z) + 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 32]} />
            <FlowWaterMaterial color="#2f6f86" opacity={0.9} flow={[0.2, 0.1]} speed={0.3} />
          </mesh>
        ))}
        <PlantStand kind="conifer" positions={trees} scale={0.1} seed={21} />
        <Line
          points={[
            [-W / 2, topBare, D / 2 + 0.01],
            [W / 2, topBare, D / 2 + 0.01],
          ]}
          color="#f3efe2"
          lineWidth={1.4}
          dashed
          dashSize={0.08}
          gapSize={0.05}
        />
        <Line
          points={[
            [-W / 2, topBare - crust, D / 2 + 0.01],
            [W / 2, topBare - crust, D / 2 + 0.01],
          ]}
          color="#f3efe2"
          lineWidth={1}
          dashed
          dashSize={0.08}
          gapSize={0.05}
        />
        {ice > 0 && (
          <>
            <Arrow
              from={[0, topBare + 0.02, D / 2 + 0.06]}
              to={[0, center, D / 2 + 0.06]}
              color="#f0a640"
              width={1.6}
            />
            {[-1, 1].map((side) => (
              <Arrow
                key={side}
                from={[side * 0.4, topBare - crust - 0.5, D / 2 + 0.06]}
                to={[side * 1.5, topBare - crust - 0.5, D / 2 + 0.06]}
                color="#f6efc8"
                width={1.6}
              />
            ))}
          </>
        )}
        <Tag
          pos={[2.1, topBare - crust - 1.05, D / 2 + 0.05]}
          text="Mantle · solid, creeping"
          short="Mantle"
          note="Under the extra weight the mantle slowly flows aside while remaining solid. The arrows show the direction of that creep, not its speed."
          occlude={false}
        />
        <Tag
          pos={[-2.2, topBare - crust * 0.5, D / 2 + 0.05]}
          text="Crust · 35 km thick"
          short="Crust · 35 km"
          priority={1}
          note="Continental crust, less dense (2800 kg/m³) than the mantle below it. Its upper and lower layers are shown in different colors; its total thickness does not change when ice is added."
          occlude={false}
        />
        <Tag
          pos={[mohoX, mohoAt + 0.15, D / 2 + 0.05]}
          text={ice > 0 ? "Moho bends down" : "Moho"}
          priority={1}
          note="The crust keeps its thickness, so its base (the Moho) is pushed down by the same amount as the surface. Dashed lines show both levels without ice."
          occlude={false}
        />
        <Tag
          pos={[0, iceTop + 0.35, 0]}
          text={`${Math.round(ice)} m of ice`}
          priority={2}
          note="Each column sinks by the ice thickness × 917/3300 (ice density ÷ mantle density). Real adjustment takes thousands of years and spreads sideways as the lithosphere bends."
          occlude={false}
        />
        {lakes.length > 0 && (
          <Tag
            pos={[lakes[0][0], ground(lakes[0][0], lakes[0][1]) + 0.3, lakes[0][1]]}
            text="Meltwater lake"
            tone="glacier"
            note="Meltwater collects in hollows beyond the ice margin, here just outside the terminal moraine. Schematic: this local model does not bend the ground beyond the ice edge, although the real lithosphere does."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {"Ice "}
        {Math.round(ice)} {"m → equilibrium depression "}
        {result.depression.toFixed(0)}{" "}
        {"m at the center. Mantle / crust / ice densities: 3300 / 2800 / 917 kg/m³."} <br />
        {
          "Each column keeps its rock thickness and mass, so thicker ice pushes it further down. Unloading raises the equilibrium position; this static experiment does not predict rebound timing or global sea level."
        }
      </ScienceReadout>
    </>
  );
}
