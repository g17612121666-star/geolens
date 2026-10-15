import { useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { settlingDistance, settlingVelocity } from "@/lib/fluvial-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { ShallowWater } from "../shared/shallow-water";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import { PlantStand } from "../shared/natural-world";
import { Buildings, farmland, settlement } from "../shared/hazard-parts";
import type { LandSection } from "../shared/land-section";

// The bend's apex lies away from the default camera, so the point bar faces the viewer.
const bend = (x: number) => -0.75 * Math.cos(x * 0.9);
/** Signed distance across the channel, positive towards the inside of the bend. */
const across = (x: number, z: number) => {
  const inner = Math.cos(x * 0.9) >= 0 ? 1 : -1;
  return (z - bend(x)) * inner;
};
const bendStrength = (x: number) => Math.abs(Math.cos(x * 0.9));
const floodplain = (x: number) => 0.15 - 0.009 * x;

/** Point-bar reach: deep pool against the outer bank, a long gentle bar with scroll ridges inside. */
function pointBarHeight(x: number, z: number) {
  const q = across(x, z),
    k = bendStrength(x),
    fp = floodplain(x) + 0.008 * (noise(x * 1.5, z * 1.5) - 0.5);
  if (q < -0.06) return fp - 0.1 * Math.exp(-(((q + 0.06) / 0.05) ** 2));
  // Channel bed and the bar's long ramp; the lower of the two forms the surface.
  const reach = 0.16 + 0.6 * k,
    bed = -0.1 * Math.exp(-(((q + 0.06) / 0.2) ** 2)),
    ramp = -0.042 * (1 - THREE.MathUtils.smoothstep(q, 0.12, reach + 0.08)),
    scroll = q > 0.08 && q < reach ? 0.003 * Math.sin(q * 70) * k : 0;
  return fp + Math.min(bed, ramp) + scroll;
}
const pointBarLevel = (x: number) => floodplain(x) - 0.042;

/** Straight reach with natural levees that thin across a lower backswamp. */
const leveeRise = (d: number) => 0.045 * Math.exp(-(((d - 0.3) / 0.16) ** 2));
function leveeHeight(x: number, z: number) {
  const d = Math.abs(z);
  return (
    0.14 -
    0.006 * x +
    leveeRise(d) -
    0.012 * THREE.MathUtils.smoothstep(d, 0.8, 1.5) -
    0.1 * Math.exp(-((d / 0.22) ** 8)) +
    0.004 * (noise(x * 2, z * 2) - 0.5)
  );
}

/** Delta: a coastal plain behind the shoreline, and a fan-shaped lobe built out into the sea. */
const COAST = -1.2;
const branchZ = (b: number, x: number) =>
  x < COAST ? 0 : b * (x - COAST) * 0.38 + 0.05 * Math.sin(x * 3 + b);
/** Position within the lobe: 0 at the apex, 1 at the delta front. */
const lobe = (x: number, z: number) =>
  Math.hypot((x - COAST) / 2.7, z / (0.45 + 0.42 * Math.max(0, x - COAST)));
function deltaPlain(x: number, z: number) {
  if (x < COAST) return 0.11 - 0.035 * (x + 3);
  const seabed = Math.max(-0.15, 0.04 - 0.1 * (x - COAST)),
    top = 0.045 - (0.022 * (x - COAST)) / 2.7;
  return THREE.MathUtils.lerp(top, seabed, THREE.MathUtils.smoothstep(lobe(x, z), 0.82, 1.02));
}
function deltaHeight(x: number, z: number) {
  const plain = deltaPlain(x, z);
  let channel = 0;
  for (const b of x < COAST ? [0] : [-1, 0, 1]) {
    const d = Math.abs(z - branchZ(b, x));
    channel = Math.max(channel, 0.03 * Math.exp(-((d / 0.06) ** 2)));
  }
  return (
    plain -
    channel * THREE.MathUtils.smoothstep(plain, -0.02, 0.02) +
    0.003 * (noise(x * 3, z * 3) - 0.5)
  );
}

/** Cut-face sediments for each environment. */
const SECTIONS: LandSection[] = [
  {
    soilTone: "sandy",
    soil: 0.012,
    regolith: 0,
    // Older floodplain muds, then a fining-upward point-bar sequence: gravel lag, cross-bedded
    // sand, silt and clay.
    custom: `
  float y=p.y;
  if(y<-.08)return mix(vec3(.50,.48,.45),vec3(.44,.42,.40),step(.5,fract(y*90.)))*mix(.93,1.05,g);
  if(y<-.045){vec3 c=mix(vec3(.62,.57,.50),vec3(.70,.65,.57),g);
    float peb=smoothstep(.66,.72,sNoise(vec2(p.x+p.z,y)*vec2(70.,90.)));
    return mix(c,vec3(.46,.43,.39),peb*.8);}
  if(y<.07){float lam=fract((y+(p.x+p.z)*.25)*70.);
    return mix(vec3(.80,.70,.52),vec3(.71,.61,.45),smoothstep(.3,.7,lam))*mix(.93,1.05,g);}
  float lam=fract(y*120.);
  return mix(vec3(.58,.50,.40),vec3(.50,.43,.35),step(.5,lam))*mix(.93,1.05,g);`,
  },
  {
    soilTone: "loam",
    soil: 0.01,
    regolith: 0,
    // Flood silts drape the levees, thickest and sandiest beside the channel.
    custom: `
  float dz=abs(p.z),drape=.02+.045*exp(-sq((dz-.3)/.16));
  float base=.14-.006*p.x-.012*smoothstep(.8,1.5,dz);
  if(p.y>base-.012){
    float coarse=exp(-max(0.,dz-.25)*3.);
    float lam=step(.5,fract((p.y-base)*160.));
    vec3 silt=mix(vec3(.62,.53,.42),vec3(.74,.64,.48),coarse);
    return mix(silt,silt*.82,lam)*mix(.93,1.05,g);
  }
  float lam=fract((p.y+(p.x+p.z)*.2)*45.);
  vec3 sand=mix(vec3(.72,.64,.50),vec3(.62,.55,.43),smoothstep(.3,.7,lam));
  float peb=smoothstep(.66,.72,sNoise(vec2(p.x+p.z,p.y)*vec2(70.,90.)))*step(p.y,-.06)*step(-.12,p.y);
  if(p.y<-.12)sand=mix(vec3(.50,.48,.45),vec3(.44,.42,.40),step(.5,fract(p.y*90.)));
  return mix(sand,vec3(.46,.43,.39),peb*.8)*mix(.93,1.05,g);`,
  },
  {
    soilTone: "peat",
    soil: 0.01,
    regolith: 0,
    // Delta: flat topsets over seaward-dipping foresets over fine bottomsets.
    custom: `
  float front=1.6-1.3*smoothstep(.0,1.5,abs(p.z));
  if(p.y>.11)return mix(vec3(.55,.49,.40),vec3(.47,.42,.35),step(.5,fract(p.y*140.)))*mix(.93,1.05,g);
  if(p.y>-.1){
    float f=fract((p.y+(p.x-front)*.16)*55.);
    return mix(vec3(.78,.69,.52),vec3(.64,.56,.42),smoothstep(.35,.65,f))*mix(.92,1.06,g);
  }
  return mix(vec3(.46,.44,.42),vec3(.40,.38,.37),step(.5,fract(p.y*90.)))*mix(.93,1.05,g);`,
  },
];

const MEADOW = new THREE.Color("#86a55a"),
  SAND = new THREE.Color("#d2bb8a"),
  WET = new THREE.Color("#8d8268"),
  MARSH = new THREE.Color("#7d915a"),
  REED = new THREE.Color("#a59a68"),
  MUD = new THREE.Color("#8b8170"),
  SWAMP = new THREE.Color("#6d7f4b");

export default function RiverDeposition() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const mode = Math.round(params.feature ?? 0),
    flood = params.flood > 0.5,
    grain = params.grain ?? 40,
    v = trueScale ? 1 : 5;
  const height = useMemo(
    () => (mode === 0 ? pointBarHeight : mode === 1 ? leveeHeight : deltaHeight),
    [mode],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const c = new THREE.Color();
      if (mode === 0) {
        const q = across(x, z),
          h = pointBarHeight(x, z) - pointBarLevel(x);
        c.copy(farmland(x, z, 0.55)).lerp(MEADOW, 0.45);
        // The bar: bare sand near the water, younger scroll ridges colonised by grass and willow.
        if (q > -0.06 && q < 0.15 + 0.6 * bendStrength(x)) {
          const age = THREE.MathUtils.smoothstep(q, 0.05, 0.12 + 0.6 * bendStrength(x));
          c.copy(SAND).lerp(MEADOW, age * 0.9);
        }
        if (h < 0.004) c.copy(WET);
        return c.getStyle();
      }
      if (mode === 1) {
        const d = Math.abs(z);
        if (d < 0.2) return WET.getStyle();
        c.copy(farmland(x, z, 0.5)).lerp(MEADOW, 0.3);
        c.lerp(SWAMP, THREE.MathUtils.smoothstep(d, 0.9, 1.5) * 0.75);
        c.lerp(SAND, Math.exp(-(((d - 0.24) / 0.05) ** 2)) * 0.6);
        return c.getStyle();
      }
      if (y < 0) return MUD.getStyle();
      c.copy(MARSH).lerp(REED, noise(x * 4, z * 4));
      if (x < COAST - 0.1) c.copy(farmland(x, z, 0.45)).lerp(MEADOW, 0.3);
      c.lerp(SAND, 1 - THREE.MathUtils.smoothstep(y, 0.008, 0.024));
      return c.getStyle();
    },
    [mode],
  );
  const level = useMemo(
    () =>
      mode === 0
        ? (x: number) => pointBarLevel(x)
        : mode === 1
          ? (x: number) => (flood ? 0.2 - 0.006 * x : 0.115 - 0.006 * x)
          : // Channel water sits just below the delta plain, and never below sea level.
            (x: number, z: number) => Math.max(0.012, deltaPlain(x, z) - 0.014),
    [mode, flood],
  );
  const tint = useMemo(
    () =>
      mode === 2
        ? // Muddy channel water and a sediment plume fanning out beyond the delta front.
          (x: number, z: number) => Math.max(0, 1 - Math.max(0, lobe(x, z) - 0.85) * 1.6)
        : mode === 1 && flood
          ? () => 0.85
          : () => 0.35,
    [mode, flood],
  );
  const paths = useMemo(
    () =>
      mode < 2
        ? [
            Array.from({ length: 181 }, (_, i) => {
              const x = -3 + (i / 180) * 6,
                z = mode === 0 ? bend(x) - 0.03 * Math.sign(Math.cos(x * 0.9)) : 0;
              return [x, level(x, z) + 0.004, z] as [number, number, number];
            }),
          ]
        : [-1, 0, 1].map((b) =>
            Array.from({ length: 121 }, (_, i) => {
              const x = -3 + (i / 120) * 4.4,
                z = branchZ(b, x);
              return [x, level(x, z) + 0.004, z] as [number, number, number];
            }),
          ),
    [mode, level],
  );
  // Plants and houses sit outside the exaggerated group so they keep their true shape.
  const plants = useMemo(() => {
    const trees: [number, number, number][] = [],
      reeds: [number, number, number][] = [];
    for (let i = 0; i < 900 && trees.length < 60; i++) {
      const x = -2.85 + random(i + 7) * 5.7,
        z = -1.85 + random(i + 71) * 3.7,
        h = height(x, z),
        n = noise(x * 2.5 + 1, z * 2.5);
      const ok =
        mode === 0
          ? (across(x, z) < -0.25 || across(x, z) > 0.35 + 0.6 * bendStrength(x)) && n > 0.55
          : mode === 1
            ? (Math.abs(Math.abs(z) - 0.32) < 0.08 && n > 0.35) || (Math.abs(z) > 1.3 && n > 0.7)
            : x < COAST - 0.2 && Math.abs(z) > 0.25 && n > 0.5;
      if (ok) trees.push([x, h * v - 0.004, z]);
    }
    for (let i = 0; i < 400 && reeds.length < 120; i++) {
      const x = -2.85 + random(i + 300) * 5.7,
        z = -1.85 + random(i + 371) * 3.7,
        h = height(x, z);
      const ok =
        mode === 0
          ? across(x, z) > 0.02 && across(x, z) < 0.3
          : mode === 1
            ? Math.abs(z) > 1.1
            : x > COAST && h > 0.016 && lobe(x, z) < 0.85;
      if (ok) reeds.push([x, h * v, z]);
    }
    return { trees, reeds };
  }, [mode, height, v]);
  const houses = useMemo(
    () =>
      mode === 1
        ? settlement(-1.6, 0.34, 7, 0.35, 0.06, 6, (x, z) => Math.abs(Math.abs(z) - 0.32) < 0.07)
        : mode === 2
          ? settlement(-2.3, 0.9, 6, 0.4, 0.06, 3, (x, z) => Math.abs(z) > 0.3)
          : [],
    [mode],
  );
  return (
    <>
      <ScienceStudio
        horizon
        slug="river-deposition"
        camera={[3.5, 4.3, 7]}
        scale="600 × 400 m conceptual reach · relief ×5 · sediment symbols enlarged"
        trueScale="1 scene unit = 100 m · one geometric scale · water, sediment and vegetation symbols enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain
            height={height}
            colour={colour}
            base={-0.18}
            resolution={220}
            cliff={0.35}
            mottle={0.06}
            section={SECTIONS[mode]}
          />
          <ShallowWater
            land={height}
            level={level}
            deep={mode === 2 ? 0.12 : 0.07}
            tint={tint}
            sediment={mode === 2 ? "#a08a5c" : "#8f7e58"}
            shallowColour={mode === 2 ? "#7fae9f" : "#86ab98"}
            deepColour={mode === 2 ? "#23627a" : "#33707e"}
          />
          {paths.map((p, k) =>
            Array.from({ length: 13 }, (_, i) => {
              const a = p[Math.floor(((t + i / 13) % 1) * (p.length - 1))];
              return (
                <mesh key={`${k}-${i}`} position={[a[0], a[1] + 0.004, a[2]]} scale={[1, 1 / v, 1]}>
                  <sphereGeometry args={[0.019, 8, 6]} />
                  <meshBasicMaterial color="#edd1a3" />
                </mesh>
              );
            }),
          )}
          {mode === 0 ? (
            <>
              <Tag
                pos={[0, 0.3, -0.3]}
                text="Point bar"
                note="Sand and gravel build out on the inside of the bend, where the flow is slower and shallower. Older bars become the curved ridges behind, colonised by grass and trees. Spiralling (helicoidal) flow and sediment supply also shape the bar, so surface speed alone does not explain it."
                occlude={false}
              />
              <Tag
                pos={[0.1, 0.32, -1.2]}
                text="River cliff"
                note="On the outside of the bend the deepest, fastest flow undercuts the bank, which collapses to leave a steep cliff exposing the floodplain sediments."
                occlude={false}
              />
              <Arrow
                from={[-0.7, 0.2, -0.62]}
                to={[0.6, 0.2, -0.72]}
                color="#a2ced3"
                width={0.65}
              />
            </>
          ) : mode === 1 ? (
            <>
              <Tag
                pos={[0.2, 0.32, 0.45]}
                text="Natural levee"
                note="When the river overtops its banks the flow slows at once, so the coarsest sediment drops beside the channel. Repeated floods build these low ridges. They are sedimentary landforms, not constructed flood defences."
                occlude={false}
              />
              <Tag
                pos={[1.7, 0.25, -1.55]}
                text="Floodplain"
                note="Finer silt and clay travel farther in overbank flow and settle in the lower, wetter backswamp. The cut face shows the flood layers thinning away from the channel."
                occlude={false}
              />
            </>
          ) : (
            <>
              <Tag
                pos={[0.5, 0.2, 0.75]}
                text="Distributaries"
                note="A delta grows where the river supplies sediment faster than waves and tides remove it. Channels split and shift; the three branches here are illustrative. The cut face shows flat topsets over seaward-sloping foresets."
                occlude={false}
              />
              <Tag
                pos={[1.7, 0.2, -1.1]}
                text="River mouth"
                note="Not every river mouth builds a delta. Tides, waves, sea-level history and sediment supply can maintain an estuary instead. The brown plume shows sediment carried out into the sea."
                occlude={false}
              />
            </>
          )}
        </group>
        <PlantStand kind="broadleaf" scale={0.1} seed={11} positions={plants.trees} />
        <GrassPatch
          positions={plants.reeds}
          height={0.05}
          color={mode === 2 ? "#9a9a5e" : "#7f9150"}
        />
        <Buildings items={houses} ground={(x, z) => height(x, z) * v} />
        {mode === 0 && (
          <DebrisField
            points={Array.from({ length: 70 }, (_, i) => {
              const x = -1.45 + random(i + 843) * 2.9,
                z = bend(x) + 0.12 + random(i + 286) * 0.25;
              return [x, (height(x, z) + 0.002) * v, z] as [number, number, number];
            }).filter(([x, , z]) => across(x, z) > -0.02)}
            size={0.012}
            color="#b5a187"
          />
        )}
        <group position={[-2.3, 0.55, -2.4]}>
          <mesh>
            <cylinderGeometry args={[0.19, 0.19, 0.9, 32, 1, true]} />
            <meshPhysicalMaterial
              color="#99c9d1"
              transparent
              opacity={0.16}
              roughness={0.15}
              side={2}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[
              0,
              -0.45 + Math.max(0, 1 - (t * settlingVelocity(grain * 1e-6) * 1200) / 2) * 0.9,
              0,
            ]}
          >
            <icosahedronGeometry args={[0.035, 1]} />
            <meshStandardMaterial color="#d2be93" roughness={0.9} />
          </mesh>
          <Tag
            pos={[0, 0.65, 0]}
            text="Settling · 2 m / 20 min"
            note="A separate, enlarged tube, not at landscape scale. One play-through lasts 20 minutes; the grain falls through 2 m of still fresh water at its Stokes settling speed."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? "Inner-bank point bar opposite an undercut river cliff. Flow tracers move downstream; the bar does not grow in this model."
          : mode === 1
            ? `${flood ? "Overbank flow shown" : "Channel flow shown"} · natural levees border a lower floodplain. Toggle Overbank water to compare.`
            : "A delta of river sediment, crossed by branching distributaries, builds out into the sea. Not every river mouth builds a delta; many end in estuaries."}
        <br />
        {"Separate settling experiment: "}
        {grain.toFixed(0)} {"μm quartz spheres settle at "}
        {(settlingVelocity(grain * 1e-6) * 1000).toFixed(2)}{" "}
        {
          "mm/s in still 20 °C fresh water; at 0.1 m/s horizontal transport through 2 m depth, distance ≈ "
        }
        {settlingDistance(grain * 1e-6).toFixed(0)} {"m. Turbulence and flocculation are excluded."}
      </ScienceReadout>
    </>
  );
}
