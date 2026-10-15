import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial, useSectionUniforms } from "../shared/section-material";
import { fbm } from "../shared/hazard-parts";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";

const W = 6,
  D = 2,
  PLUME_X = -1.8,
  SPACING = 0.88,
  SEA = 0.2,
  MANTLE_BASE = -1.85;

type Setting = {
  continental: boolean;
  top: number;
  plateBase: number;
};
const OCEAN: Setting = { continental: false, top: -0.16, plateBase: -0.62 };
const LAND: Setting = { continental: true, top: 0.42, plateBase: -0.78 };

/** Plate-surface heights in the plate's own frame; volcano i sits at PLUME_X + i·SPACING. */
function plateHeight(s: Setting) {
  return (x: number, z: number) => {
    const roll = 0.03 * (fbm(x * 1.4 + 5, z * 1.4) - 0.5) + 0.012 * (fbm(x * 5, z * 5) - 0.5);
    let h = s.top + roll;
    for (let i = 0; i < 5; i++) {
      const dx = x - (PLUME_X + i * SPACING),
        r = Math.hypot(dx, z),
        a = Math.atan2(z, dx);
      if (s.continental) {
        // Calderas: the youngest is a sharp, lake-filled crater with a raised rim; older ones are
        // buried under the flat basalt plain that the track leaves behind.
        const fresh = [1, 0.55, 0.3, 0.18, 0.1][i],
          rad = 0.32 + 0.02 * i;
        h +=
          fresh * (0.06 * Math.exp(-(((r - rad) / 0.07) ** 2)) - 0.1 * Math.exp(-((r / rad) ** 4)));
      } else {
        const peak = [1.05, 0.8, 0.52, 0.37, 0.27][i],
          rad = 0.36 + 0.035 * i,
          gullies = i === 0 ? 0 : (0.05 + 0.04 * i) * Math.max(0, Math.sin(a * 9 + i * 1.7)) ** 3,
          shield = peak * Math.exp(-((r / rad) ** 2)) * (1 - gullies * Math.min(1, r / 0.15));
        if (i === 3) {
          // Atoll: the volcano has sunk; a coral ring at sea level encloses a shallow lagoon.
          const mound = 0.33 * Math.exp(-((r / 0.34) ** 2)),
            reef = 0.05 * Math.exp(-(((r - 0.21) / 0.04) ** 2));
          h += Math.min(mound, 0.33) + reef;
        } else if (i === 4) h += Math.min(0.23, 0.46 * Math.exp(-((r / 0.34) ** 2)));
        else h += shield - (i === 0 ? 0.05 * Math.exp(-((r / 0.05) ** 2)) : 0);
      }
    }
    if (s.continental) {
      // Mountain ranges flank the plain on both sides.
      const ridge = Math.max(0, Math.abs(z) - 0.62);
      h += 0.5 * ridge ** 1.4 * (0.7 + 0.6 * fbm(x * 2.2, z * 3));
    }
    return h;
  };
}

function paint(g: THREE.BufferGeometry, s: Setting) {
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3),
    col = new THREE.Color(),
    tone = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      n = fbm(x * 4 + 1, z * 4);
    const nearest = Math.round((x - PLUME_X) / SPACING),
      k = THREE.MathUtils.clamp(nearest, 0, 4),
      r = Math.hypot(x - (PLUME_X + k * SPACING), z);
    if (s.continental) {
      col.set("#6f7f4e").lerp(tone.set("#9a8f6a"), n * 0.7);
      if (Math.abs(z) < 0.6 && x > PLUME_X + 0.45) col.lerp(tone.set("#8e8a6f"), 0.6);
      if (Math.abs(z) > 0.66) col.lerp(tone.set("#3f5a36"), 0.75);
      if (Math.abs(z) > 0.92 && y > s.top + 0.12) col.lerp(tone.set("#c9c7c0"), 0.6);
      if (k === 0 && r < 0.3) col.lerp(tone.set("#c8b48a"), 0.5);
    } else if (y < SEA - 0.1) {
      col.set("#3c4b55").lerp(tone.set("#5b6667"), n);
    } else if (y < SEA - 0.006) {
      col.set("#7ec3b5").lerp(tone.set("#cfe0c6"), n * 0.6);
    } else if (y < SEA + 0.03) {
      col.set(k === 0 ? "#2b2826" : "#e2d6b2");
    } else if (k === 0) {
      col.set("#2e2a28").lerp(tone.set("#4a3f38"), n);
    } else {
      col.set("#4f7a3c").lerp(tone.set("#6d8f45"), n);
      if (k === 2) col.lerp(tone.set("#7b6a52"), THREE.MathUtils.smoothstep(n, 0.55, 0.8));
    }
    if (y < s.plateBase + 1e-3) col.set("#555");
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
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

/** Asthenosphere with the plume head and stem, coloured by an illustrative temperature. */
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

