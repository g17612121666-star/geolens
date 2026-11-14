import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabState } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { fbm } from "../shared/hazard-utils";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import {
  D,
  FLOWS,
  LAND,
  MANTLE_BASE,
  OCEAN,
  PIT,
  PLUME_X,
  SEA,
  SEAMOUNT,
  SPACING,
  W,
  flowAngle,
  hawaiianVolcano,
  paint,
  plateHeight,
  type Setting,
} from "./islands";

const COOLED = new THREE.Color("#2d2a2b"),
  MOLTEN = new THREE.Color("#c2441c"),
  ACTIVE_FLOW = FLOWS.find((f) => "active" in f) ?? FLOWS[FLOWS.length - 1];

/**
 * The active lava flow (see FLOWS) running down the east flank into the sea, in a channel between
 * cooled, dark margins. It glows while the volcano sits over the plume and cools to black rock
 * once the plate has carried the volcano away.
 */
function LavaFlow({ height, glow }: { height: (x: number, z: number) => number; glow: number }) {
  const { crust, channel, entry } = useMemo(() => {
    const path: THREE.Vector3[] = [];
    let entry: [number, number, number] = [PLUME_X, SEA, 0];
    for (let i = 0; i <= 64; i++) {
      const r = ACTIVE_FLOW.start + 0.55 * (i / 64),
        a = flowAngle(ACTIVE_FLOW, r),
        x = PLUME_X + r * Math.cos(a),
        z = r * Math.sin(a),
        y = height(x, z);
      if (y < SEA) {
        entry = [x, SEA, z];
        break;
      }
      path.push(new THREE.Vector3(x, y, z));
    }
    const strip = (half: (u: number) => number, lift: number) => {
      const positions: number[] = [],
        index: number[] = [];
      path.forEach((p, i) => {
        const next = path[Math.min(i + 1, path.length - 1)],
          prev = path[Math.max(i - 1, 0)],
          side = new THREE.Vector3(-(next.z - prev.z), 0, next.x - prev.x).normalize(),
          w = half(i / (path.length - 1));
        for (const sign of [-1, 1]) {
          const x = p.x + side.x * w * sign,
            z = p.z + side.z * w * sign;
          positions.push(x, height(x, z) + lift, z);
        }
        if (i > 0) {
          const k = 2 * i;
          index.push(k - 2, k - 1, k, k, k - 1, k + 1);
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    };
    return {
      crust: strip((u) => 0.022 + 0.03 * u, 0.006),
      channel: strip((u) => 0.008 + 0.012 * u, 0.009),
      entry,
    };
  }, [height]);
  useEffect(
    () => () => {
      crust.dispose();
      channel.dispose();
    },
    [crust, channel],
  );
  return (
    <>
      <mesh geometry={crust} receiveShadow>
        <meshStandardMaterial
          color="#262224"
          roughness={0.85}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh geometry={channel}>
        <meshStandardMaterial
          color={COOLED.clone().lerp(MOLTEN, Math.min(1, glow * 1.5))}
          emissive="#ff5a1f"
          emissiveIntensity={1.8 * glow * glow}
          roughness={0.5}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-4}
        />
      </mesh>
      {/* Where lava meets the sea, it boils seawater into a white plume. */}
      {glow > 0.3 && (
        <CloudVolume
          position={[entry[0], entry[1] + 0.12, entry[2]]}
          scale={[0.045, 0.13, 0.045]}
          seed={17}
          opacity={0.42}
        />
      )}
    </>
  );
}

/** Plate cut faces: oceanic or continental crust over lithospheric mantle, with the melt pathway. */
const PLATE_GLSL = `uniform float uContinental,uTop,uBase,uPlume;
vec3 sectionColour(vec3 p,vec3 w){
  float depth=uTop-p.y, g=grain(p.xy+p.zy);
  vec3 c;
  if(uContinental>.5){
    if(depth<.45)c=mix(vec3(.70,.58,.53),vec3(.58,.48,.45),g);
    else if(depth<.72)c=mix(vec3(.50,.50,.55),vec3(.42,.43,.47),g);
    else c=mix(vec3(.45,.52,.36),vec3(.36,.43,.29),g);
    float b=min(abs(depth-.45),abs(depth-.72));c*=mix(.7,1.,smoothstep(0.,.01,b));
  }else{
    if(depth<.03)c=mix(vec3(.72,.67,.58),vec3(.64,.59,.50),g);
    else if(depth<.16)c=mix(vec3(.36,.35,.35),vec3(.28,.28,.30),g)*(.9+.2*step(.5,fract(p.x*60.)));
    else c=mix(vec3(.45,.52,.36),vec3(.36,.43,.29),g);
    float b=min(abs(depth-.03),abs(depth-.16));c*=mix(.7,1.,smoothstep(0.,.008,b));
  }
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){
  float dx=w.x-uPlume, wob=.015*sin(w.y*40.);
  float pipe=(1.-smoothstep(.018,.03,abs(dx+wob)))*step(uBase,p.y);
  float chamber=uContinental>.5?1.-smoothstep(.8,1.,length(vec2(dx/.32,(p.y-(uTop-.3))/.09))):0.;
  return vec3(1.,.36,.05)*max(pipe*1.1,chamber*.8);
}`;

/** Asthenosphere with the plume head and stem, colored by an illustrative temperature. */
const MANTLE_GLSL = `uniform float uPlume,uTop,uTime;
float plume(vec3 w){
  float dx=w.x-uPlume, y=w.y;
  float head=1.-smoothstep(.75,1.,length(vec2(dx/.62,(y-(uTop-.32))/.3)));
  float stemW=.13+.08*(uTop-y);
  float stem=(1.-smoothstep(stemW*.6,stemW,abs(dx+.03*sin(y*6.+uTime))))*step(y,uTop-.3);
  return max(head,stem);
}
vec3 sectionColour(vec3 p,vec3 w){
  float g=grain(w.xy+w.zy), conv=sFbm(vec2(w.x*1.4+uTime*.2,w.y*2.2));
  vec3 c=mix(vec3(.58,.36,.27),vec3(.47,.28,.21),conv)*(.9+.2*g);
  return mix(c,vec3(.32,.09,.04),plume(w));
}
vec3 sectionGlow(vec3 p,vec3 w){
  float t=plume(w), swirl=sFbm(vec2(w.x*5.,w.y*5.-uTime*2.));
  return mix(vec3(.55,.08,.01),vec3(1.,.42,.06),swirl)*t*(.6+.5*swirl);
}`;

function Track({
  setting,
  z,
  t,
  stacked = false,
}: {
  setting: Setting;
  z: number;
  t: number;
  /** Both sections are shown: spread the labels so they do not overlap. */
  stacked?: boolean;
}) {
  const { continental, top, plateBase } = setting;
  const height = useMemo(() => plateHeight(setting), [setting]);
  const plate = useMemo(() => {
    const g = terrainBlockGeometry(height, W, D, 220, plateBase);
    paint(g, setting);
    return g;
  }, [height, setting, plateBase]);
  useEffect(() => () => plate.dispose(), [plate]);
  const shift = t * 0.65;
  // The old vent dies as the plate carries it off the plume; a new one starts above the plume.
  const dying = 1 - THREE.MathUtils.smoothstep(shift, 0.18, 0.45),
    newborn = THREE.MathUtils.smoothstep(shift, 0.3, 0.65),
    tagLift = stacked && !continental ? 0.45 : 0;
  const plateUniforms = useSectionUniforms({
    uContinental: continental ? 1 : 0,
    uTop: top,
    uBase: plateBase,
    uPlume: PLUME_X,
  });
  const mantleUniforms = useSectionUniforms({ uPlume: PLUME_X, uTop: plateBase, uTime: t * 6 });
  const { trees, forest } = useMemo(() => {
    const trees: [number, number, number][] = [],
      forest: [number, number, number][] = [];
    for (let i = 0; trees.length < (continental ? 110 : 70) && i < 2000; i++) {
      const x = -W / 2 + 0.1 + (W - 0.2) * ((i * 0.618034) % 1),
        zz = -D / 2 + 0.08 + (D - 0.16) * ((i * 0.7548777) % 1),
        y = height(x, zz),
        k = continental ? 0 : hawaiianVolcano(x, zz)[0],
        ok = continental
          ? Math.abs(zz) > 0.64 && Math.abs(zz) < 0.95 && fbm(x * 3, zz * 3) > 0.42
          : (k === 1 || k === 2) && y > SEA + 0.05 && y < SEA + 0.5;
      if (ok) trees.push([x, y - 0.004, zz]);
      // Rain forest on the active shield's wet windward flank, below the bare summit.
      else if (
        !continental &&
        k === 0 &&
        forest.length < 70 &&
        zz > 0.12 &&
        y > SEA + 0.05 &&
        y < SEA + 0.2 &&
        fbm((x - PLUME_X) * 7, zz * 7) > 0.47
      )
        forest.push([x, y - 0.003, zz]);
    }
    return { trees, forest };
  }, [height, continental]);
  const mantleTop = plateBase;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, (mantleTop + MANTLE_BASE) / 2, 0]}>
        <boxGeometry args={[W, mantleTop - MANTLE_BASE, D]} />
        <SectionMaterial glsl={MANTLE_GLSL} uniforms={mantleUniforms} cacheKey="hotspot-mantle" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const f = (t * 2.5 + i / 7) % 1;
        return (
          <mesh
            key={i}
            position={[
              PLUME_X + 0.05 * Math.sin(i * 2.4),
              MANTLE_BASE + 0.2 + f * (top - MANTLE_BASE - 0.2),
              D / 2 + 0.012,
            ]}
          >
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshBasicMaterial color="#ffd27a" toneMapped={false} />
          </mesh>
        );
      })}
      <group position={[shift, 0, 0]}>
        <mesh geometry={plate} castShadow receiveShadow>
          <TerrainMaterial
            attach="material-0"
            kind={continental ? "grass" : "rock"}
            color="#d2d2d2"
            vertexColors
          />
          <SectionMaterial
            attach="material-1"
            glsl={PLATE_GLSL}
            uniforms={plateUniforms}
            cacheKey="hotspot-plate"
          />
        </mesh>
        <PlantStand
          kind={continental ? "conifer" : "palm"}
          positions={trees}
          scale={continental ? 0.11 : 0.08}
          seed={continental ? 39 : 12}
        />
        {!continental && (
          <>
            <PlantStand kind="broadleaf" positions={forest} scale={0.035} seed={23} />
            <LavaFlow height={height} glow={dying} />
          </>
        )}
      </group>
      {!continental && (
        <>
          <mesh position={[0, SEA, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W, D]} />
            <FlowWaterMaterial color="#1a5d7a" opacity={0.5} flow={[0.3, 0.15]} speed={0.4} />
          </mesh>
          <mesh position={[0, (SEA + top - 0.05) / 2, D / 2]}>
            <planeGeometry args={[W, SEA - top + 0.05]} />
            <meshPhysicalMaterial
              color="#2a7896"
              transparent
              opacity={0.28}
              roughness={0.4}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
      {/* Active vent: a lava lake in the summit pit crater; on land, steam from the geysers. */}
      <pointLight
        position={[PLUME_X + shift + PIT.x, (continental ? top : height(PLUME_X, 0)) + 0.22, PIT.z]}
        color="#ff8a3a"
        intensity={continental ? 0 : 0.25 * dying}
        distance={0.35}
      />
      {!continental && dying > 0.02 && (
        <mesh
          position={[PLUME_X + shift + PIT.x, height(PLUME_X + PIT.x, PIT.z) + 0.004, PIT.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.034, 32]} />
          <meshStandardMaterial
            color="#d0461a"
            emissive="#ff6a1f"
            emissiveIntensity={1.6 * dying}
          />
        </mesh>
      )}
      {/* A new submarine volcano grows over the plume once the old island has been carried off. */}
      {!continental && newborn > 0.01 && (
        <group
          position={[PLUME_X, top, 0]}
          scale={[0.5 + 0.5 * newborn, newborn, 0.5 + 0.5 * newborn]}
        >
          <mesh castShadow>
            <latheGeometry args={[SEAMOUNT, 48]} />
            <meshStandardMaterial
              color="#2e2a28"
              emissive="#ff6a1f"
              emissiveIntensity={0.25 * newborn}
              roughness={0.9}
            />
          </mesh>
        </group>
      )}
      {continental && (
        <mesh
          position={[PLUME_X + shift + 0.04, top - 0.035, -0.05]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.2, 40]} />
          <FlowWaterMaterial color="#2c6f86" opacity={0.92} flow={[0.2, 0.1]} speed={0.3} />
        </mesh>
      )}
      {continental &&
        [0, 1, 2].map((i) => (
          <CloudVolume
            key={i}
            // Steam marks the hydrothermal area, which stays above the heat source.
            position={[
              PLUME_X + (shift < 0.4 ? shift : 0) - 0.15 + i * 0.14,
              top + 0.12 + i * 0.04,
              0.12 - i * 0.1,
            ]}
            scale={[0.07, 0.12, 0.07]}
            seed={i * 5 + 1}
            opacity={0.55}
          />
        ))}
      <Line
        points={[
          [PLUME_X, plateBase, D / 2 + 0.01],
          [PLUME_X, (continental ? top : SEA) + 0.05, D / 2 + 0.01],
        ]}
        color="#e3a46a"
        lineWidth={1.2}
        dashed
        dashSize={0.04}
        gapSize={0.03}
      />
      <Arrow
        from={[-1.4, (continental ? top : SEA) + 1.15, 0]}
        to={[1.6, (continental ? top : SEA) + 1.15, 0]}
        color="#d7bc88"
      />
      {!stacked && (
        <Tag
          pos={[0.1, (continental ? top : SEA) + 1.27 + tagLift, 0]}
          text={continental ? "Plate moves SW" : "Plate moves NW"}
          priority={2}
          note={
            continental
              ? "The North American Plate moves southwest relative to the Yellowstone heat source, so the active center appears to migrate northeast."
              : "The Pacific Plate moves northwest relative to the Hawaiian heat source, carrying each volcano away from the place where it formed."
          }
          occlude={false}
        />
      )}
      <Tag
        pos={[-2.2, (continental ? top : SEA) + 1.3 + tagLift, -0.6]}
        text={continental ? "Yellowstone · NE" : "Hawaiʻi · SE"}
        short={continental ? "Yellowstone" : "Hawaiʻi"}
        priority={3}
        note={
          continental
            ? "Young end of the Yellowstone volcanic track: a caldera with a lake, geysers and a magma reservoir in the crust. Older volcanic centers extend southwest along the flat basalt Snake River Plain."
            : "The southeastern end is the active shield volcano, the broadest and tallest on the track: thousands of thin, runny basalt flows build its gentle slopes. Black recent lava runs down the flank to the sea, a lava lake glows in the summit caldera, and rain forest grows on the wet northeast side. The caldera and flows are drawn larger than they really are. Kauaʻi, to the northwest, preserves rocks about 5–5.5 million years old."
        }
        occlude={false}
      />
      <Tag
        pos={[1.9, (continental ? top : SEA) + 0.85 + tagLift, 0.6]}
        text={continental ? "Older · SW" : "Older · NW"}
        short="Older"
        note={
          continental
            ? "The southwest end of the recognized Yellowstone track reaches roughly 17 Ma. Older calderas are buried by later basalt; these depressions are symbols, not surveyed caldera outlines."
            : "Moving away from the plume, islands cool, sink and erode: green valleys, then a coral atoll ring around a lagoon, then a drowned flat-topped seamount. Shapes are illustrative, not real coastlines."
        }
        occlude={false}
      />
      {!continental && !stacked && newborn > 0.5 && (
        <Tag
          pos={[PLUME_X, top + 0.45 + tagLift * 0.5, 0]}
          text="New seamount"
          tone="magma"
          note="Fresh eruptions build a new submarine volcano above the plume, as Kamaʻehuakanaloa (Lōʻihi) is doing southeast of the Island of Hawaiʻi today."
          occlude={false}
        />
      )}
      {!continental && !stacked && (
        <Tag
          pos={[PLUME_X + 3 * SPACING + shift, SEA + 0.25 + tagLift * 0.5, 0]}
          text="Atoll"
          tone="glacier"
          note="Coral reefs keep growing upward at sea level while the extinct volcano beneath them subsides, leaving a ring of reef around a lagoon."
          occlude={false}
        />
      )}
      <Tag
        pos={[PLUME_X - 0.75, -1.2, D / 2 + 0.05]}
        text="Mantle plume"
        priority={1}
        tone="magma"
        note="In the plume hypothesis, hot but mostly solid mantle rises slowly. Partial melting near the top feeds magma up through the plate; it is not a hollow pipe or a column of liquid magma. Geometry and colors are schematic."
        occlude={false}
      />
    </group>
  );
}

