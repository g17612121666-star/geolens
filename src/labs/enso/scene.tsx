import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ensoSection } from "@/lib/ocean-circulation-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { WaterPrism } from "../shared/water-prism";
import { RockPrism } from "../shared/rock-prism";
import { SectionMaterial } from "../shared/section-material";

const LAND_GLSL = `
vec3 sectionColour(vec3 p,vec3 w){
  float g=grain(w.xy*2.+w.zy*2.),bed=fract(w.y*14.+w.z*.3);
  vec3 c=bed<.6?mix(vec3(.74,.62,.48),vec3(.64,.53,.40),g):mix(vec3(.55,.50,.46),vec3(.46,.42,.40),g);
  return c*mix(.78,1.,smoothstep(0.,.04,min(bed,abs(bed-.6))));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { fbm } from "../shared/hazard-utils";
import { Tag } from "../shared/kit";
import { OceanSurface } from "../shared/ocean-section";
import { CloudVolume, RainStreaks, FlowFilaments } from "../atmosphere-layers/weather-volumes";
export default function Enso() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 35);
  const c = ensoSection(params.enso ?? 0),
    f = (trueScale ? 1 : 10000) / 3000000,
    west = -c.westDepth * f,
    east = -c.eastDepth * f,
    bottom = -500 * f;
  const left = c.ascentX,
    right = 2.2,
    centre = (left + right) / 2,
    radius = (right - left) / 2;
  const air = (u: number): [number, number, number] => [
    centre + radius * Math.cos(u),
    0.35 + 0.65 * (1 + Math.sin(u)),
    0,
  ];
  return (
    <>
      <ScienceStudio
        slug="enso"
        camera={[1.3, 2.1, 7]}
        scale="Ocean depths ×10,000 · 15,000 km section · atmospheric loop schematic"
        trueScale="Ocean uses 1 scene unit = 3000 km · atmospheric arrows remain schematic"
      >
        <RockPrism
          points={[
            [-2.5, bottom],
            [2.5, bottom],
            [2.5, bottom - 0.12],
            [-2.5, bottom - 0.12],
          ]}
          depth={1.6}
          color="#8a806c"
        />
        <WaterPrism
          points={[
            [-2.5, west - 0.25 * f],
            [2.5, east - 0.25 * f],
            [2.5, bottom],
            [-2.5, bottom],
          ]}
          colour="#356486"
        />
        <WaterPrism
          points={[
            [-2.5, 0],
            [2.5, 0],
            [2.5, east],
            [-2.5, west],
          ]}
          colour="#c98a64"
          colour2={`hsl(${24 + 16 * (1 - (c.eastTemperature - 21) / 8)},40%,55%)`}
          opacity={0.85}
        />
        <OceanSurface
          points={[
            [-2.5, 0],
            [2.5, 0],
          ]}
          flow={[-c.tradeStrength, 0]}
          opacity={0.35}
        />
        {/* West: Indonesia / Australia; east: South America with the Andes. */}
        <LandBlock side="west" base={bottom} />
        <LandBlock side="east" base={bottom} />
        <Tag
          pos={[-2.78, 0.45, 0.85]}
          text="Indonesia · Australia"
          note="The western Pacific warm pool normally brings heavy rain here. During El Niño the rain shifts east and drought becomes more likely."
          occlude={false}
        />
        <Tag
          pos={[2.85, 0.95, 0.85]}
          text="Peru · Andes"
          note="Trade winds push surface water west, so cold, nutrient-rich water upwells off Peru. Weaker trades in El Niño reduce this upwelling and warm the coastal sea."
          occlude={false}
        />
        {[2.05, 2.25, 2.42].map((x, k) => (
          <Arrow
            key={`up-${k}`}
            from={[x, bottom * 0.55, 0.5 - k * 0.5]}
            to={[x, -0.03, 0.5 - k * 0.5]}
            color="#5fb7d6"
            width={0.4 + 1.0 * Math.max(0, c.upwelling)}
          />
        ))}
        <CloudVolume position={[left, 1.38, 0]} scale={[0.62, 0.55, 0.75]} density={90} seed={4} />
        <RainStreaks
          t={t}
          position={[left, 1.2, 0]}
          width={0.7}
          depth={0.9}
          height={0.65}
          count={80}
        />
        <FlowFilaments
          paths={Array.from({ length: 4 }, (_, k) =>
            Array.from({ length: 81 }, (_, i) => {
              const p = air((-i / 80) * Math.PI * 2);
              return [p[0], p[1], -0.5 + k / 3] as [number, number, number];
            }),
          )}
          t={t}
          speed={c.tradeStrength}
          color="#c9dedb"
        />
        <Line
          points={[
            [-2.5, west, 0.82],
            [2.5, east, 0.82],
          ]}
          color="#e1c99d"
          lineWidth={2}
        />
        <Line
          points={Array.from({ length: 81 }, (_, i) => air((i / 80) * Math.PI * 2))}
          color="#91b9c7"
          transparent
          opacity={0.65}
        />
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((u) => (
          <Arrow key={u} from={air(u)} to={air(u - 0.22)} color="#a3d3dc" width={1} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={air(-(i / 12 + t * c.tradeStrength) * 2 * Math.PI)}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshBasicMaterial color="#b3dbe0" />
          </mesh>
        ))}
        {!trueScale && (
          <Arrow
            from={[2, -400 * f, 0.86]}
            to={[2, -(400 - 250 * c.upwelling) * f, 0.86]}
            color="#82cbd7"
            width={1}
          />
        )}
        <Tag
          pos={[left, 1.95, 0]}
          text="Convection shifts with warm water"
          note="A schematic Walker circulation. In El Niño the main rising air shifts towards the central Pacific and the easterly trade winds weaken. Real events differ in strength and location."
          occlude={false}
        />
        <Tag
          pos={[-2.1, 0.06, 1.15]}
          text={`West · ${c.westTemperature.toFixed(1)} °C`}
          note="Idealised western equatorial Pacific, towards Indonesia. Temperatures are set teaching values, not observations."
          occlude={false}
        />
        <Tag
          pos={[2.1, 0.06, 1.15]}
          text={`East · ${c.eastTemperature.toFixed(1)} °C`}
          note="Idealised eastern equatorial Pacific, towards South America. Stronger trades usually favour a shallower eastern thermocline and stronger cold-water upwelling."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {c.phase} {"· thermocline west "}
        {c.westDepth.toFixed(0)} {"m / east "}
        {c.eastDepth.toFixed(0)}{" "}
        {"m. Gold: idealised thermocline; amber: warmer upper water; blue: colder water."}
        <br />
        {
          "The ENSO slider picks a set state; Play only moves the tracers and does not show years or a forecast. Teleconnections change the odds but do not decide a particular UK winter."
        }
      </ScienceReadout>
    </>
  );
}

/** Coastal landscapes at each end: forested islands in the west, a dry coast rising to the
 * snow-capped Andes in the east. Relief is hugely exaggerated and illustrative. */
function LandBlock({ side, base }: { side: "west" | "east"; base: number }) {
  const west = side === "west",
    from = west ? -3.05 : 2.5,
    to = west ? -2.5 : 3.15;
  const height = useMemo(
    () => (x: number, z: number) => {
      const u = (x - from) / (to - from);
      return west
        ? 0.04 + 0.16 * fbm(x * 5 + 1, z * 3) * (0.6 + 0.4 * Math.sin(z * 4 + 1) ** 2) - 0.05 * u
        : 0.04 +
            0.62 * Math.exp(-(((u - 0.68) / 0.24) ** 2)) * (0.85 + 0.3 * fbm(z * 4, x * 4)) +
            0.02 * u;
    },
    [west, from, to],
  );
  const geometry = useMemo(() => {
    const centre = (from + to) / 2,
      g = terrainBlockGeometry((x, z) => height(x + centre, z), to - from, 1.6, 90, base);
    g.translate(centre, 0, 0);
    const p = g.attributes.position,
      col = new Float32Array(p.count * 3),
      c = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (west) c.set("#3f6b35").lerp(tone.set("#5d8a45"), fbm(p.getX(i) * 6, p.getZ(i) * 6));
      else {
        c.set("#b59a6e").lerp(tone.set("#8a7a62"), THREE.MathUtils.smoothstep(y, 0.15, 0.35));
        if (y > 0.5) c.lerp(tone.set("#f0f3f3"), THREE.MathUtils.smoothstep(y, 0.5, 0.58));
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [height, from, to, base, west]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const trees = useMemo(() => {
    if (!west) return [];
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 40 && i < 500; i++) {
      const x = from + 0.03 + (to - from - 0.06) * ((i * 0.618034) % 1),
        z = -0.75 + 1.5 * ((i * 0.7548777) % 1);
      if (height(x, z) > 0.06) out.push([x, height(x, z) - 0.004, z]);
    }
    return out;
  }, [west, height, from, to]);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
        <SectionMaterial attach="material-1" glsl={LAND_GLSL} cacheKey="enso-land-v1" />
      </mesh>
      <PlantStand kind="palm" positions={trees} scale={0.07} seed={5} />
    </group>
  );
}
