import { useMemo } from "react";
import { useIsCompact } from "@/hooks/use-media";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { carbonBudget, CARBON_STORES } from "@/lib/carbon-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
const POS: [number, number, number][] = [
  [-4.2, 1.1, 0],
  [0, 1.1, 0],
  [4.2, 1.1, 0],
  [2.8, -1.5, 0],
  [-2.8, -1.5, 0],
];
const COLOURS = ["#a6cccf", "#829b69", "#568798", "#bda88b", "#65584a"];
function Reservoir({ kind, radius }: { kind: number; radius: number }) {
  if (kind === 1)
    return (
      <group>
        <mesh>
          <sphereGeometry args={[radius, 48, 32]} />
          <meshPhysicalMaterial
            color="#83a178"
            transparent
            opacity={0.14}
            roughness={0.7}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -radius * 0.46, 0]}>
          <cylinderGeometry args={[radius * 0.76, radius * 0.67, radius * 0.16, 48]} />
          <TerrainMaterial kind="soil" color="#70634a" />
        </mesh>
        <PlantStand
          positions={[
            [0, -radius * 0.38, 0],
            [-radius * 0.35, -radius * 0.38, radius * 0.18],
            [radius * 0.3, -radius * 0.38, -radius * 0.14],
          ]}
          scale={radius * 0.34}
          kind="broadleaf"
          seed={7}
        />
      </group>
    );
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 64, 48]} />
        {kind === 2 ? (
          <FlowWaterMaterial color="#527f97" opacity={0.82} speed={0.2} />
        ) : kind === 0 ? (
          <meshPhysicalMaterial
            color="#a6cccf"
            transparent
            opacity={0.16}
            depthWrite={false}
            roughness={0.35}
          />
        ) : (
          <RockMaterial color={COLOURS[kind]} roughness={0.92} />
        )}
      </mesh>
      {kind === 0 &&
        Array.from({ length: 16 }, (_, i) => {
          const a = i * 2.399,
            r = radius * 0.7 * Math.sqrt((i + 1) / 16);
          return (
            <group
              key={i}
              position={[r * Math.cos(a), radius * 0.6 * Math.sin(i * 7.1), r * Math.sin(a)]}
              rotation={[i * 0.3, i * 0.5, 0]}
            >
              {[-1, 0, 1].map((j) => (
                <mesh key={j} position={[j * radius * 0.08, 0, 0]}>
                  <sphereGeometry args={[radius * (j === 0 ? 0.036 : 0.044), 10, 8]} />
                  <meshStandardMaterial color={j === 0 ? "#63696c" : "#b78778"} roughness={0.6} />
                </mesh>
              ))}
            </group>
          );
        })}
      {kind >= 3 &&
        [-0.45, 0, 0.45].map((y) => {
          const r = radius * Math.sqrt(1 - y * y);
          return (
            <Line
              key={y}
              points={Array.from(
                { length: 97 },
                (_, i) =>
                  [
                    r * Math.cos((i / 96) * Math.PI * 2),
                    radius * y,
                    r * Math.sin((i / 96) * Math.PI * 2),
                  ] as [number, number, number],
              )}
              color={kind === 3 ? "#d0bba0" : "#38332d"}
              transparent
              opacity={0.55}
              lineWidth={2}
            />
          );
        })}
    </group>
  );
}
export default function CarbonCycle() {
  const { params, t } = useLabControls();
  useLabTick(1 / 65);
  const compact = useIsCompact(),
    positions: [number, number, number][] = compact
      ? [
          [-1.7, 2.2, 0],
          [1.7, 2.2, 0],
          [0, 0, 0],
          [-1.7, -2.2, 0],
          [1.7, -2.2, 0],
        ]
      : POS;
  const tap = params.fossil ?? 0.2,
    selected = Math.round(params.flux ?? 7),
    budget = useMemo(() => carbonBudget(t * 100, tap), [t, tap]),
    radii = budget.stores.map((m) => 0.32 * Math.cbrt(m / 600));
  const flux = budget.fluxes[selected],
    a = new THREE.Vector3(...positions[flux.from]),
    b = new THREE.Vector3(...positions[flux.to]),
    d = b.clone().sub(a).normalize(),
    start = a.clone().addScaledVector(d, radii[flux.from] + 0.06),
    end = b.clone().addScaledVector(d, -radii[flux.to] - 0.06),
    middle = start
      .clone()
      .lerp(end, 0.5)
      .add(new THREE.Vector3(compact && selected === 7 ? -2 : 0, 0, compact ? 0.5 : 0.7));
  const curve = new THREE.QuadraticBezierCurve3(start, middle, end),
    points = curve.getPoints(48),
    active = flux.rate > 1e-8;
  return (
    <>
      <ScienceStudio
        slug="carbon-cycle"
        camera={[0, 0.2, 8]}
        scale="Invented closed budget · sphere volume ∝ stored carbon · no geographic distances"
        trueScale="Volumes encode this invented budget, not observed global reservoir sizes"
      >
        {positions.map((pos, i) => (
          <group key={i} position={pos}>
            <Reservoir kind={i} radius={radii[i]} />
            <Tag
              pos={[0, radii[i] + (compact ? 0.6 : 0.36), 0]}
              text={
                compact
                  ? CARBON_STORES[i]
                  : `${CARBON_STORES[i]} · ${budget.stores[i].toFixed(0)} Pg C`
              }
              note={`${budget.stores[i].toFixed(1)} Pg C in this invented closed teaching budget. This is not a measured estimate of Earth’s carbon. The outer sphere volumes, not radii, encode the amounts. Contents identify reservoir types; trees and molecular symbols are enlarged and are not counted measurements.`}
              occlude={false}
            />
          </group>
        ))}
        <Line
          points={points}
          color={selected === 7 ? "#e6a077" : "#9ed0ca"}
          lineWidth={active ? 2.5 : 1}
          dashed={!active}
        />
        {active && (
          <>
            <Arrow
              from={curve.getPoint(0.86).toArray() as [number, number, number]}
              to={end.toArray() as [number, number, number]}
              color={selected === 7 ? "#e6a077" : "#9ed0ca"}
              width={1}
            />
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} position={curve.getPoint((t * 6 + i / 9) % 1)}>
                <sphereGeometry args={[0.04, 16, 12]} />
                <meshBasicMaterial color="#e8cf9e" />
              </mesh>
            ))}
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {"Model year "}
        {(t * 100).toFixed(1)} · {flux.name}: {flux.rate.toFixed(2)} {"Pg C/year. Burned "}
        {budget.emitted.toFixed(1)} {"Pg C; total "}
        {budget.total.toFixed(1)} {"Pg C stays fixed."}
        <br />
        {
          "The selected budget uses 1 Pg C = 10¹² kg of carbon. Each transfer removes the same quantity from one store as it adds to another."
        }
      </ScienceReadout>
    </>
  );
}