export default function Hotspots() {
  const { params, t } = useLabState("params", "t");
  useLabTick(1 / 30);
  const hawaii = params.hawaii > 0.5,
    yellowstone = params.yellowstone > 0.5,
    both = hawaii && yellowstone;
  return (
    <>
      <ScienceStudio
        slug="hotspots"
        camera={[2.4, 3.6, 7.6]}
        scale="Separate hotspot sections · track directions are real · relief, plate and plume not to scale"
        trueScale="No true depth or distance scale · plate thickness and plume are schematic"
      >
        {hawaii && <Track setting={OCEAN} z={both ? -1.25 : 0} t={t} stacked={both} />}
        {yellowstone && <Track setting={LAND} z={both ? 1.25 : 0} t={t} stacked={both} />}
        {!hawaii && !yellowstone && (
          <Tag
            pos={[0, 0, 0]}
            text="Choose a hotspot"
            note="Enable Hawaiʻi or Yellowstone in the controls to compare an oceanic and a continental setting."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {hawaii
          ? "Hawaiʻi's volcanic islands become older toward the northwest; Kauaʻi's rocks are about 5–5.5 million years old. "
          : ""}
        {yellowstone
          ? "Yellowstone's volcanic track goes back about 17 million years, with older sites toward the southwest. "
          : ""}
        {!hawaii && !yellowstone
          ? "Select Hawaiʻi, Yellowstone or both to compare their volcanic tracks."
          : "Press Play to follow plate motion above each hotspot."}{" "}
        <br />
        {
          "Here the plume is held still and the plate moves over it at no set speed. The arrow shows plate motion: right is northwest for Hawaiʻi and southwest for Yellowstone."
        }
      </ScienceReadout>
    </>
  );
}
