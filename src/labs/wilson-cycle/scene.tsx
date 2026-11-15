import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLabState } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { ShallowWater } from "../shared/shallow-water";
import { fbm } from "../shared/hazard-utils";
import {
  ARC,
  BASE,
  BELT,
  D,
  GAPS,
  KM,
  SLAB_SLOPE,
  STAGES,
  W,
  elevationKm,
  profileUnits,
  surfaceUnits,
} from "./section";

const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
/** Samples of the surface profile across the block, for the cut-face layers. */
const PROFILE_SAMPLES = 512;

/**
 * Lithosphere section: sediments, continental upper and lower crust, oceanic crust, lithospheric
 * mantle, hot asthenosphere, the subducting slab and melt. The crust follows the surface profile
 * (uTop, which carries the extra relief exaggeration); depths below it do not. Object space,
 * before the section's own vertical ×2.
 */
const SECTION_GLSL = `uniform sampler2D uTop; uniform float uStage,uGap;
const float ARC=${ARC.toFixed(3)},SLOPE=${SLAB_SLOPE.toFixed(3)},BELT=${BELT.toFixed(3)};
float topAt(float x){return texture2D(uTop,vec2(clamp((x+3.)/6.,0.,1.),.5)).r;}
float contBase(float m){return -.70+(uStage<.5?.25:.38)*(1.-smoothstep(0.,.45,m));}
vec3 sectionColour(vec3 p,vec3 w){
  float x=p.x,y=p.y,g=grain(p.xy+p.zy),stage=uStage,top=topAt(x);
  vec3 upper=mix(vec3(.80,.66,.56),vec3(.66,.54,.47),g);
  vec3 lower=mix(vec3(.56,.55,.58),vec3(.45,.45,.49),g);
  vec3 oceanic=mix(vec3(.30,.31,.34),vec3(.22,.23,.26),g);
  vec3 lith=mix(vec3(.44,.49,.37),vec3(.35,.40,.29),g);
  vec3 asth=mix(vec3(.60,.43,.34),vec3(.50,.35,.27),sFbm(p.xy*3.));
  vec3 sed=mix(vec3(.86,.78,.58),vec3(.76,.67,.48),step(.5,fract(y*90.)));
  if(stage>4.5){
    // Collision: crust thickened into a root, folded, with a sliver of old ocean floor along
    // the suture.
    float root=-.70-.55*exp(-sq((x-BELT)/.7));
    if(y>root){
      if(abs(x-BELT-.08-(y+.4)*.35)<.035&&y<top-.02)return mix(vec3(.20,.30,.24),vec3(.12,.18,.15),g);
      float fold=y+.09*cos(x*7.)*exp(-sq((x-BELT)/.8));
      vec3 c=y>(top+root)*.5?upper:lower;
      return c*mix(.82,1.,step(.5,fract(fold*16.)));
    }
    return y>min(-1.15,root-.3)?lith:asth;
  }
  float m=abs(x)-uGap;
  if(stage>2.5&&x>uGap){
    // Subduction: the slab's top starts at the trench floor and dips beneath the continent.
    float s=topAt(uGap)-(x-uGap)*SLOPE;
    if(y<=s&&y>s-.14)return oceanic;
    if(y<=s-.14&&y>s-.48)return lith*.85;
    if(y>s&&y>-.70){
      // Sediment scraped off the sinking plate piles up against the inner wall of the trench.
      if(x-uGap<.3&&y>s+.0&&y>-.3)return sed;
      return y>(top-.70)*.5?upper:lower;
    }
    if(y>s)return asth*1.08;
    return y>-1.15?lith:asth;
  }
  if(m>0.){
    float b=contBase(m);
    // Sediment wedges on rifted margins, thickest at the edge of the continent.
    if(stage>.5&&y>top-.06*(1.-smoothstep(0.,.5,m)))return sed;
    if(y>b)return y>(top+b)*.5?upper:lower;
    return y>-1.2?lith:asth;
  }
  if(stage<.5){
    // Rift floor: sediment and lava flows on stretched, thinned crust above hot mantle.
    if(y>top-.12)return mix(vec3(.62,.52,.40),vec3(.48,.40,.32),step(.5,fract(y*40.+x*2.)));
    if(y>-.45)return lower;
    return asth;
  }
  // Ocean floor: a thin skin of mud over 7 km of oceanic crust, then the plate's mantle, which
  // thickens as the plate ages away from the ridge.
  float a=abs(x)/max(uGap,.01);
  if(y>top-.14)return y>top-.012&&stage>1.5?mix(vec3(.62,.58,.5),vec3(.54,.5,.43),g):oceanic;
  float litBase=top-.14-(stage>2.5?.55:.55*sqrt(a));
  if(y>litBase)return lith;
  return asth;
}
vec3 sectionGlow(vec3 p,vec3 w){
  float x=p.x,y=p.y,stage=uStage,melt=0.;
  if(stage<.5)melt=1.-smoothstep(.7,1.,length(vec2(x/.3,(y+.58)/.12)));
  else if(stage<2.5)melt=(1.-smoothstep(.0,.06+(-.2-y)*.4,abs(x)))*step(y,topAt(0.)-.16)*step(-.8,y);
  else if(stage<4.5){
    float cx=uGap+ARC;
    melt=1.-smoothstep(.7,1.,length(vec2((x-cx)/.13,(y+.82)/.12)));
    melt=max(melt,(1.-smoothstep(.015,.03,abs(x-cx)))*step(-.74,y)*step(y,topAt(cx)-.02));
  }
  return vec3(1.,.36,.06)*melt*(.8+.4*sNoise(p.xy*20.));
}`;

