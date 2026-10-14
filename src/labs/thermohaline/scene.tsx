import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { classroomDensity } from "@/lib/ocean-circulation-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { WaterPrism } from "../shared/water-prism";
import { RockPrism } from "../shared/rock-prism";
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
            <RockPrism
              points={[
                [-2, y(4000)],
                [2, y(4000)],
                [2, y(4000) - 0.1],
                [-2, y(4000) - 0.1],
              ]}
              depth={1.6}
            />
            <WaterPrism
              points={[
                [-2, 0],
                [2, 0],
                [2, y(4000)],
                [-2, y(4000)],
              ]}
              colour="#32667c"
              opacity={0.2}
            />
            <OceanSurface
              points={[
                [-2, 0],
                [2, 0],
              ]}
              opacity={0.42}
            />
            <TemperatureFace bottom={y(4000)} />
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

/**
 * Front-face temperature section: warm surface water at low latitude (left) cooling
 * towards the pole (right) and with depth. Colours are schematic, not measured data.
 */
function TemperatureFace({ bottom }: { bottom: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(4, -bottom, 40, 24),
      p = g.attributes.position,
      colours = new Float32Array(p.count * 3),
      warm = new THREE.Color("#e39a5c"),
      cool = new THREE.Color("#7fb6cf"),
      cold = new THREE.Color("#25507a"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const across = (p.getX(i) + 2) / 4,
        depth = 1 - (p.getY(i) + -bottom / 2) / -bottom;
      const surface = warm.clone().lerp(cool, across);
      c.copy(surface).lerp(cold, Math.min(1, Math.pow(depth, 0.45) + across * 0.25));
      colours.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return g;
  }, [bottom]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, bottom / 2, 0.805]}>
      <meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}
