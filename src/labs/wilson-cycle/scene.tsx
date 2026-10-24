import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { fbm } from "../shared/hazard-utils";

const STAGES = [
  "Continental rift",
  "Young ocean",
  "Open ocean",
  "Subduction begins",
  "Ocean closes",
  "Continental collision",
];
const GAPS = [0.14, 0.5, 1.25, 1.25, 0.65, 0];
const W = 6,
  D = 1.8,
  BASE = -1.65,
  SLAB_SLOPE = 0.78,
  /** Arc-to-trench distance: the arc sits where the slab top is ~50 km deep, above a mantle wedge. */
  ARC = 1.25;
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Surface heights, 1 unit = 50 km (vertical exaggeration is applied by the parent group). */
function surface(stage: number, gap: number) {
  return (x: number, z: number) => {
    const n = 0.018 * (fbm(x * 2 + 3, z * 2) - 0.5),
      land = 0.02 + n;
    if (stage === 5) {
      const belt = Math.exp(-(((x - 0.1) / 0.6) ** 2));
      // Peaks reach about 5–6 km (0.1 unit); the crustal root below is several times deeper.
      return land + belt * (0.065 + 0.04 * fbm(x * 4, z * 4)) * (0.8 + 0.2 * Math.sin(z * 3));
    }
    const m = Math.max(-gap - x, x - gap);
    if (m > 0) {
      // On a continent: passive margins slope to the ocean; the arc rises above the slab.
      const shelf = stage === 0 ? 0 : -0.1 * (1 - ss(m, 0, 0.35));
      const arc =
        stage >= 3 && x > gap
          ? [-0.35, 0.5].reduce(
              (h, vz) =>
                h + 0.075 * Math.exp(-(((x - gap - ARC) / 0.11) ** 2) - ((z - vz) / 0.2) ** 2),
              0.025 * Math.exp(-(((x - gap - ARC) / 0.3) ** 2)),
            )
          : 0;
      const shoulder = stage === 0 ? 0.04 * Math.exp(-(((m - 0.12) / 0.08) ** 2)) : 0;
      return land + shelf + arc + shoulder;
    }
    if (stage === 0) return -0.05 + n * 0.5;
    const across = Math.abs(x) / gap;
    const ridge = 0.055 * (1 - across) ** 2 - 0.012 * Math.exp(-((x / 0.04) ** 2));
    const trench = stage >= 3 ? -0.14 * Math.exp(-(((x - gap) / 0.1) ** 2)) : 0;
    return -0.08 + (stage >= 3 ? 0 : ridge) + trench + n * 0.4;
  };
}

/** Lithosphere section: sediments, continental upper/lower crust, ocean crust, lithospheric
 * mantle, hot asthenosphere, the subducting slab and melt. Uses unscaled object space. */
