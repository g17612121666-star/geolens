import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { soilExport } from "@/lib/soil-erosion-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import {
  GeomorphicTerrain,
  WaterRibbon,
  GrassPatch,
  RootNetwork,
  DebrisField,
} from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
function Plot({
  covered,
  wind,
  t,
  x,
  real,
}: {
  covered: boolean;
  wind: boolean;
  t: number;
  x: number;
  real: boolean;
}) {
  const result = soilExport(60 * t, covered, wind),
    loss = (result.meanLossMm / 1000 / 5) * (real ? 1 : 30),
    base = (x: number) => 0.5 - 0.12 * x;
  const height = useMemo(() => (x: number, z: number) => base(x) - loss, [loss]),
    colour = useMemo(() => () => (covered ? "#485e35" : "#775b3c"), [covered]);
  return (
    <group position={[x, 0, 0]}>
      <GeomorphicTerrain
        height={height}
        colour={colour}
        width={4}
        depth={2}
        base={-0.12}
        material="soil"
      />
      {covered && (
        <>
          <GrassPatch
            positions={Array.from({ length: 150 }, (_, i) => {
              const a = -1.9 + random(i + 72) * 3.8,
                z = -0.94 + random(i + 429) * 1.88;
              return [a, height(a, z), z];
            })}
            height={0.16}
          />
          {[-1.5, -0.7, 0.1, 0.9, 1.7].map((a, i) => (
            <RootNetwork
              key={i}
              x={a}
              y={height(a, 1)}
              z={1.012}
              depth={0.22}
              spread={0.13}
              seed={i}
            />
          ))}
        </>
      )}
      <DebrisField
        points={Array.from({ length: 42 }, (_, i) => {
          const a = -1.85 + random(i + 931) * 3.7,
            z = -0.91 + random(i + 818) * 1.82;
          return [a, height(a, z) + 0.015, z];
        })}
        size={0.018}
        color="#9c8768"
      />
      {Array.from({ length: 32 }, (_, i) => {
        const a = -1.9 + ((t * 2 + i / 32) % 1) * 3.8,
          z = -0.85 + ((i % 9) / 8) * 1.7,
          phase = (t * 12 + i * 0.31) % 1;
        return (
          <mesh
            key={i}
            position={
              wind
                ? [a, height(a, z) + 0.05 + 0.16 * Math.sin(phase * Math.PI), z]
                : [a, height(a, z) + 0.02 + (1 - phase) * 0.7, z]
            }
          >
            <sphereGeometry args={[wind ? 0.022 : 0.013, 8, 6]} />
            <meshBasicMaterial
              color={wind ? "#c7a46e" : "#92c4ce"}
              transparent
              opacity={covered ? 0.3 : 0.8}
            />
          </mesh>
        );
      })}
      {!wind &&
        [-0.6, 0, 0.6].map((z) => (
          <WaterRibbon
            key={z}
            path={Array.from({ length: 61 }, (_, i) => {
              const a = -2 + (i / 60) * 4;
              return [a, height(a, z) + 0.009, z + 0.04 * Math.sin(a * 4)] as [
                number,
                number,
                number,
              ];
            })}
            width={covered ? 0.008 : 0.023}
            opacity={0.55}
            color="#8eaaa4"
          />
        ))}
      <Arrow from={[-1.4, 0.9, 1.2]} to={[1.2, 0.65, 1.2]} color="#c6cdb7" width={0.8} />
      <Tag
        pos={[0, 0.9, -1.35]}
        text={covered ? "Covered plot" : "Bare plot"}
        note={`Invented active-layer budget: remaining ${result.remaining.toFixed(1)} kg, in transport ${result.moving.toFixed(1)} kg and exported ${result.exported.toFixed(1)} kg. Total remains 6000 kg. The covered detachment coefficient is chosen as 15% of the bare value; this is not a measured universal reduction.`}
        occlude={false}
      />
    </group>
  );
}
export default function SoilErosion() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 55);
  const covered = params.veg > 0.5,
    wind = params.wind > 0.5,
    a = soilExport(t * 60, false, wind),
    b = soilExport(t * 60, covered, wind);
  return (
    <>
      <ScienceStudio
        slug="soil-erosion"
        camera={[4.6, 4.5, 8]}
        scale="Two 20 × 10 m plots · surface lowering ×30 · enlarged process tracers"
        trueScale="1 scene unit = 5 m · actual mean surface lowering · process tracers enlarged"
      >
        <Plot covered={false} wind={wind} t={t} x={-2.5} real={trueScale} />
        <Plot covered={covered} wind={wind} t={t} x={2.5} real={trueScale} />
      </ScienceStudio>
      <ScienceReadout>
        {"Model minute "}
        {(t * 60).toFixed(1)} {"· bare export "}
        {a.exported.toFixed(0)} {"kg / mean loss "}
        {a.meanLossMm.toFixed(2)} {"mm · comparison export "}
        {b.exported.toFixed(0)} {"kg / mean loss "}
        {b.meanLossMm.toFixed(2)} {"mm."}
        <br />
        {
          "Invented 6000 kg active layer per plot: remaining + in transport + exported stays constant. "
        }
        {wind
          ? "Dry wind-transport example."
          : "Rain detachment and runoff-transport example; blue routes indicate concentrated flow, not calculated rill depths."}{" "}
        {
          "Vegetation changes a disclosed coefficient; neither soil loss nor protection is a site prediction."
        }
      </ScienceReadout>
    </>
  );
}
