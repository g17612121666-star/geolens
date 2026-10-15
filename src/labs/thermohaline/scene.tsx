import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { classroomDensity } from "@/lib/ocean-circulation-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { WaterPrism } from "../shared/water-prism";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { PlantStand } from "../shared/natural-world";
import { Tag } from "../shared/kit";
import { OceanSurface } from "../shared/ocean-section";
import { FlowFilaments } from "../atmosphere-layers/weather-volumes";
import { densityParcelHeight } from "./transport";
export default function Thermohaline() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const temperature = params.temperature ?? 4,
    salinity = params.salinity ?? 35,
    view = Math.round(params.view ?? 0),
    rho = classroomDensity(temperature, salinity),
    reference = classroomDensity(10, 35),
    difference = rho - reference;
  const f = trueScale ? 1 : 500,
    y = (depth: number) => (-depth / 1500000) * f;
  const path = (u: number): [number, number, number] => [
    1.8 * Math.cos(u),
    y(2000 - 1700 * Math.sin(u)),
    0.86,
  ];
  const pelletY = densityParcelHeight(t, difference);
  return (
    <>
      <ScienceStudio
        slug="thermohaline"
        camera={[1.4, 2.2, 7]}
        scale={
          view === 0
            ? "Overturning section · depth ×500 · routes and tracers illustrative"
            : "Density experiment · one metre tank · parcel marker enlarged"
        }
        trueScale={
          view === 0
            ? "6000 km section, 4 km deep · no vertical exaggeration"
            : "Tank geometry uses a common scale · parcel marker enlarged"
        }
      >
        {view === 0 ? (
          <>
            <OceanBasin bottom={y(4000)} />
            <OceanSurface
              points={[
                [-2.02, 0],
                [2.02, 0],
              ]}
              opacity={0.4}
            />
            {/* Sea ice at the high-latitude end, where brine rejection helps water sink. */}
            {Array.from({ length: 9 }, (_, i) => (
              <mesh
                key={`ice-${i}`}
                position={[
                  1.35 + (i % 3) * 0.22,
                  0.012,
                  -0.55 + Math.floor(i / 3) * 0.5 + 0.08 * Math.sin(i * 3),
                ]}
                rotation={[0, i * 0.7, 0]}
              >
                <cylinderGeometry args={[0.09 + 0.03 * Math.sin(i * 5) ** 2, 0.1, 0.025, 7]} />
                <meshStandardMaterial color="#eef5f7" roughness={0.55} />
              </mesh>
            ))}
            <FlowFilaments
              paths={Array.from({ length: 7 }, (_, k) =>
                Array.from({ length: 97 }, (_, i) => {
                  const p = path((-i / 96) * Math.PI * 2);
                  return [p[0], p[1], -0.6 + k * 0.2] as [number, number, number];
                }),
              )}
              t={t}
              color="#95cbd5"
            />
            {[0, 1].map((half) => (
              <Line
                key={half}
                points={Array.from({ length: 65 }, (_, i) =>
                  path(half * Math.PI + (i / 64) * Math.PI),
                )}
                color={half === 0 ? "#d7a679" : "#82bbd4"}
                lineWidth={3}
              />
            ))}
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((u) => (
              <Arrow
                key={u}
                from={path(u)}
                to={path(u - 0.2)}
                color={Math.sin(u) > 0 ? "#d7a679" : "#82bbd4"}
                width={1}
              />
            ))}
            {Array.from({ length: 18 }, (_, i) => {
              const u = -(t + i / 18) * Math.PI * 2;
              return (
                <mesh key={i} position={path(u)}>
                  <sphereGeometry args={[0.035, 12, 10]} />
                  <meshBasicMaterial color={Math.sin(u) > 0 ? "#e1b286" : "#8bc9df"} />
                </mesh>
              );
            })}
            <Tag
              pos={[2.25, 0.4, 0]}
              text="High latitudes · deep-water formation"
              note="Buoyancy loss can allow convection and formation of dense water. This Atlantic-to-Southern-Ocean section is schematic, not a real pipe or a map of every sinking site."
              occlude={false}
            />
            <Tag
              pos={[-2, 0.4, 0]}
              text="Return and upwelling"
              note="Winds and turbulent mixing help return deep water towards the surface, especially through the Southern Ocean. Temperature and salinity alone do not power a complete conveyor."
              occlude={false}
            />
            <Tag
              pos={[0, y(4000) - 0.35, 0.9]}
              text="Deep return · centuries of transport"
              note="Tracer age varies between routes and water masses. Animation speed is arbitrary; this view does not assign one global turnover time."
              occlude={false}
            />
          </>
        ) : (
          <>
            <WaterPrism
              points={[
                [-1.1, 0],
                [1.1, 0],
                [1.1, -2],
                [-1.1, -2],
              ]}
              depth={1.6}
              colour="#477888"
              opacity={0.22}
            />
            <OceanSurface
              points={[
                [-1.1, 0],
                [1.1, 0],
              ]}
              opacity={0.38}
            />
            <Line
              points={[
                [-1.1, 0, 0.82],
                [-1.1, -2, 0.82],
                [1.1, -2, 0.82],
                [1.1, 0, 0.82],
              ]}
              color="#abc4c6"
              lineWidth={2}
            />
            <mesh position={[0, pelletY, 0]}>
              <sphereGeometry args={[0.18, 40, 28]} />
              <meshPhysicalMaterial
                color={difference > 0 ? "#82bcdd" : "#dbb18c"}
                roughness={0.24}
                transparent
                opacity={0.55}
              />
            </mesh>
            {Math.abs(difference) > 0.005 && (
              <Arrow
                from={[0.45, -0.5, 0.5]}
                to={[0.45, difference > 0 ? -1.25 : -0.18, 0.5]}
                color="#abd0d7"
                width={1.2}
              />
            )}
            <Tag
              pos={[0, 0.5, 0]}
              text={`${rho.toFixed(2)} kg/m³ · parcel`}
              note="Linear classroom approximation at a common reference pressure. Not the TEOS-10 equation of state; compressibility, mixing and changing coefficients are excluded."
              occlude={false}
            />
            <Tag
              pos={[0, -2.45, 0]}
              text={`Reference water ${reference.toFixed(2)} kg/m³`}
              note="Reference temperature 10 °C and Absolute Salinity 35 g/kg. The marker is released at mid-depth. Its motion illustrates buoyancy direction; real water deforms and mixes, rather than staying in a rigid sphere."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {view === 0
          ? "Warm upper limb (amber); cold deep return (blue). Choose Density experiment to vary the parcel."
          : `${temperature} °C · Absolute Salinity ${salinity.toFixed(1)} g/kg · density difference ${difference >= 0 ? "+" : ""}${difference.toFixed(2)} kg/m³: ${Math.abs(difference) < 0.005 ? "neutral" : difference > 0 ? "denser parcel tends to sink" : "lighter parcel rises towards the surface"}.`}
        <br />
        {view === 0 ? (
          "Overturning also needs winds and mixing. The separate parcel experiment does not calculate AMOC transport or a shutdown threshold."
        ) : (
          <>
            <span className="formula">{"ρ = 1027 [1 − 0.0002(T − 10) + 0.00076(SA − 35)]"}</span>
            {". Play illustrates buoyancy direction, not descent speed."}
          </>
        )}
      </ScienceReadout>
    </>
  );
}

