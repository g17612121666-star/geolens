import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { settlingDistance, settlingVelocity } from "@/lib/fluvial-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import {
  GeomorphicTerrain,
  WaterRibbon,
  GrassPatch,
  DebrisField,
} from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
const bend = (x: number) => 0.75 * Math.cos(x * 0.9);
export default function RiverDeposition() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const mode = Math.round(params.feature ?? 0),
    flood = params.flood > 0.5,
    grain = params.grain ?? 40,
    v = trueScale ? 1 : 5;
  const height = useMemo(
    () => (x: number, z: number) => {
      if (mode === 0) {
        const d = z - bend(x);
        return (
          0.15 -
          0.009 * x -
          0.09 * Math.exp(-((d / 0.18) ** 4)) +
          0.045 * Math.exp(-(((d + 0.27) / 0.17) ** 2)) * Math.exp((-x * x) / 2)
        );
      }
      if (mode === 1) {
        const d = Math.abs(z);
        return (
          0.14 -
          0.006 * x +
          0.045 * Math.exp(-(((d - 0.3) / 0.16) ** 2)) -
          0.1 * Math.exp(-((d / 0.22) ** 8))
        );
      }
      const delta = Math.max(0, 1 - (x + 1.7) / 4.2),
        spread = 0.2 + Math.max(0, x + 1.7) * 0.42;
      return -0.12 + (0.29 * delta) / (1 + Math.exp((Math.abs(z) - spread) * 14));
    },
    [mode],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) =>
      mode === 0
        ? z - bend(x) < -0.13 && z - bend(x) > -0.45 && Math.abs(x) < 1.6
          ? "#cdb58a"
          : "#7e9475"
        : mode === 1
          ? Math.abs(z) < 0.6
            ? "#c0aa83"
            : "#899479"
          : y > 0
            ? "#b7ac85"
            : "#928c79",
    [mode],
  );
  const paths = useMemo(
    () =>
      mode < 2
        ? [
            Array.from({ length: 181 }, (_, i) => {
              const x = -3 + (i / 180) * 6,
                z = mode === 0 ? bend(x) : 0;
              return [x, 0.115 - 0.006 * x, z] as [number, number, number];
            }),
          ]
        : [-1, 0, 1].map((branch) =>
            Array.from({ length: 121 }, (_, i) => {
              const x = -3 + (i / 120) * 5.6,
                z = x < -1.5 ? 0 : branch * (x + 1.5) * 0.4;
              return [x, Math.max(0.018, height(x, z) + 0.025), z] as [number, number, number];
            }),
          ),
    [mode, height],
  );
  return (
    <>
      <ScienceStudio
        slug="river-deposition"
        camera={[3.5, 4.3, 7]}
        scale="600 × 400 m conceptual reach · relief ×5 · sediment symbols enlarged"
        trueScale="1 scene unit = 100 m · one geometric scale · water, sediment and vegetation symbols enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain height={height} colour={colour} base={-0.18} />
          {paths.map((p, i) => (
            <WaterRibbon key={i} path={p} width={mode === 2 ? 0.065 : 0.15} />
          ))}
          {mode === 1 && flood && (
            <mesh position={[0, 0.194, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[6, 4]} />
              <FlowWaterMaterial color="#8ab4b7" opacity={0.4} flow={[1, 0.5]} speed={0.3} />
            </mesh>
          )}
          {mode === 2 && (
            <mesh position={[1.2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3.6, 4]} />
              <FlowWaterMaterial color="#79b7c2" opacity={0.62} flow={[0.3, 0.1]} speed={0.15} />
            </mesh>
          )}
          {mode === 0 && (
            <group scale={[1, 1 / v, 1]}>
              <DebrisField
                points={Array.from({ length: 60 }, (_, i) => {
                  const x = -1.45 + random(i + 843) * 2.9,
                    z = bend(x) - 0.2 - random(i + 286) * 0.18;
                  return [x, (height(x, z) + 0.007) * v, z];
                })}
                size={0.014}
                color="#b5a187"
              />
            </group>
          )}
          {mode !== 2 && (
            <GrassPatch
              positions={Array.from({ length: 44 }, (_, i) => {
                const x = -2.8 + random(i + 748) * 5.6,
                  z = (random(i + 343) < 0.5 ? -1 : 1) * (1.1 + random(i + 674) * 0.75);
                return [x, height(x, z), z];
              })}
              height={0.045 / v}
            />
          )}
          {paths.map((p, k) =>
            Array.from({ length: 13 }, (_, i) => {
              const a = p[Math.floor(((t + i / 13) % 1) * (p.length - 1))];
              return (
                <mesh key={`${k}-${i}`} position={[a[0], a[1] + 0.012, a[2]]} scale={[1, 1 / v, 1]}>
                  <sphereGeometry args={[0.019, 8, 6]} />
                  <meshBasicMaterial color="#edd1a3" />
                </mesh>
              );
            }),
          )}
          {mode === 0 ? (
            <>
              <Tag
                pos={[0, 0.45, -0.15]}
                text="Point bar"
                note="This inner-bank deposit is on the inside of a bend. Secondary circulation, boundary shear and sediment supply shape erosion and deposition; a single surface-speed arrow cannot explain the entire cross-section."
                occlude={false}
              />
              <Arrow from={[-0.5, 0.22, 1.0]} to={[0.6, 0.22, 1.0]} color="#a2ced3" width={0.65} />
            </>
          ) : mode === 1 ? (
            <>
              <Tag
                pos={[0, 0.45, 0.6]}
                text="Natural levee"
                note="Repeated overbank flows can deposit relatively coarse sediment near the channel, building low banks. These are sedimentary landforms, not constructed flood defences."
                occlude={false}
              />
              <Tag
                pos={[1.7, 0.28, -1.6]}
                text="Floodplain"
                note="Fine material can travel farther in overbank flow. Natural levees and floodplain sediments vary with flow, sediment size, vegetation and repeated floods."
                occlude={false}
              />
            </>
          ) : (
            <>
              <Tag
                pos={[1.8, 0.42, 0.9]}
                text="Distributaries"
                note="A delta can grow where sediment supply and deposition exceed removal and available space is filled. Channels split and shift; this three-branch pattern is an illustration."
                occlude={false}
              />
              <Tag
                pos={[-1.5, 0.5, -1.3]}
                text="River mouth"
                note="Not every river mouth builds a delta. Tides, waves, sea-level history and sediment supply can maintain an estuary. Neither receiving water nor the absence of tides alone determines the outcome."
                occlude={false}
              />
            </>
          )}
        </group>
        <group position={[-2.3, 0.55, -2.4]}>
          <mesh>
            <cylinderGeometry args={[0.19, 0.19, 0.9, 32, 1, true]} />
            <meshPhysicalMaterial
              color="#99c9d1"
              transparent
              opacity={0.16}
              roughness={0.15}
              side={2}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[
              0,
              -0.45 + Math.max(0, 1 - (t * settlingVelocity(grain * 1e-6) * 1200) / 2) * 0.9,
              0,
            ]}
          >
            <icosahedronGeometry args={[0.035, 1]} />
            <meshStandardMaterial color="#d2be93" roughness={0.9} />
          </mesh>
          <Tag
            pos={[0, 0.65, 0]}
            text="Settling · 2 m / 20 min"
            note="Separate enlarged vessel: the global timeline spans 20 minutes. The grain position uses the stated Stokes settling speed through 2 m of still fresh water. The vessel is not at the landscape scale."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? "Inner-bank point bar within a curved channel. Flow tracers move downstream; the selected bar is not growing."
          : mode === 1
            ? `${flood ? "Overbank flow shown" : "Channel flow shown"} · natural levees border a lower floodplain. Toggle Overbank water to reveal the relation.`
            : "A sediment-built delta with branching distributaries meets standing water. This is one mouth type; estuaries are different receiving environments."}
        <br />
        {"Separate settling experiment: "}
        {grain.toFixed(0)} {"μm quartz spheres settle at "}
        {(settlingVelocity(grain * 1e-6) * 1000).toFixed(2)}{" "}
        {
          "mm/s in still 20 °C fresh water; at 0.1 m/s horizontal transport through 2 m depth, distance ≈ "
        }
        {settlingDistance(grain * 1e-6).toFixed(0)} {"m. Turbulence and flocculation are excluded."}
      </ScienceReadout>
    </>
  );
}
