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
  const loop = useMemo(() => overturningLoop(f), [f]);
  const path = (s: number, z = 0.86): [number, number, number] => {
    const [x, py] = loop.at(s);
    return [x, py, z];
  };
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
            : "Tank shown as in Teaching scale · parcel marker enlarged"
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
                Array.from({ length: 97 }, (_, i) => path(i / 96, -0.6 + k * 0.2)),
              )}
              t={t}
              color="#95cbd5"
            />
            {[loop.upper, loop.lower].map((half, i) => (
              <Line
                key={i}
                points={half.map(([x, py]) => [x, py, 0.86] as [number, number, number])}
                color={i === 0 ? "#d7a679" : "#82bbd4"}
                lineWidth={3}
              />
            ))}
            {[0.985, 0.25, 0.485, 0.75].map((s) => (
              <Arrow
                key={s}
                from={path(s)}
                to={path(s + 0.03)}
                color={loop.at(s)[1] > loop.mid ? "#d7a679" : "#82bbd4"}
                width={1}
              />
            ))}
            {Array.from({ length: 18 }, (_, i) => {
              const p = path(t + i / 18);
              return (
                <mesh key={i} position={p}>
                  <sphereGeometry args={[0.035, 12, 10]} />
                  <meshBasicMaterial color={p[1] > loop.mid ? "#e1b286" : "#8bc9df"} />
                </mesh>
              );
            })}
            <Tag
              pos={[2.25, 0.4, 0]}
              text="High latitudes · deep-water formation"
              note="Cooling and sea-ice formation, which leaves salt behind in the water, make surface water dense enough to sink. The basin is schematic, not a map of real sinking sites."
              occlude={false}
            />
            <Tag
              pos={[-2, 0.4, 0]}
              text="Return and upwelling"
              note="Winds and mixing bring deep water back towards the surface. In the real ocean much of this happens in the Southern Ocean, not only at low latitudes as drawn here."
              occlude={false}
            />
            <Tag
              pos={[0, y(4000) - 0.35, 0.9]}
              text="Deep return · centuries of transport"
              note="Deep water takes centuries to return, and the time differs between routes. The animation speed is not to scale."
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
              note="A simple linear formula at one reference pressure, not the full TEOS-10 equation of state."
              occlude={false}
            />
            <Tag
              pos={[0, -2.45, 0]}
              text={`Reference water ${reference.toFixed(2)} kg/m³`}
              note="Reference water: 10 °C and Absolute Salinity 35 g/kg. The marker starts at mid-depth and shows only which way buoyancy acts; real water mixes rather than moving as a solid ball."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {view === 0
          ? "Warm upper water (amber) flows from the tropical coast (left) to the icy polar coast (right), sinks and returns at depth (blue). Choose Density experiment to vary the parcel."
          : `${temperature} °C · Absolute Salinity ${salinity.toFixed(1)} g/kg · density difference ${difference >= 0 ? "+" : ""}${difference.toFixed(2)} kg/m³: ${Math.abs(difference) < 0.005 ? "neutral" : difference > 0 ? "denser parcel tends to sink" : "lighter parcel rises towards the surface"}.`}
        <br />
        {view === 0 ? (
          "Overturning also needs winds and mixing. The parcel experiment does not calculate AMOC strength or a shutdown threshold."
        ) : (
          <>
            <span className="formula">{"ρ = 1027 [1 − 0.0002(T − 10) + 0.00076(SA − 35)]"}</span>
            {". Play shows the direction of movement, not its speed."}
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

/**
 * Schematic overturning loop in the section plane: a rounded rectangle with the upper limb at
 * about 250 m, sinking over the deep basin before the polar shelf, and the deep limb at about
 * 3300 m that rises to stay 300 m above the ridge crest. Each half is resampled evenly by
 * distance so tracers move at a steady pace. `f` is the vertical exaggeration.
 */
function overturningLoop(f: number) {
  const y = (depth: number) => (-depth / 1500000) * f,
    bottom = y(4000),
    mid = y(1775);
  const half = (from: number) => {
    const raw: [number, number][] = [];
    for (let i = 0; i <= 400; i++) {
      const u = from - (i / 400) * Math.PI,
        c = Math.cos(u),
        s = Math.sin(u),
        x = 1.5 * Math.sign(c) * Math.abs(c) ** 0.3,
        py = y(1775 - 1525 * Math.sign(s) * Math.abs(s) ** 0.3);
      raw.push([x, Math.max(py, seabed(x, bottom) - y(300))]);
    }
    const lengths = [0];
    for (let i = 1; i < raw.length; i++)
      lengths.push(
        lengths[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]),
      );
    const total = lengths[lengths.length - 1],
      out: [number, number][] = [];
    for (let k = 0, j = 0; k <= 96; k++) {
      const target = (k / 96) * total;
      while (j < raw.length - 2 && lengths[j + 1] < target) j++;
      const v = (target - lengths[j]) / Math.max(1e-9, lengths[j + 1] - lengths[j]);
      out.push([
        THREE.MathUtils.lerp(raw[j][0], raw[j + 1][0], v),
        THREE.MathUtils.lerp(raw[j][1], raw[j + 1][1], v),
      ]);
    }
    return out;
  };
  // Upper limb from the low-latitude side (left) to the polar side; deep limb back again.
  const upper = half(Math.PI),
    lower = half(0),
    ring = [...upper.slice(0, -1), ...lower.slice(0, -1)];
  const at = (s: number): [number, number] => {
    const u = (((s % 1) + 1) % 1) * ring.length,
      a = Math.floor(u) % ring.length,
      b = (a + 1) % ring.length,
      v = u - Math.floor(u);
    return [
      THREE.MathUtils.lerp(ring[a][0], ring[b][0], v),
      THREE.MathUtils.lerp(ring[a][1], ring[b][1], v),
    ];
  };
  return { upper, lower, mid, at };
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