const SHORE = 2.02;
/** Seabed fraction of full depth: shelves at both ends and a mid-ocean ridge in the middle. */
function seabed(x: number, bottom: number) {
  const ax = Math.abs(x),
    depth =
      (1 -
        0.32 * Math.exp(-((x / 0.32) ** 2)) -
        0.04 * Math.sin(x * 9) * Math.exp(-((x / 0.6) ** 2))) *
      (1 - 0.93 * THREE.MathUtils.smoothstep(ax, 1.55, 1.92));
  return THREE.MathUtils.lerp(depth * bottom, 0.07, THREE.MathUtils.smoothstep(ax, 1.95, 2.08));
}
const TROPIC = new THREE.Color("#e39a5c"),
  POLAR = new THREE.Color("#8cc0d6"),
  DEEP = new THREE.Color("#22507a");
/** Schematic temperature of the water: warm surface at low latitude (left), cold deep water. */
function waterColour(x: number, y: number, bottom: number, out: THREE.Color) {
  const across = (x + 2) / 4,
    depth = Math.min(1, -y / -bottom);
  return out
    .copy(TROPIC)
    .lerp(POLAR, across)
    .lerp(DEEP, Math.min(1, Math.pow(depth, 0.45) + across * 0.25));
}

/**
 * The ocean basin in section: bathymetry with shelves and a ridge, a tropical coast on the
 * left and an ice-covered polar coast on the right, and water faces coloured by temperature.
 */
function OceanBasin({ bottom }: { bottom: number }) {
  const ground = useMemo(() => (x: number) => seabed(x, bottom), [bottom]);
  const land = useMemo(
    () => (x: number, z: number) => ground(x) + 0.01 * Math.sin(z * 7 + x * 3),
    [ground],
  );
  const colour = useMemo(
    () => (x: number, y: number) =>
      y > 0.03 ? (x < 0 ? "#6f8f48" : "#eef3f5") : y > -0.05 ? "#cbb98e" : "#7e786c",
    [],
  );
  const faces = useMemo(() => {
    const p: number[] = [],
      c: number[] = [],
      idx: number[] = [],
      col = new THREE.Color(),
      n = 200;
    for (const z of [0.801, -0.801]) {
      const start = p.length / 3;
      for (let i = 0; i <= n; i++) {
        const x = -SHORE + (2 * SHORE * i) / n,
          floor = Math.min(0, ground(x));
        for (const y of [0, floor]) {
          p.push(x, y, z);
          waterColour(x, y, bottom, col);
          c.push(col.r, col.g, col.b);
        }
        if (i < n) {
          const a = start + i * 2;
          if (z > 0) idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
          else idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(idx);
    return g;
  }, [ground, bottom]);
  useEffect(() => () => faces.dispose(), [faces]);
  const palms = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const x = -2.08 - 0.1 * ((i * 0.618) % 1),
          z = -0.7 + (i / 9) * 1.4;
        return [x, land(x, z), z] as [number, number, number];
      }),
    [land],
  );
  return (
    <>
      <GeomorphicTerrain
        height={(x, z) => land(x, z)}
        colour={(x, y) => colour(x, y)}
        width={4.3}
        depth={1.6}
        base={bottom - 0.12}
        resolution={180}
        cliff={0.35}
        mottle={0.05}
        section={{ rock: "shale", soil: 0.02, regolith: 0.04, beds: 9, soilTone: "thin" }}
      />
      <mesh geometry={faces}>
        <meshBasicMaterial vertexColors transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <PlantStand kind="broadleaf" positions={palms} scale={0.08} seed={4} />
    </>
  );
}