function Track({ setting, z, t }: { setting: Setting; z: number; t: number }) {
  const { continental, top, plateBase } = setting;
  const height = useMemo(() => plateHeight(setting), [setting]);
  const plate = useMemo(() => {
    const g = terrainBlockGeometry(height, W, D, 220, plateBase);
    paint(g, setting);
    return g;
  }, [height, setting, plateBase]);
  useEffect(() => () => plate.dispose(), [plate]);
  const shift = t * 0.65;
  const plateUniforms = useSectionUniforms({
    uContinental: continental ? 1 : 0,
    uTop: top,
    uBase: plateBase,
    uPlume: PLUME_X,
  });
  const mantleUniforms = useSectionUniforms({ uPlume: PLUME_X, uTop: plateBase, uTime: t * 6 });
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < (continental ? 110 : 70) && i < 2000; i++) {
      const x = -W / 2 + 0.1 + (W - 0.2) * ((i * 0.618034) % 1),
        zz = -D / 2 + 0.08 + (D - 0.16) * ((i * 0.7548777) % 1),
        y = height(x, zz),
        k = Math.round((x - PLUME_X) / SPACING),
        ok = continental
          ? Math.abs(zz) > 0.64 && Math.abs(zz) < 0.95 && fbm(x * 3, zz * 3) > 0.42
          : (k === 1 || k === 2) && y > SEA + 0.05 && y < SEA + 0.5;
      if (ok) out.push([x, y - 0.004, zz]);
    }
    return out;
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
      {/* Active vent: lava lake glow and, on land, steam from the geyser basin. */}
      <pointLight
        position={[PLUME_X + shift, (continental ? top : SEA + 0.9) + 0.25, 0]}
        color="#ff8a3a"
        intensity={continental ? 0 : 1.2}
        distance={1.4}
      />
      {!continental && (
        <mesh
          position={[PLUME_X + shift, height(PLUME_X, 0) + 0.006, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.05, 24]} />
          <meshStandardMaterial color="#d0461a" emissive="#ff6a1f" emissiveIntensity={1.6} />
        </mesh>
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
            position={[PLUME_X + shift - 0.15 + i * 0.14, top + 0.12 + i * 0.04, 0.12 - i * 0.1]}
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
      <Tag
        pos={[-2.2, (continental ? top : SEA) + 1.3, -0.6]}
        text={continental ? "Yellowstone · NE" : "Hawaiʻi · SE"}
        note={
          continental
            ? "Young end of the Yellowstone volcanic track: a caldera with a lake, geysers and a magma reservoir in the crust. Older volcanic centres extend southwest along the flat basalt Snake River Plain."
            : "The southeastern end includes active Hawaiian volcanism: young black lava, a glowing summit and no forest yet. Kauaʻi, to the northwest, preserves rocks about 5–5.5 million years old."
        }
        occlude={false}
      />
      <Tag
        pos={[1.9, (continental ? top : SEA) + 0.85, 0.6]}
        text={continental ? "Older · SW" : "Older · NW"}
        note={
          continental
            ? "The southwest end of the recognised Yellowstone track reaches roughly 17 Ma. Older calderas are buried by later basalt; these depressions are symbols, not surveyed caldera outlines."
            : "Moving away from the plume, islands cool, sink and erode: green valleys, then a coral atoll ring around a lagoon, then a drowned flat-topped seamount. Shapes are illustrative, not real coastlines."
        }
        occlude={false}
      />
      {!continental && (
        <Tag
          pos={[PLUME_X + 3 * SPACING + shift, SEA + 0.25, 0]}
          text="Atoll"
          tone="glacier"
          note="Coral reefs keep growing upwards at sea level while the extinct volcano beneath them subsides, leaving a ring of reef around a lagoon."
          occlude={false}
        />
      )}
      <Tag
        pos={[PLUME_X - 0.75, -1.2, D / 2 + 0.05]}
        text="Mantle plume"
        tone="magma"
        note="In the plume hypothesis, hot but mostly solid mantle rises slowly. Partial melting near the top feeds magma up through the plate; it is not a hollow pipe or a column of liquid magma. Geometry and colours are schematic."
        occlude={false}
      />
    </group>
  );
}

export default function Hotspots() {
  const { params, t } = useLabControls();
  useLabTick(1 / 30);
  const hawaii = params.hawaii > 0.5,
    yellowstone = params.yellowstone > 0.5,
    both = hawaii && yellowstone;
  return (
    <>
      <ScienceStudio
        slug="hotspots"
        camera={[2.4, 3.6, 7.6]}
        scale="Separate hotspot sections · compass directions are real · relief, plate and plume not to scale"
        trueScale="No true depth or distance scale · plate thickness and plume are schematic"
      >
        {hawaii && <Track setting={OCEAN} z={both ? -1.25 : 0} t={t} />}
        {yellowstone && <Track setting={LAND} z={both ? 1.25 : 0} t={t} />}
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
          ? "Hawaiʻi's volcanic islands become older towards the northwest; Kauaʻi’s rocks are about 5–5.5 million years old. "
          : ""}
        {yellowstone
          ? "Yellowstone's volcanic track extends about 17 Ma into the past, with older sites towards the southwest. "
          : ""}
        {!hawaii && !yellowstone
          ? "Select Hawaiʻi, Yellowstone or both to compare their volcanic tracks."
          : "Press Play to follow plate motion above each hotspot."}
        <br />
        {
          "Here the plume is held still and the plate moves over it at no set speed. Right is northwest for Hawaiʻi and southwest for Yellowstone."
        }
      </ScienceReadout>
    </>
  );
}
