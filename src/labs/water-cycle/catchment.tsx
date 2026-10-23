import { useEffect, useMemo } from "react";
import { GuideLine as Line } from "../shared/guide-line";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Tag, InspectHotspot } from "../shared/kit";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { WaterRibbon, GrassPatch, RootNetwork, PoreMarkers } from "../shared/geomorphic-terrain";
import { SectionMaterial } from "../shared/section-material";
import { farmland } from "../shared/hazard-utils";

/** Cut faces: dry soil above the water table, a thin capillary fringe, wet saturated ground (the
 * groundwater store) below it, then bedrock; a sandy seabed under the ocean. The water table
 * rises inland and meets sea level at the coast, so groundwater can drain to the sea. Schematic. */
const GROUND_GLSL = `
vec3 sectionColour(vec3 p,vec3 w){
  float y=w.y+.5,g=grain(w.xy+w.zy);
  vec2 q=(w.xy+w.zy)*22.;
  float pore=smoothstep(.35,.15,length(fract(q)-.5));
  if(y<-.55)return mix(vec3(.46,.44,.44),vec3(.36,.35,.36),g);
  if(w.x>1.12)return mix(vec3(.82,.74,.56),vec3(.72,.64,.47),step(.5,fract(y*30.)))*(.9+.2*g);
  float wt=.12*clamp((1.1-w.x)/3.8,0.,1.);
  if(y<wt)return mix(mix(vec3(.46,.58,.62),vec3(.36,.47,.52),g),vec3(.52,.72,.80),pore*.35);
  if(y<wt+.06)return mix(vec3(.62,.62,.55),vec3(.52,.55,.50),g);
  return mix(vec3(.74,.62,.44),vec3(.60,.48,.33),g);
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
import { landscapeRandom as random } from "../shared/landscape-noise";
type Point = [number, number, number];
/** Water-table height (group space): 0 at the coast (sea level), rising gently inland. */
function waterTable(x: number) {
  return 0.12 * Math.max(0, Math.min(1, (1.1 - x) / 3.8));
}
// The valley falls towards +x; transverse slopes are zero on the bounding ridges.
function originalHeight(x: number, z: number) {
  const u = Math.max(0, Math.min(1, (1.1 - x) / 3.8));
  return 0.06 + 0.65 * u * (2 - u) + 0.55 * Math.sin((z * Math.PI) / 3.4) ** 2;
}
const lakeCentre: Point = [0.3, originalHeight(0.3, -0.65) - 0.035, -0.65];
function lakeRadius(a: number) {
  return 1 + 0.08 * Math.sin(a * 3 + 0.4) + 0.045 * Math.cos(a * 5 - 1);
}
function height(x: number, z: number) {
  const dx = (x - 0.3) / 0.43,
    dz = (z + 0.65) / 0.32,
    r = Math.hypot(dx, dz) / lakeRadius(Math.atan2(dz, dx)),
    // Embankment ring: the reservoir sits on a valley side, so its downhill rim is built up
    // above the water line (like the bunded reservoirs of the Thames valley).
    bund = lakeCentre[1] + 0.025 - 0.6 * Math.max(0, Math.abs(r - 1.2) - 0.04);
  if (r >= 1.25) return Math.max(originalHeight(x, z), bund);
  const edge = Math.max(0, Math.min(1, (r - 0.3) / 0.95)),
    blend = edge * edge * (3 - 2 * edge);
  return Math.max(THREE.MathUtils.lerp(lakeCentre[1] - 0.18, originalHeight(x, z), blend), bund);
}
function ReservoirSurface({ abstraction }: { abstraction: number }) {
  const geometry = useMemo(() => {
    // A 0.08 drop leaves about 40% of the bowl volume, matching 4,000 of 10,000 m³.
    const y = lakeCentre[1] - 0.08 * abstraction,
      p = [0.3, y, -0.65],
      indices: number[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      let lo = 0,
        hi = 1.25 * lakeRadius(a);
      for (let j = 0; j < 18; j++) {
        const r = (lo + hi) / 2;
        height(0.3 + 0.43 * r * Math.cos(a), -0.65 + 0.32 * r * Math.sin(a)) < y
          ? (lo = r)
          : (hi = r);
      }
      p.push(0.3 + 0.43 * lo * Math.cos(a), y, -0.65 + 0.32 * lo * Math.sin(a));
      if (i > 0) indices.push(0, i + 1, i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        Array.from({ length: p.length / 3 }, (_, i) => [p[i * 3], p[i * 3 + 2]]).flat(),
        2,
      ),
    );
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [abstraction]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <FlowWaterMaterial color="#67aac2" opacity={0.96} speed={0.15} />
    </mesh>
  );
}
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const paths: { name: string; points: Point[]; color: string; note: string }[] = [
  {
    name: "Evaporation",
    points: [
      [2, 0.02, 0.4],
      [2.2, 0.9, 0.4],
      [1.5, 2, 0.4],
    ],
    color: "#e9c18a",
    note: "Liquid water becomes invisible water vapour, mainly using energy from the Sun. Clouds are droplets or ice, not vapour.",
  },
  {
    name: "Atmospheric transport",
    points: [
      [1.5, 2, 0.4],
      [0, 2.2, 0.4],
      [-1.5, 2, 0.4],
    ],
    color: "#b9d8e6",
    note: "Wind carries water vapour and cloud droplets. The arrow shows direction only, not a measured wind.",
  },
  {
    name: "Precipitation",
    points: [
      [-1.5, 2, 0.4],
      [-1.5, 1.3, 0.4],
      [-1.5, height(-1.5, 0.4), 0.4],
    ],
    color: "#7fccea",
    note: "Rain or snow falls from clouds. Vegetation intercepts some precipitation.",
  },
  {
    name: "Surface runoff",
    points: Array.from({ length: 25 }, (_, i): Point => {
      const x = -2.1 + (3.6 * i) / 24;
      return [x, x > 1.1 ? 0.03 : height(x, 0) + 0.025, 0];
    }),
    color: "#86d6e9",
    note: "Overland flow and rivers carry water downhill towards the outlet. Divides separate surface catchments.",
  },
  {
    name: "Infiltration",
    // Drawn on the front cut face so it stays visible: surface down to the water table.
    points: [
      [-1.6, height(-1.6, 1.7) + 0.01, 1.72],
      [-1.6, 0.5, 1.72],
      [-1.6, waterTable(-1.6), 1.72],
    ],
    color: "#72bcce",
    note: "Water soaks into the soil. Percolation then carries it down through the unsaturated zone to the water table.",
  },
  {
    name: "Groundwater flow",
    // Below the water table on the front cut face, draining towards the coast.
    points: [
      [-1.6, waterTable(-1.6) - 0.12, 1.72],
      [-0.3, -0.1, 1.72],
      [1.1, -0.08, 1.72],
    ],
    color: "#509ca9",
    note: "Groundwater flows slowly from high to low hydraulic head through pores and fractures, not through open caverns.",
  },
  {
    name: "Transpiration",
    points: [
      [-1, 0.9, -0.8],
      [-0.8, 1.5, -0.8],
      [-0.2, 2, -0.8],
    ],
    color: "#9ac794",
    note: "Roots take up soil water and leaves release it as water vapour through tiny pores called stomata.",
  },
  {
    name: "Snowmelt",
    points: [
      [-2.35, height(-2.35, 1.2) + 0.04, 1.2],
      [-1.9, height(-1.9, 0.8) + 0.04, 0.8],
      [-1.4, height(-1.4, 0) + 0.04, 0],
    ],
    color: "#dbe8e9",
    note: "Snow and ice store water. Melting changes it to liquid, which can infiltrate or run off.",
  },
];
function Transfer({
  path,
  index,
  selected,
}: {
  path: (typeof paths)[number];
  index: number;
  selected: boolean;
}) {
  const t = useLabControls((s) => s.t),
    curve = useMemo(
      () => new THREE.CatmullRomCurve3(path.points.map((p) => new THREE.Vector3(...p))),
      [path],
    );
  const pts = useMemo(() => curve.getPoints(64), [curve]),
    p = curve.getPoint((t + index * 0.13) % 1);
  return (
    <InspectHotspot name={path.name} note={path.note}>
      <Line
        points={pts}
        color={path.color}
        lineWidth={selected ? 4 : 1.4}
        transparent
        opacity={selected ? 1 : 0.45}
      />
      {selected && (
        <Arrow
          from={curve.getPoint(0.86).toArray()}
          to={curve.getPoint(1).toArray()}
          color={path.color}
          width={0.7}
        />
      )}
      <mesh position={p}>
        <sphereGeometry args={[selected ? 0.045 : 0.025, 12, 12]} />
        <meshBasicMaterial color={path.color} />
      </mesh>
    </InspectHotspot>
  );
}
export default function WaterCycle() {
  const { params, t } = useLabControls();
  useLabTick(1 / 20);
  const abstraction = params.abstraction ?? 0,
    basin = params.basin > 0.5,
    focus = Math.round(params.transfer ?? 3),
    path = paths[focus];
  const terrain = useMemo(() => {
    const g = terrainBlockGeometry((x, z) => height(x - 0.8, z), 3.8, 3.4, 160);
    g.translate(-0.8, 0, 0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      col.copy(farmland(x * 1.4, z * 1.4, 0.34));
      col.lerp(tone.set("#4f6b3c"), THREE.MathUtils.smoothstep(y, 0.3, 0.45) * 0.7);
      col.lerp(tone.set("#8a7b5c"), THREE.MathUtils.smoothstep(y, 0.6, 0.8) * 0.8);
      if (x > 0.95) col.lerp(tone.set("#ddcda3"), 0.8);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useEffect(() => () => terrain.dispose(), [terrain]);
  // Pore-water dots fill the saturated zone, up to the water table.
  const pores = useMemo(
    () =>
      Array.from({ length: 88 }, (_, i): Point => [
        -2.5 + (i % 11) * 0.32,
        -0.51 + Math.floor(i / 11) * 0.08,
        1.71,
      ]).filter(([x, y]) => y < waterTable(x) - 0.02),
    [],
  );
  const remaining = 10000 - 6000 * abstraction,
    withdrawn = 6000 * abstraction;
  const divide = useMemo(
    () => [
      ...Array.from({ length: 49 }, (_, i): Point => {
        const x = 1.1 - (3.8 * i) / 48;
        return [x, height(x, -1.7) + 0.025, -1.7];
      }),
      ...Array.from({ length: 49 }, (_, i): Point => {
        const z = -1.7 + (3.4 * i) / 48;
        return [-2.7, height(-2.7, z) + 0.025, z];
      }),
      ...Array.from({ length: 49 }, (_, i): Point => {
        const x = -2.7 + (3.8 * i) / 48;
        return [x, height(x, 1.7) + 0.025, 1.7];
      }),
    ],
    [],
  );
  return (
    <>
      <ScienceStudio
        slug="water-cycle"
        scale="Catchment cutaway · conceptual stores and transfers, not to scale"
        trueScale="No common scale for land, atmosphere and pore water · sizes are illustrative"
        camera={[2.1, 2.4, 7]}
      >
        <group position={[0, -0.5, 0]}>
          <mesh geometry={terrain} castShadow receiveShadow>
            <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
            <SectionMaterial
              attach="material-1"
              glsl={GROUND_GLSL}
              cacheKey="water-cycle-ground-v1"
            />
          </mesh>
          {/* Ocean basin: sandy seabed block under the sea surface. */}
          <mesh position={[2, -0.45, 0]}>
            <boxGeometry args={[1.8, 0.4, 3.4]} />
            <SectionMaterial glsl={GROUND_GLSL} cacheKey="water-cycle-ground-v1" />
          </mesh>
          <mesh position={[2, -0.125, 1.701]}>
            <planeGeometry args={[1.8, 0.25]} />
            <meshPhysicalMaterial color="#2a7896" transparent opacity={0.4} depthWrite={false} />
          </mesh>
          <mesh position={[2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.8, 3.4]} />
            <FlowWaterMaterial color="#327994" opacity={0.94} flow={[0.2, 0.3]} speed={0.4} />
          </mesh>
          <InspectHotspot
            name="Reservoir"
            note="An invented embanked reservoir that starts with 10,000 m³. Abstraction moves water into the human-use store, so the combined total stays the same. The shoreline retreats as the level falls; its shape is illustrative."
          >
            <ReservoirSurface abstraction={abstraction} />
          </InspectHotspot>
          <mesh position={[0.8, height(0.8, -1.1) + 0.15, -1.1]}>
            <boxGeometry args={[0.22, 0.3, 0.24]} />
            <meshStandardMaterial color="#d2b28b" roughness={0.8} />
          </mesh>
          {abstraction > 0 && (
            <Arrow
              from={[0.3, height(0.3, -0.65) + 0.15, -0.65]}
              to={[0.8, height(0.8, -1.1) + 0.3, -1.1]}
              color="#efb474"
              width={0.7}
            />
          )}
          <PoreMarkers positions={pores} colours={Array(pores.length).fill("#7bd0d8")} />
          <InspectHotspot
            name="Vegetation and soil water"
            note="Water is held on leaves, in living plants and in soil pores. Transpiration returns some to the atmosphere."
          >
            <PlantStand
              positions={Array.from({ length: 36 }, (_, i) => {
                const x = -2.5 + random(i + 317) * 2.9,
                  z = -1.5 + random(i + 692) * 3;
                return [x, height(x, z), z] as Point;
              }).filter(
                ([x, , z]) =>
                  Math.abs(z) > 0.25 && Math.hypot((x - 0.3) / 0.6, (z + 0.65) / 0.5) > 1,
              )}
              kind="broadleaf"
              scale={0.11}
              seed={7}
            />
          </InspectHotspot>
          <WaterRibbon path={paths[3].points} width={0.038} color="#65a6b4" />
          <GrassPatch
            positions={Array.from({ length: 80 }, (_, i) => {
              const x = -2.5 + random(i + 19) * 3.3,
                z = 0.3 + random(i + 736) * 1.25;
              return [x, height(x, z), z];
            })}
            height={0.065}
          />
          {[-2.1, -1.2, -0.3].map((x, i) => (
            <RootNetwork
              key={i}
              x={x}
              y={height(x, 1.7)}
              z={1.71}
              depth={0.27}
              spread={0.15}
              seed={i}
            />
          ))}
          {Array.from({ length: 18 }, (_, i) => {
            const x = -2.1 + (i % 6) * 0.22,
              z = -0.17 + Math.floor(i / 6) * 0.2,
              bottom = height(x, z),
              y = bottom + (1 - ((t * 6 + i * 0.131) % 1)) * (1.9 - bottom);
            return (
              <Line
                key={`rain-${i}`}
                points={[
                  [x, y + 0.055, z],
                  [x, y, z],
                ]}
                color="#a1cedc"
                lineWidth={0.9}
                transparent
                opacity={0.7}
              />
            );
          })}
          <mesh position={[-2.35, height(-2.35, 1.2) + 0.02, 1.2]} scale={[0.55, 0.035, 0.3]}>
            <sphereGeometry args={[1, 32, 20]} />
            <meshStandardMaterial color="#dce7e5" roughness={0.62} />
          </mesh>
          <CloudVolume
            position={[-1.25 - 0.25 * t, 2.04, -0.12]}
            scale={[1.25, 0.76, 0.9]}
            seed={7}
            density={80}
            opacity={0.28}
          />
          <CloudVolume
            position={[0.8 - 0.25 * t, 2.1, 0.02]}
            scale={[0.8, 0.54, 0.72]}
            seed={23}
            density={64}
            opacity={0.25}
          />
          <Tag
            pos={[0, 2.55, 0]}
            text="Atmosphere"
            note="Invisible vapour is the main atmospheric water store; clouds contain droplets and ice."
            occlude={false}
          />
          <Tag
            pos={[2.15, 0.08, 1.8]}
            text="Ocean"
            occlude={false}
            note="The largest global water store. Its volume is not proportional to this small catchment."
          />
          <Tag
            pos={[-1, -0.8, 1.7]}
            text="Groundwater"
            occlude={false}
            note="Below the water table every pore and fracture is full of water. Blue dots mark this pore water in the cut face."
          />
          <Tag
            pos={[-2.35, height(-2.35, 1.2) + 0.15, 1.2]}
            text="Snow and ice"
            occlude={false}
            note="A frozen store. Melting releases liquid water that can infiltrate or run off."
          />
          <Tag
            pos={[0.8, height(0.8, -1.1) + 0.45, -1.1]}
            text="Human use"
            occlude={false}
            note="Water abstracted for homes, farms and industry. It has moved to another store; it has not left the cycle."
          />
          {paths.map((p, i) => (
            <Transfer key={p.name} path={p} index={i} selected={i === focus} />
          ))}
          {basin && (
            <Line
              points={divide}
              color="#e8ca87"
              lineWidth={3}
              dashed
              dashSize={0.07}
              gapSize={0.04}
            />
          )}
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <strong className="text-chalk">{path.name}.</strong> {path.note}{" "}
        <span className="formula">
          {`Reservoir ${fmt(remaining)} + human use ${fmt(withdrawn)} = 10,000 m³`}
        </span>
        <br />
        {
          "Closed teaching budget: abstraction moves water from the reservoir to the human-use store, "
        }
        {"so the local store shrinks while the total stays the same. "}
        {basin
          ? "The gold dashed line follows the drainage divide; the outlet faces the ocean."
          : ""}
      </ScienceReadout>
    </>
  );
}
