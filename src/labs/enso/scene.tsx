import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabState } from "@/lib/store/lab-controls";
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
import { CloudVolume, RainStreaks } from "../atmosphere-layers/weather-volumes";
import { FlowStreaks } from "../thermal-circulation/air";
import { cellPoint, type Cell } from "../thermal-circulation/cell";
import { SeaSurface } from "./sea-surface";
import { SST_GRADIENT } from "./sst";
export default function Enso() {
  const { params, trueScale } = useLabState("params", "trueScale");
  useLabTick(1 / 35);
  const c = ensoSection(params.enso ?? 0),
    f = (trueScale ? 1 : 10000) / 3000000,
    west = -c.westDepth * f,
    east = -c.eastDepth * f,
    bottom = -500 * f;
  const left = c.ascentX,
    right = 2.2,
    center = (left + right) / 2;
  // The schematic Walker loop: rising over the warmest water, sinking over the cool east.
  const walker: Cell[] = [{ rise: left, sink: right, bottom: 0.35, top: 1.65 }];
  return (
    <>
      <ScienceStudio
        slug="enso"
        camera={[1.3, 3.1, 6.6]}
        scale="Ocean depths ×10,000 · 15,000 km section · atmospheric loop and coastal relief schematic"
        trueScale="Ocean uses 1 scene unit = 3000 km · atmospheric arrows and coastal relief remain schematic"
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
          color="#356486"
        />
        <WaterPrism
          points={[
            [-2.5, 0],
            [2.5, 0],
            [2.5, east],
            [-2.5, west],
          ]}
          color="#c98a64"
          colour2={`hsl(${24 + 16 * (1 - (c.eastTemperature - 21) / 8)},40%,55%)`}
          opacity={0.85}
        />
        <SeaSurface west={c.westTemperature} east={c.eastTemperature} trade={c.tradeStrength} />
        {/* West: Indonesia / Australia; east: South America with the Andes. */}
        <LandBlock side="west" base={bottom} />
        <LandBlock side="east" base={bottom} />
        <Tag
          pos={[-2.78, 0.45, 0.85]}
          text="Indonesia · Australia"
          short="Indonesia"
          priority={1}
          note="The western Pacific warm pool normally brings heavy rain here. During El Niño the rain shifts east and drought becomes more likely."
          occlude={false}
        />
        <Tag
          pos={[2.85, 0.95, 0.85]}
          text="Peru · Andes"
          short="Peru"
          priority={1}
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
        {/* Deep convection over the warmest water: a cluster of towering storm clouds. */}
        {(
          [
            [0, 1.38, 0, 0.62, 0.55, 0.75, 4],
            [-0.42, 1.12, -0.38, 0.4, 0.42, 0.45, 7],
            [0.38, 1.18, 0.36, 0.38, 0.46, 0.45, 9],
          ] as const
        ).map(([dx, y, z, sx, sy, sz, seed]) => (
          <group key={seed}>
            <CloudVolume
              position={[left + dx, y, z]}
              scale={[sx, sy, sz]}
              density={seed === 4 ? 90 : 60}
              seed={seed}
            />
            <RainStreaks
              position={[left + dx, y - sy * 0.35, z]}
              width={sx * 1.1}
              depth={sz * 1.2}
              height={y - sy * 0.35 - 0.02}
              count={seed === 4 ? 80 : 36}
            />
          </group>
        ))}
        <FlowStreaks
          cells={walker}
          strength={Math.min(1, 0.25 + 0.55 * c.tradeStrength)}
          lanes={[-0.45, 0.45]}
        />
        <Line
          points={[
            [-2.5, west, 0.82],
            [2.5, east, 0.82],
          ]}
          color="#e1c99d"
          lineWidth={2}
        />
        {[0.02, 0.27, 0.52, 0.77].map((u) => (
          <Arrow
            key={u}
            from={cellPoint(walker[0], u, 0.82)}
            to={cellPoint(walker[0], u + 0.045, 0.82)}
            color="#a3d3dc"
            width={1}
          />
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
          short="Convection"
          note="A schematic Walker circulation. In El Niño the main rising air shifts toward the central Pacific and the easterly trade winds weaken. Real events differ in strength and location."
          occlude={false}
        />
        <Tag
          pos={[center, 0.3, 0.3]}
          text="← Trade winds"
          priority={2}
          note="The lower branch of the schematic Walker loop: easterly surface trade winds blow from east to west and push warm surface water toward the west. They weaken in El Niño and strengthen in La Niña."
          occlude={false}
        />
        <Tag
          pos={[-0.9, west + ((east - west) * 1.6) / 5, 0.85]}
          text="Thermocline"
          priority={1}
          note="The gold line marks an idealized thermocline, the sharp boundary between warm upper water and colder deep water. Its depth is enlarged ×10,000 unless Physical scale is on."
          occlude={false}
        />
        <Tag
          pos={[-2.1, 0.06, 1.15]}
          text={`West · ${c.westTemperature.toFixed(1)} °C`}
          note="Idealized western equatorial Pacific, toward Indonesia. Temperatures are set teaching values, not observations."
          occlude={false}
        />
        <Tag
          pos={[2.1, 0.06, 1.15]}
          text={`East · ${c.eastTemperature.toFixed(1)} °C`}
          note="Idealized eastern equatorial Pacific, toward South America. Stronger trades usually favor a shallower eastern thermocline and stronger cold-water upwelling."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {c.phase} {"· thermocline west "}
        {c.westDepth.toFixed(0)} {"m / east "}
        {c.eastDepth.toFixed(0)}{" "}
        {"m. Gold: idealized thermocline; amber: warmer upper water; blue: colder water."}{" "}
        <span className="whitespace-nowrap">
          {"Sea surface 20 °C "}
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-24 rounded-sm align-middle"
            style={{ background: SST_GRADIENT }}
          />
          {" 30 °C, isotherms every 1 °C."}
        </span>
        <br />
        {
          "The ENSO slider picks a set state; Play only moves the air and does not show years or a forecast. Teleconnections shift the odds (El Niño winters are more often wet across the southern United States) but do not decide any particular season."
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
    const center = (from + to) / 2,
      g = terrainBlockGeometry((x, z) => height(x + center, z), to - from, 1.6, 90, base);
    g.translate(center, 0, 0);
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
