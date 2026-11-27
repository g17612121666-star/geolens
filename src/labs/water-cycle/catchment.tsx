import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from "react";
import { GuideLine as Line } from "../shared/guide-line";
import * as THREE from "three";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { useLabFrame, useLabTick } from "@/labs/tick";
import { TimeMarkers } from "../shared/time-markers";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Tag, InspectHotspot } from "../shared/kit";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { WaterRibbon, GrassPatch, RootNetwork } from "../shared/geomorphic-terrain";
import { WaterSides } from "../shared/shallow-water";
import { withSurfaceY } from "../shared/section-utils";
import { SectionMaterial } from "../shared/section-material";
import { farmland } from "../shared/hazard-utils";
import { msg, useT } from "@/lib/i18n";

/** Cut faces: topsoil, then dry ground above the water table, a thin capillary fringe, and wet
 * saturated ground (the groundwater store) below it with every pore full of water, then bedrock.
 * Sand lies under the sea. The water table rises inland and meets sea level at the coast, so
 * groundwater can drain to the sea. Schematic. */
const GROUND_GLSL = `
vec3 sectionColour(vec3 p,vec3 w){
  float y=w.y+.5,g=grain(w.xy+w.zy),speck=grain((w.xy+w.zy)*9.);
  if(y<-.52+.02*sin(w.x*3.1+w.z*2.))return mix(vec3(.47,.45,.45),vec3(.35,.34,.35),g)*(.92+.12*speck);
  if(w.x>1.12)return mix(vec3(.80,.72,.55),vec3(.68,.60,.45),g)*(.9+.15*speck);
  float wt=.12*clamp((1.1-w.x)/3.8,0.,1.);
  if(sectionDepth<.045)return mix(vec3(.36,.27,.19),vec3(.27,.2,.14),g);
  if(abs(y-wt)<.005)return vec3(.58,.82,.92);
  if(y<wt)return mix(mix(vec3(.38,.52,.58),vec3(.30,.43,.50),g),vec3(.50,.70,.78),smoothstep(.6,.9,speck)*.45);
  if(y<wt+.05)return mix(vec3(.60,.60,.53),vec3(.50,.53,.48),g);
  return mix(mix(vec3(.74,.62,.44),vec3(.60,.48,.33),g),vec3(.82,.74,.6),smoothstep(.6,.9,speck)*.3);
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
import { landscapeNoise, landscapeRandom as random } from "../shared/landscape-noise";
type Point = [number, number, number];
/** Water-table height (group space): 0 at the coast (sea level), rising gently inland. */
function waterTable(x: number) {
  return 0.12 * Math.max(0, Math.min(1, (1.1 - x) / 3.8));
}
// The valley falls toward +x; transverse slopes are zero on the bounding ridges.
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
/** The catchment and the coast beyond its outlet: the land meets the sea in a beach at the
 * river mouth and in steep headlands where the bounding ridges reach the shore; the seabed
 * slopes away offshore. */
const COAST = 1.1;
function land(x: number, z: number) {
  if (x <= COAST) return height(x, z);
  const shore = height(COAST, z),
    seabed = -0.04 - 0.26 * THREE.MathUtils.smoothstep(x, 1.3, 2.8);
  return THREE.MathUtils.lerp(shore, seabed, THREE.MathUtils.smoothstep(x, COAST, 1.45));
}
/** In the sea group's own frame (its center is 0.1 east of the catchment's). */
const seaFloor = (x: number, z: number) => land(x + 0.1, z),
  seaLevel = () => 0;
const reservoirR = (x: number, z: number) => {
  const dx = (x - 0.3) / 0.43,
    dz = (z + 0.65) / 0.32;
  return Math.hypot(dx, dz) / lakeRadius(Math.atan2(dz, dx));
};
const shade = new THREE.Color();
/** Fields in the valley, woods on its sides, moorland above, and snow on the high ridges at its
 * head; inside the reservoir, ground left bare as the water level falls. */
function landColor(x: number, y: number, z: number, level: number, out: THREE.Color) {
  if (x > COAST + 0.02) return out.set(y > -0.01 ? "#dccb9e" : "#bfb18b");
  out.copy(farmland(x * 1.4, z * 1.4, 0.34));
  out.lerp(shade.set("#55753f"), THREE.MathUtils.smoothstep(y, 0.3, 0.45) * 0.75);
  out.lerp(shade.set("#8b8657"), THREE.MathUtils.smoothstep(y, 0.64, 0.82) * 0.85);
  const snow = y + 0.07 * (landscapeNoise(x * 4 + 1, z * 4) - 0.5);
  out.lerp(shade.set("#eef3f5"), THREE.MathUtils.smoothstep(snow, 0.9, 0.97));
  const r = reservoirR(x, z);
  if (r < 1.25 && y > level - 0.004 && y < lakeCentre[1] + 0.004)
    out.lerp(shade.set("#8c7f66"), 0.85);
  return out;
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
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const paths: { name: string; points: Point[]; color: string; note: string }[] = [
  {
    name: msg("Evaporation"),
    points: [
      [2, 0.02, 0.4],
      [2.2, 0.9, 0.4],
      [1.5, 2, 0.4],
    ],
    color: "#e9c18a",
    note: msg(
      "Liquid water becomes invisible water vapor, mainly using energy from the Sun. Clouds are droplets or ice, not vapor.",
    ),
  },
  {
    name: msg("Atmospheric transport"),
    points: [
      [1.5, 2, 0.4],
      [0, 2.2, 0.4],
      [-1.5, 2, 0.4],
    ],
    color: "#b9d8e6",
    note: msg(
      "Wind carries water vapor and cloud droplets. The arrow shows direction only, not a measured wind.",
    ),
  },
  {
    name: msg("Precipitation"),
    points: [
      [-1.5, 2, 0.4],
      [-1.5, 1.3, 0.4],
      [-1.5, height(-1.5, 0.4), 0.4],
    ],
    color: "#7fccea",
    note: msg("Rain or snow falls from clouds. Vegetation intercepts some precipitation."),
  },
  {
    name: msg("Surface runoff"),
    points: Array.from({ length: 25 }, (_, i): Point => {
      const x = -2.1 + (3.6 * i) / 24;
      return [x, x > 1.1 ? 0.03 : height(x, 0) + 0.025, 0];
    }),
    color: "#86d6e9",
    note: msg(
      "Overland flow and rivers carry water downhill toward the outlet. Divides separate surface catchments.",
    ),
  },
  {
    name: msg("Infiltration"),
    // Drawn on the front cut face so it stays visible: surface down to the water table.
    points: [
      [-1.6, height(-1.6, 1.7) + 0.01, 1.72],
      [-1.6, 0.5, 1.72],
      [-1.6, waterTable(-1.6), 1.72],
    ],
    color: "#72bcce",
    note: msg(
      "Water soaks into the soil. Percolation then carries it down through the unsaturated zone to the water table.",
    ),
  },
  {
    name: msg("Groundwater flow"),
    // Below the water table on the front cut face, draining toward the coast.
    points: [
      [-1.6, waterTable(-1.6) - 0.12, 1.72],
      [-0.3, -0.1, 1.72],
      [1.1, -0.08, 1.72],
    ],
    color: "#509ca9",
    note: msg(
      "Groundwater flows slowly from high to low hydraulic head through pores and fractures, not through open caverns.",
    ),
  },
  {
    name: msg("Transpiration"),
    points: [
      [-1, 0.9, -0.8],
      [-0.8, 1.5, -0.8],
      [-0.2, 2, -0.8],
    ],
    color: "#9ac794",
    note: msg(
      "Roots take up soil water and leaves release it as water vapor through tiny pores called stomata.",
    ),
  },
  {
    name: msg("Snowmelt"),
    points: [
      [-2.35, height(-2.35, 1.2) + 0.04, 1.2],
      [-1.9, height(-1.9, 0.8) + 0.04, 0.8],
      [-1.4, height(-1.4, 0) + 0.04, 0],
    ],
    color: "#dbe8e9",
    note: msg(
      "Snow and ice store water. Melting changes it to liquid, which can infiltrate or run off.",
    ),
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
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(path.points.map((p) => new THREE.Vector3(...p))),
    [path],
  );
  const pts = useMemo(() => curve.getPoints(64), [curve]);
  const tr = useT();
  return (
    <InspectHotspot name={tr(path.name)} note={tr(path.note)}>
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
      {/* A parcel of water travels along the transfer with lab time. */}
      <TimeMarkers
        count={1}
        radius={selected ? 0.045 : 0.025}
        color={path.color}
        detail={[12, 12]}
        at={(t) => {
          const p = curve.getPoint((t + index * 0.13) % 1);
          return [p.x, p.y, p.z];
        }}
      />
    </InspectHotspot>
  );
}
/** Upland rain: 18 drops falling from the cloud base to the ground, moved every drawn frame. */
const RAIN_DROPS = Array.from({ length: 18 }, (_, i) => {
  const x = -2.1 + (i % 6) * 0.22,
    z = -0.17 + Math.floor(i / 6) * 0.2;
  return { x, z, bottom: height(x, z), phase: i * 0.131 };
});

/** Writes each drop as a short segment (top, then bottom) into `out`, six numbers per drop. */
function writeRain(t: number, out: Float32Array) {
  RAIN_DROPS.forEach(({ x, z, bottom, phase }, i) => {
    const y = bottom + (1 - ((t * 6 + phase) % 1)) * (1.9 - bottom);
    out.set([x, y + 0.055, z, x, y, z], i * 6);
  });
}

function FallingRain() {
  const line = useRef<ComponentRef<typeof Line>>(null);
  // Built once; afterwards the same buffer is rewritten in place, so no geometry is rebuilt.
  const points = useMemo(() => {
    const flat = new Float32Array(RAIN_DROPS.length * 6);
    writeRain(useLabControls.getState().t, flat);
    return Array.from({ length: flat.length / 3 }, (_, i): [number, number, number] => [
      flat[i * 3],
      flat[i * 3 + 1],
      flat[i * 3 + 2],
    ]);
  }, []);
  useLabFrame((t) => {
    const geometry = line.current?.geometry,
      start = geometry?.getAttribute("instanceStart") as
        THREE.InterleavedBufferAttribute | undefined;
    if (!geometry || !start) return;
    writeRain(t, start.data.array as Float32Array);
    start.data.needsUpdate = true;
    geometry.computeBoundingSphere();
  });
  return (
    <Line
      ref={line}
      segments
      points={points}
      color="#a1cedc"
      lineWidth={0.9}
      transparent
      opacity={0.7}
    />
  );
}

/** Clouds drift slowly downwind with lab time. */
function DriftingClouds() {
  const drift = useRef<THREE.Group>(null);
  useLabFrame((t) => {
    if (drift.current) drift.current.position.x = -0.25 * t;
  });
  return (
    <group ref={drift} position={[-0.25 * useLabControls.getState().t, 0, 0]}>
      <CloudVolume
        position={[-1.25, 2.04, -0.12]}
        scale={[1.25, 0.76, 0.9]}
        seed={7}
        density={80}
        opacity={0.62}
      />
      <CloudVolume
        position={[0.8, 2.1, 0.02]}
        scale={[0.8, 0.54, 0.72]}
        seed={23}
        density={64}
        opacity={0.55}
      />
    </group>
  );
}

/** A water tower: the store that supplies homes and industry from the abstracted water. */
function WaterTower({ position }: { position: Point }) {
  return (
    <group position={position}>
      {[
        [-0.055, -0.055],
        [0.055, -0.055],
        [0.055, 0.055],
        [-0.055, 0.055],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.11, z]}>
          <cylinderGeometry args={[0.008, 0.01, 0.22, 8]} />
          <meshStandardMaterial color="#8c9096" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.11, 32]} />
        <meshStandardMaterial color="#c9d0d4" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.355, 0]} castShadow>
        <coneGeometry args={[0.105, 0.06, 32]} />
        <meshStandardMaterial color="#aeb6bb" roughness={0.5} metalness={0.25} />
      </mesh>
    </group>
  );
}

export default function WaterCycle() {
  const { params } = useLabState("params");
  const tr = useT();
  useLabTick(1 / 20);
  const abstraction = params.abstraction ?? 0,
    basin = params.basin > 0.5,
    focus = Math.round(params.transfer ?? 3),
    path = paths[focus];
  // Land and seabed from the head of the valley (x = -2.7) out to sea (x = 2.9).
  const terrain = useMemo(() => {
    const g = withSurfaceY(
      terrainBlockGeometry((x, z) => land(x + 0.1, z), 5.6, 3.4, 220),
      (x, z) => land(x + 0.1, z),
    );
    g.translate(0.1, 0, 0);
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3),
    );
    return g;
  }, []);
  // Colors follow the reservoir level: ground it uncovers turns to bare mud.
  const level = lakeCentre[1] - 0.08 * abstraction;
  useLayoutEffect(() => {
    const p = terrain.attributes.position,
      c = terrain.attributes.color as THREE.BufferAttribute,
      col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      landColor(p.getX(i), p.getY(i), p.getZ(i), level, col);
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  }, [terrain, level]);
  useEffect(() => () => terrain.dispose(), [terrain]);
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
        scale={tr("Catchment cutaway · conceptual stores and transfers, not to scale")}
        trueScale={tr(
          "No common scale for land, atmosphere and pore water · sizes are illustrative",
        )}
        camera={[2.1, 2.4, 7]}
      >
        <group position={[0, -0.5, 0]}>
          <mesh geometry={terrain} castShadow receiveShadow>
            <TerrainMaterial attach="material-0" kind="grass" color="#f2f2f2" vertexColors />
            <SectionMaterial
              attach="material-1"
              glsl={GROUND_GLSL}
              surface
              cacheKey="water-cycle-ground-v3"
            />
          </mesh>
          {/* The sea over the sloping seabed: the land hides it wherever it rises above sea
              level, so the shoreline follows the coast; the cut faces show its depth. */}
          <mesh position={[1.9, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <planeGeometry args={[2, 3.4]} />
            <FlowWaterMaterial color="#2f7894" opacity={0.92} flow={[0.2, 0.3]} speed={0.4} />
          </mesh>
          <group position={[0.1, 0, 0]}>
            <WaterSides
              land={seaFloor}
              level={seaLevel}
              width={5.6}
              depth={3.4}
              color="#2a6f8c"
              opacity={0.55}
            />
          </group>
          <InspectHotspot
            name={tr("Reservoir")}
            note={tr(
              "An invented embanked reservoir that starts with 10,000 m³. Abstraction moves water into the human-use store, so the combined total stays the same. The shoreline retreats as the level falls; its shape is illustrative.",
            )}
          >
            <ReservoirSurface abstraction={abstraction} />
          </InspectHotspot>
          <WaterTower position={[0.8, height(0.8, -1.1), -1.1]} />
          {abstraction > 0 && (
            <Arrow
              from={[0.3, height(0.3, -0.65) + 0.15, -0.65]}
              to={[0.8, height(0.8, -1.1) + 0.3, -1.1]}
              color="#efb474"
              width={0.7}
            />
          )}
          <InspectHotspot
            name={tr("Vegetation and soil water")}
            note={tr(
              "Water is held on leaves, in living plants and in soil pores. Transpiration returns some to the atmosphere.",
            )}
          >
            <PlantStand
              positions={Array.from({ length: 36 }, (_, i) => {
                const x = -2.5 + random(i + 317) * 2.9,
                  z = -1.5 + random(i + 692) * 3;
                return [x, height(x, z), z] as Point;
              }).filter(
                ([x, y, z]) =>
                  Math.abs(z) > 0.25 &&
                  y < 0.76 &&
                  Math.hypot((x - 0.3) / 0.6, (z + 0.65) / 0.5) > 1,
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
          <FallingRain />
          <DriftingClouds />
          <Tag
            pos={[0, 2.55, 0]}
            text={tr("Atmosphere")}
            note={tr(
              "Invisible vapor is the main atmospheric water store; clouds contain droplets and ice.",
            )}
            occlude={false}
          />
          <Tag
            pos={[2.2, 0.08, 1.8]}
            text={tr("Ocean")}
            occlude={false}
            note={tr(
              "The largest global water store. Its volume is not proportional to this small catchment.",
            )}
          />
          <Tag
            pos={[-1, -0.8, 1.7]}
            text={tr("Groundwater")}
            occlude={false}
            note={tr(
              "Below the water table every pore and fracture in the ground is full of water: the blue-gray saturated zone in the cut face. Above it, the pores hold air as well as water.",
            )}
          />
          <Tag
            pos={[-0.35, waterTable(-0.35) + 0.07, 1.72]}
            text={tr("Water table")}
            priority={1}
            occlude={false}
            note={tr(
              "The top of the saturated zone. It rises under the hills and meets sea level at the coast, so groundwater drains slowly toward the sea.",
            )}
          />
          <Tag
            pos={[-2.35, height(-2.35, 1.2) + 0.15, 1.2]}
            text={tr("Snow and ice")}
            occlude={false}
            note={tr(
              "A frozen store. Melting releases liquid water that can infiltrate or run off.",
            )}
          />
          <Tag
            pos={[0.8, height(0.8, -1.1) + 0.45, -1.1]}
            text={tr("Human use")}
            occlude={false}
            note={tr(
              "Water abstracted for homes, farms and industry. It has moved to another store; it has not left the cycle.",
            )}
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
        <strong className="text-chalk">{tr(path.name)}.</strong> {tr(path.note)}{" "}
        <span className="formula">
          {tr("Reservoir {left} + human use {used} = 10,000 m³", {
            left: fmt(remaining),
            used: fmt(withdrawn),
          })}
        </span>{" "}
        <br />
        {tr(
          "Closed teaching budget: abstraction moves water from the reservoir to the human-use store, so the local store shrinks while the total stays the same.",
        )}{" "}
        {basin
          ? tr("The gold dashed line follows the drainage divide; the outlet faces the ocean.")
          : ""}
      </ScienceReadout>
    </>
  );
}