const SECTION_GLSL = `uniform float uStage,uGap;
const float ARC=${ARC.toFixed(2)};
float contTop(float m){return .02-.1*(1.-smoothstep(0.,.35,m));}
float contBase(float m){return -.68+(uStage<.5?.25:.38)*(1.-smoothstep(0.,.45,m));}
float slabTop(float x){return -.08-(x-uGap)*${SLAB_SLOPE.toFixed(2)};}
vec3 sectionColour(vec3 p,vec3 w){
  float x=p.x,y=p.y,g=grain(p.xy+p.zy),stage=uStage;
  vec3 upper=mix(vec3(.80,.66,.56),vec3(.66,.54,.47),g);
  vec3 lower=mix(vec3(.56,.55,.58),vec3(.45,.45,.49),g);
  vec3 oceanic=mix(vec3(.30,.31,.34),vec3(.22,.23,.26),g);
  vec3 lith=mix(vec3(.44,.49,.37),vec3(.35,.40,.29),g);
  vec3 asth=mix(vec3(.60,.43,.34),vec3(.50,.35,.27),sFbm(p.xy*3.));
  vec3 sed=mix(vec3(.86,.78,.58),vec3(.76,.67,.48),step(.5,fract(y*90.)));
  if(stage>4.5){
    float root=-.68-.55*exp(-sq((x-.1)/.7));
    float suture=abs(x-.18-(y+.4)*.35);
    if(y>root){
      if(suture<.035)return mix(vec3(.20,.30,.24),vec3(.12,.18,.15),g);
      float fold=y+.09*cos(x*7.)*exp(-sq((x-.1)/.8));
      vec3 c=(y>(root+.02)*.5)?upper:lower;
      return c*mix(.82,1.,step(.5,fract(fold*16.)));
    }
    return y>min(-1.15,root-.3)?lith:asth;
  }
  float m=max(-uGap-x,x-uGap);
  bool subducting=stage>2.5&&x>uGap;
  if(subducting){
    float s=slabTop(x);
    if(y<=s&&y>s-.14)return oceanic;
    if(y<=s-.14&&y>s-.48)return lith*.85;
    if(y>s&&y>-.68)return m<.12&&y>-.25?sed:(y>-.34?upper:lower);
    if(y>s)return asth*1.08;
    return y>-1.15?lith:asth;
  }
  if(m>0.){
    float top=contTop(m),b=contBase(m);
    if(y>top-.05&&m<.5&&stage>.5)return sed;
    if(y>b)return y>(top+b)*.5?upper:lower;
    return y>-1.2?lith:asth;
  }
  if(stage<.5){
    if(y>-.22)return mix(vec3(.62,.52,.40),vec3(.48,.40,.32),step(.5,fract(y*40.+x*2.)));
    if(y>-.43)return lower;
    return asth;
  }
  float a=abs(x)/max(uGap,.01);
  float top=-.08+(stage<2.5?.055*sq(1.-a):0.);
  if(y>top-.14)return oceanic;
  float litBase=top-.14-.55*sqrt(a);
  if(y>litBase)return lith;
  return asth;
}
vec3 sectionGlow(vec3 p,vec3 w){
  float x=p.x,y=p.y,stage=uStage,melt=0.;
  if(stage<.5)melt=1.-smoothstep(.7,1.,length(vec2(x/.3,(y+.55)/.12)));
  else if(stage<2.5)melt=(1.-smoothstep(.0,.06+(-.2-y)*.4,abs(x)))*step(y,-.24)*step(-.8,y);
  else if(stage<4.5){
    float cx=uGap+ARC;
    melt=(1.-smoothstep(.7,1.,length(vec2((x-cx)/.13,(y+.82)/.12))));
    melt=max(melt,(1.-smoothstep(.015,.03,abs(x-cx)))*step(-.74,y)*step(y,.05));
  }
  return vec3(1.,.36,.06)*melt*(.8+.4*sNoise(p.xy*20.));
}`;