/** Surface colors by height: sediment-covered ocean floor, shelf sand, lowland, upland, bare
 * rock and snow on the highest ranges; dark lava on the arc volcanoes. */
function paint(g: THREE.BufferGeometry, stage: number, relief: number) {
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3),
    col = new THREE.Color(),
    tone = new THREE.Color(),
    gap = GAPS[stage];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      km = p.getY(i) / (KM * relief),
      n = fbm(x * 4, z * 4);
    if (km < -0.25)
      col.set("#4b5560").lerp(tone.set("#6f7068"), ss(km, -4.5, -1.5) * 0.8 + n * 0.15);
    else if (km < 0.05) col.set("#b3a47c").lerp(tone.set("#cdbd92"), n);
    else if (km < 0.9) col.set("#6f8a4c").lerp(tone.set("#9a9a62"), n * 0.8);
    else if (km < 2.2) col.set("#5f7246").lerp(tone.set("#857a5e"), ss(km, 1.2, 2.2));
    else col.set("#8b8378").lerp(tone.set("#a49c90"), n);
    if (km > 3.6) col.lerp(tone.set("#eef1f1"), ss(km + 0.6 * (n - 0.5), 3.6, 4.4));
    // Bare, dry rift floor; dark lava on the arc volcanoes.
    if (stage === 0 && Math.abs(x) < gap && km > -0.25) col.lerp(tone.set("#9c8d6a"), 0.6);
    // Arc volcanoes: gray-brown andesite cones, darker near their summits.
    if (stage >= 3 && x > gap && Math.abs(x - gap - ARC) < 0.12 && km > 1.9)
      col.set("#7a6f64").lerp(tone.set("#4a423c"), ss(km, 2.6, 3.4));
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
}

