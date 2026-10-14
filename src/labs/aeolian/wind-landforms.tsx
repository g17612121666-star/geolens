import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { duneHeight, yardangHeight } from "@/lib/aeolian-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
export default function Aeolian() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const mode = Math.round(params.feature ?? 0),
    v = trueScale ? 1 : 2,
    shift = mode === 0 ? (params.migration ?? 0.4) - 0.4 : 0;
  const height = useMemo(
    () => (x: number, z: number) =>
      0.04 + (mode === 0 ? duneHeight(x - shift, z) : yardangHeight(x, z)),
    [mode, shift],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) =>
      mode === 0 ? (y > 0.06 ? "#dcaa66" : "#c99659") : y > 0.15 ? "#b39b78" : "#d6b583",
    [mode],
  );
  return (
    <>
      <ScienceStudio
        slug="aeolian"
        camera={[4.2, 4, 7]}
        scale="60 × 40 m selected landform · relief ×2 · wind points +x"
        trueScale="1 scene unit = 10 m · equal distances · sand grains enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain
            height={height}
            colour={colour}
            resolution={192}
            base={-0.15}
            material="beach"
          />
          {mode === 0 &&
            Array.from({ length: 28 }, (_, i) => {
              const z = -1.25 + (i / 27) * 2.5,
                q = Math.abs(z) / 1.35,
                crest = -0.5 + 1.75 * q * q + shift,
                h = 0.52 * (1 - q * q),
                end = crest + h / Math.tan((32 * Math.PI) / 180);
              return (
                <Line
                  key={`slip-${i}`}
                  points={Array.from({ length: 18 }, (_, j) => {
                    const x = crest + ((end - crest) * j) / 17;
                    return [x, height(x, z) + 0.003, z + 0.006 * Math.sin(j * 0.7 + i)] as [
                      number,
                      number,
                      number,
                    ];
                  })}
                  color="#a78050"
                  lineWidth={0.45}
                  transparent
                  opacity={0.45}
                />
              );
            })}
          {mode === 1 && (
            <DebrisField
              points={Array.from({ length: 90 }, (_, i) => {
                const x = -2.8 + (i % 15) * 0.4,
                  z = -1.8 + Math.floor(i / 15) * 0.64;
                return [x, height(x, z) + 0.014, z];
              })}
              size={0.025}
              color="#847767"
            />
          )}
          {mode === 0 && (
            <Line
              points={Array.from({ length: 121 }, (_, i) => {
                const z = -1.33 + (i / 120) * 2.66,
                  x = -0.5 + 1.75 * (z / 1.35) ** 2 + shift;
                return [x, height(x, z) + 0.006, z] as [number, number, number];
              })}
              color="#d2a466"
              lineWidth={1.3}
            />
          )}
          {Array.from({ length: 65 }, (_, i) => {
            const u = (t + i / 65) % 1,
              x = -2.8 + 5.6 * u,
              z = -1.7 + ((i % 11) / 10) * 3.4,
              hop = 0.08 * Math.sin(((u * 14 + i) % 1) * Math.PI);
            return (
              <mesh key={i} position={[x, height(x, z) + 0.025 + hop, z]}>
                <sphereGeometry args={[0.019, 8, 6]} />
                <meshBasicMaterial color="#ead0a0" />
              </mesh>
            );
          })}
          <Arrow from={[-2.5, 1.45, 1.55]} to={[-0.7, 1.45, 1.55]} width={1} color="#bad4d1" />
          <Tag
            pos={[-1.3, 1.3, -1.7]}
            text={mode === 0 ? "Gentler stoss slope" : "Wind-eroded ridges"}
            note={
              mode === 0
                ? "Wind carries sand up the windward stoss slope. Transport includes saltation, surface creep and suspension of sufficiently fine material. The drawn grains are enlarged direction markers."
                : "Yardangs are streamlined erosional remnants, commonly aligned with prevailing erosive winds. Abrasion and deflation act with weathering and rock structure. They are not heaps of deposited dune sand."
            }
            occlude={false}
          />
          <Tag
            pos={[1.6, 0.7, 1.4]}
            text={mode === 0 ? "Horns point downwind" : "Tapered downwind ends"}
            note={
              mode === 0
                ? "The crescent tips lie downwind of the central crest. The centre leeward slip face is 32° at true scale; twice-enlarged relief makes it look steeper. Actual repose angles vary."
                : "These invented ridges taper along the wind direction. Their shapes do not determine a wind speed or erosion rate."
            }
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? "Barchan: deposited sand, a gentler windward slope and a steeper lee slip face. Migration translates the chosen shape downwind without assigning a rate."
          : "Yardang: rock carved into streamlined ridges, aligned broadly with the erosive wind."}
        <br />
        {
          "Play follows enlarged hopping grains downwind. The static shape is not a sediment-transport simulation. Many deserts have rock or gravel surfaces; a dune requires an available sand supply."
        }
      </ScienceReadout>
    </>
  );
}