export default function WilsonCycle() {
  const { params, trueScale, setParam } = useLabControls(),
    stage = Math.round(params.stage ?? 2),
    f = trueScale ? 1 : 2,
    gap = GAPS[stage],
    converging = stage >= 3;
  const height = useMemo(() => surface(stage, gap), [stage, gap]);
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(height, W, D, 220, BASE),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        n = fbm(x * 4, z * 4);
      if (y < -0.02) col.set("#4e5458").lerp(tone.set("#8a7f68"), ss(y, -0.09, -0.03));
      else if (y < 0.035) col.set("#6f8a4c").lerp(tone.set("#9a9a62"), n);
      else if (y < 0.075) col.set("#5f7246").lerp(tone.set("#8a7a62"), ss(y, 0.045, 0.075));
      else col.set("#8b8378").lerp(tone.set("#eef1f1"), ss(y, 0.095, 0.115));
      if (stage >= 3 && x > gap && Math.abs(x - gap - ARC) < 0.05 && y > 0.075) col.set("#3a3330");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [height, stage, gap]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useSectionUniforms({ uStage: stage, uGap: gap });
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 70 && i < 1200; i++) {
      const x = -2.9 + 5.8 * ((i * 0.618034) % 1),
        z = -0.85 + 1.7 * ((i * 0.7548777) % 1),
        y = height(x, z);
      if (y > 0.015 && y < 0.04 && fbm(x * 3, z * 3) > 0.5) out.push([x, y * f - 0.004, z]);
    }
    return out;
  }, [height, f]);
  const waterWidth = stage === 0 ? 0.26 : stage < 5 ? gap * 2 + 0.6 : 0;
  return (
    <>
      <ScienceStudio
        slug="wilson-cycle"
        camera={[2.4, 2.8, 7]}
        scale="Vertical dimensions ×2 · idealised 300 km section through a basin · relief and layers schematic"
        trueScale="1 scene unit = 50 km · section is not the full width of a real ocean"
      >
        <group scale={[1, f, 1]}>
          <mesh geometry={geometry} castShadow receiveShadow>
            <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
            <SectionMaterial
              attach="material-1"
              glsl={SECTION_GLSL}
              uniforms={uniforms}
              cacheKey="wilson-section-v1"
            />
          </mesh>
          {waterWidth > 0 && (
            <mesh position={[0, stage === 0 ? -0.02 : 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[waterWidth, D]} />
              <FlowWaterMaterial color="#1f6584" opacity={0.7} speed={0.2} />
            </mesh>
          )}
        </group>
        <PlantStand kind="broadleaf" positions={trees} scale={0.09} seed={17} />
        <Arrow
          from={[-1.4, 0.75, 0]}
          to={[converging ? -0.6 : -2.2, 0.75, 0]}
          color="#8ec8d1"
          width={1.4}
        />
        <Arrow
          from={[1.4, 0.75, 0]}
          to={[converging ? 0.6 : 2.2, 0.75, 0]}
          color="#8ec8d1"
          width={1.4}
        />
        <Tag
          pos={[0, 1.3, 0]}
          text={STAGES[stage]}
          note="These are idealised stages of ocean-basin opening and closure. A real basin may skip stages or close along a different line from where it opened; this is not a forecast of the Atlantic’s future."
          occlude={false}
        />
        <Tag
          pos={[-2.3, -0.38 * f, D / 2 + 0.05]}
          text="Continental crust"
          note="Pink upper and grey lower continental crust, about 35 km thick, thinning at rifted margins under a wedge of sediment. Collision thickens the crust into a deep root under the mountains."
          occlude={false}
        />
        <Tag
          pos={[2.1, -1.35 * f, D / 2 + 0.05]}
          text="Mantle · mostly solid"
          note="Green: rigid lithospheric mantle, part of the plate. Red-brown: hotter, weaker asthenosphere below. Orange glow marks small amounts of melt, not a magma ocean."
          occlude={false}
        />
        {stage === 0 && (
          <Tag
            pos={[0, 0.35, 0]}
            text="Rift valley and lake"
            tone="glacier"
            note="Stretching thins the continent; the centre drops along normal faults and may fill with lakes and volcanic rock, as in East Africa today."
            occlude={false}
          />
        )}
        {(stage === 1 || stage === 2) && (
          <Tag
            pos={[0.3, 0.2, D / 2]}
            text="Mid-ocean ridge"
            tone="magma"
            note="New oceanic crust (dark grey, about 7 km thick) forms at the ridge where rising mantle partly melts. The plate thickens and sinks as it ages away from the ridge."
            occlude={false}
          />
        )}
        {converging && stage < 5 && (
          <>
            <Tag
              pos={[gap + ARC, 0.35 * f, 0.6]}
              text="Volcanic arc"
              tone="magma"
              note="Water released from the sinking slab lowers the melting point of the mantle above it; the magma rises to build a chain of volcanoes."
              occlude={false}
            />
            <Tag
              pos={[gap + 0.6, (-0.3 - 0.6 * SLAB_SLOPE) * f, D / 2 + 0.05]}
              text="Subducting slab"
              note="Older, colder and denser oceanic lithosphere sinks beneath the continent at a deep-sea trench."
              occlude={false}
            />
          </>
        )}
        {stage === 5 && (
          <>
            <Tag
              pos={[0.9, 0.25 * f, D / 2]}
              text="Mountain belt · suture"
              note="Continental crust is too buoyant to subduct far, so it crumples and thickens. A thin dark sliver of former ocean floor can remain along the suture between the two continents."
              occlude={false}
            />
            <Tag
              pos={[-0.6, -1.0 * f, D / 2 + 0.05]}
              text="Mountain root"
              note="The thickened crust (about 65 km here, against 35 km beside it) bulges down into the mantle. Like an iceberg, the buoyant root is several times deeper than the peaks are high."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        <div className="pointer-events-auto mb-2 flex flex-wrap justify-center gap-1">
          {STAGES.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={i === stage}
              onClick={() => setParam("stage", i)}
              className={`min-h-11 rounded-lg border px-2 text-xs ${i === stage ? "border-glacier text-chalk" : "border-white/10 text-mist"}`}
            >
              {i + 1}. {name}
            </button>
          ))}
        </div>
        {"Stage "}
        {stage + 1}/6: {STAGES[stage]}.{" "}
        {stage < 3
          ? "Extension and spreading can open a basin."
          : stage < 5
            ? "Oceanic lithosphere sinks at the trench; buoyant continental crust resists being pulled down."
            : "Collision thickens and deforms the continental crust; remnants of an ocean may remain in the suture."}
        <br />
        {
          "Select a stage to compare the structure. The reference continental crust is 35 km thick and oceanic crust about 7 km thick."
        }
      </ScienceReadout>
    </>
  );
}