export default function WilsonCycle() {
  const { params, trueScale, setParam } = useLabState("params", "trueScale", "setParam"),
    stage = Math.round(params.stage ?? 2),
    // Depths and layers ×2; surface relief a further ×2. Physical scale draws everything 1:1.
    f = trueScale ? 1 : 2,
    relief = trueScale ? 1 : 2,
    gap = GAPS[stage],
    converging = stage >= 3;
  const height = useMemo(() => surfaceUnits(stage, relief), [stage, relief]),
    profile = useMemo(() => profileUnits(stage, relief), [stage, relief]);
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(height, W, D, 260, BASE);
    paint(g, stage, relief);
    return g;
  }, [height, stage, relief]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const top = useMemo(() => {
    const t = new THREE.DataTexture(
      new Float32Array(PROFILE_SAMPLES),
      PROFILE_SAMPLES,
      1,
      THREE.RedFormat,
      THREE.FloatType,
    );
    t.magFilter = t.minFilter = THREE.LinearFilter;
    return t;
  }, []);
  useEffect(() => () => top.dispose(), [top]);
  useMemo(() => {
    const data = top.image.data as Float32Array;
    for (let i = 0; i < PROFILE_SAMPLES; i++)
      data[i] = profile(-3 + (6 * i) / (PROFILE_SAMPLES - 1));
    top.needsUpdate = true;
  }, [top, profile]);
  const uniforms = useSectionUniforms({ uTop: top, uStage: stage, uGap: gap });
  // Sea level, or for the rift a lake on the valley floor (the shoulders stand above it); no open
  // water after the collision.
  const water = useMemo(
    () => (stage === 5 ? null : stage === 0 ? () => -0.15 * KM * relief : () => 0),
    [stage, relief],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 80 && i < 1500; i++) {
      const x = -2.9 + 5.8 * ((i * 0.618034) % 1),
        z = -0.85 + 1.7 * ((i * 0.7548777) % 1),
        km = height(x, z) / (KM * relief);
      if (km > 0.08 && km < 1.6 && fbm(x * 3, z * 3) > 0.48)
        out.push([x, height(x, z) * f - 0.004, z]);
    }
    return out;
  }, [height, f, relief]);
  const at = (x: number) => profile(x) * f,
    peak = Math.max(...Array.from({ length: 121 }, (_, i) => at(-3 + i * 0.05)));
  return (
    <>
      <ScienceStudio
        slug="wilson-cycle"
        camera={[2.4, 2.8, 7]}
        scale="Depths and layer thicknesses ×2 · surface relief ×4 · idealized 300 km section through a basin · relief and layers schematic"
        trueScale="1 scene unit = 50 km in every direction · the section is not the full width of a real ocean"
      >
        <group scale={[1, f, 1]}>
          <mesh geometry={geometry} castShadow receiveShadow>
            <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
            <SectionMaterial
              attach="material-1"
              glsl={SECTION_GLSL}
              uniforms={uniforms}
              cacheKey="wilson-section-v2"
            />
          </mesh>
          {water && (
            <ShallowWater
              land={height}
              level={water}
              width={W}
              depth={D}
              deep={3 * KM * relief}
              shallowColour="#5d9ea8"
              deepColour="#14506a"
              sediment="#8f7e58"
            />
          )}
        </group>
        <PlantStand kind="broadleaf" positions={trees} scale={0.09} seed={17} />
        <Arrow
          from={[-1.4, Math.max(0.75, peak + 0.35), 0]}
          to={[converging ? -0.6 : -2.2, Math.max(0.75, peak + 0.35), 0]}
          color="#8ec8d1"
          width={1.4}
        />
        <Arrow
          from={[1.4, Math.max(0.75, peak + 0.35), 0]}
          to={[converging ? 0.6 : 2.2, Math.max(0.75, peak + 0.35), 0]}
          color="#8ec8d1"
          width={1.4}
        />
        <Tag
          pos={[0, Math.max(1.3, peak + 0.85), 0]}
          text={STAGES[stage]}
          note="These are idealized stages of ocean-basin opening and closure. A real basin may skip stages or close along a different line from where it opened; this is not a forecast of the Atlantic’s future."
          occlude={false}
        />
        <Tag
          pos={[-2.3, -0.38 * f, D / 2 + 0.05]}
          text="Continental crust"
          note="Pink upper and gray lower continental crust, about 35 km thick, thinning at rifted margins under a wedge of sediment. Collision thickens the crust into a deep root under the mountains."
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
            pos={[0, at(0) + 0.35, 0]}
            text="Rift valley and lake"
            tone="glacier"
            note="Stretching thins the continent: the valley floor drops along steep normal faults between uplifted shoulders, and fills with lakes, sediment and lava, as in East Africa today. A volcano rises on one shoulder."
            occlude={false}
          />
        )}
        {stage >= 1 && stage <= 4 && (
          <Tag
            pos={[-gap * 0.6, at(-gap * 0.6) - 0.15 * f, D / 2 + 0.05]}
            text="Oceanic crust · 7 km"
            short="Oceanic crust"
            note="Basalt and gabbro about 7 km thick (dark gray), under a thin skin of mud: thinner and denser than the 35 km continental crust. It forms at ridges and is recycled at trenches, so most ocean floor is less than 200 million years old."
            occlude={false}
          />
        )}
        {(stage === 1 || stage === 2) && (
          <Tag
            priority={1}
            pos={[0.3, at(0) + 0.45, D / 2]}
            text="Mid-ocean ridge"
            tone="magma"
            note="New oceanic crust forms at the ridge where rising mantle partly melts. The ocean floor sinks from about 2.5 km deep at the ridge to about 5 km as the plate cools and thickens away from it; the shelves at the continents' edges stay shallow."
            occlude={false}
          />
        )}
        {converging && stage < 5 && (
          <>
            <Tag
              pos={[gap + ARC, at(gap + ARC) + 0.55, 0.6]}
              text="Volcanic arc"
              tone="magma"
              note="Water released from the sinking slab lowers the melting point of the mantle above it; the magma rises to build a chain of volcanoes on the edge of the continent."
              occlude={false}
            />
            <Tag
              priority={1}
              pos={[gap - 0.05, at(gap) + 0.35, D / 2 + 0.05]}
              text="Trench"
              note="The deep-sea trench, about 9 km deep here, marks where the ocean plate bends down into the mantle. Sediment scraped off it piles up against the trench's inner wall."
              occlude={false}
            />
            <Tag
              pos={[gap + 0.6, (profile(gap) - 0.6 * SLAB_SLOPE - 0.2) * f, D / 2 + 0.05]}
              text="Subducting slab"
              note="Older, colder and denser oceanic lithosphere sinks beneath the continent at the trench."
              occlude={false}
            />
          </>
        )}
        {stage === 5 && (
          <>
            <Tag
              pos={[0.9, peak + 0.25, D / 2]}
              text="Mountain belt · suture"
              note={`Continental crust is too buoyant to subduct far, so it crumples and thickens into a mountain belt with peaks about ${Math.round(elevationKm(5, BELT))} km high here. A thin dark sliver of former ocean floor can remain along the suture between the two continents.`}
              occlude={false}
            />
            <Tag
              pos={[-0.6, -1.0 * f, D / 2 + 0.05]}
              text="Mountain root"
              note="The thickened crust (about 65 km here, against 35 km beside it) bulges down into the mantle. Like an iceberg, the buoyant root is several times deeper than the peaks are high; here the surface relief is drawn twice as tall as the depths, so the root looks shallower than it is."
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
            : "Collision thickens and deforms the continental crust; remnants of an ocean may remain in the suture."}{" "}
        <br />
        {
          "Select a stage to compare the structure. The reference continental crust is 35 km thick and oceanic crust about 7 km thick."
        }
      </ScienceReadout>
    </>
  );
}
