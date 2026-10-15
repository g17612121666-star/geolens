import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { duneHeight, yardangHeight } from "@/lib/aeolian-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";

/** Lee faces are steeper than the stoss: the slip face is where duneHeight falls downwind. */
function onStoss(f: (x: number, z: number) => number, x: number, z: number) {
  return f(x + 0.02, z) >= f(x - 0.02, z);
}
/** A main barchan plus two smaller ones, all translated by the chosen migration. */
function barchanField(x: number, z: number, shift: number) {
  const small = (x0: number, z0: number, s: number) =>
    duneHeight((x - shift - x0) / s, (z - z0) / s) * s;
  return Math.max(duneHeight(x - shift, z), small(1.95, -1.25, 0.38), small(-2.15, 1.25, 0.32));
}
export default function Aeolian() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const mode = Math.round(params.feature ?? 0),
    v = trueScale ? 1 : 2,
    shift = mode === 0 ? (params.migration ?? 0.4) - 0.4 : 0;
  const height = useMemo(
    () => (x: number, z: number) => {
      if (mode === 1) return 0.04 + yardangHeight(x, z) + 0.01 * (noise(x * 5, z * 5) - 0.5);
      const dune = barchanField(x, z, shift),
        // Wind ripples on the stoss slope and the sand sheet, but not on the avalanche face.
        ripples =
          0.0035 *
          Math.sin(x * 78 + 1.2 * Math.sin(z * 2.3) + 0.6 * noise(x * 3, z * 3)) *
          (dune < 0.01 || onStoss((a, b) => barchanField(a, b, shift), x, z) ? 1 : 0);
      return 0.04 + dune + ripples + 0.008 * (noise(x * 1.5, z * 1.5) - 0.5);
    },
    [mode, shift],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const n = noise(x * 2 + 4, z * 2);
      if (mode === 1) {
        // Yardangs: bedded rock ridges between sand-floored corridors.
        return y > 0.08 ? "#b49a76" : n > 0.6 ? "#cfae7f" : "#d9b986";
      }
      // Darker gravel lag between dunes; clean, paler sand on the dunes.
      return y > 0.06 ? (n > 0.5 ? "#e0b170" : "#d9a865") : n > 0.55 ? "#b88a58" : "#c4955f";
    },
    [mode],
  );
  return (
    <>
      <ScienceStudio
        horizon
        slug="aeolian"
        camera={[4.2, 4, 7]}
        scale="60 × 40 m example · relief ×2 · wind follows the arrow"
        trueScale="1 scene unit = 10 m · equal distances · sand grains enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain
            height={height}
            colour={colour}
            resolution={mode === 0 ? 320 : 220}
            base={-0.15}
            cliff={mode === 0 ? 0.2 : 0.55}
            mottle={0.05}
            section={
              mode === 0
                ? { rock: "sand", soil: 0, regolith: 0, beds: 6 }
                : { rock: "sandstone", soil: 0, regolith: 0.015, beds: 9, soilTone: "sandy" }
            }
          />
          {mode === 0 && (
            <DebrisField
              points={Array.from({ length: 140 }, (_, i) => {
                const x = -2.9 + random(i + 5) * 5.8,
                  z = -1.9 + random(i + 77) * 3.8;
                return [x, height(x, z) + 0.004, z] as [number, number, number];
              }).filter(([x, , z]) => barchanField(x, z, shift) < 0.005)}
              size={0.012}
              color="#8d6f52"
            />
          )}
          {mode === 1 && (
            <DebrisField
              points={Array.from({ length: 160 }, (_, i) => {
                const x = -2.85 + random(i + 31) * 5.7,
                  z = -1.85 + random(i + 63) * 3.7;
                return [x, height(x, z) + 0.01, z] as [number, number, number];
              }).filter(([x, , z]) => yardangHeight(x, z) < 0.05)}
              size={0.022}
              color="#8a7660"
            />
          )}
          {mode === 0 && (
            <Line
              points={Array.from({ length: 121 }, (_, i) => {
                const z = -1.33 + (i / 120) * 2.66,
                  x = -0.5 + 1.75 * (z / 1.35) ** 2 + shift;
                return [x, height(x, z) + 0.006, z] as [number, number, number];
              })}
              color="#e6c99a"
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
                ? "Wind carries sand up the gentle windward (stoss) slope by saltation and surface creep; the finest grains travel in suspension. The grains shown are enlarged to mark direction."
                : "Yardangs are streamlined ridges carved by the wind, usually aligned with the strongest winds. Abrasion and deflation work with weathering and rock structure. They are eroded rock, not piles of dune sand."
            }
            occlude={false}
          />
          <Tag
            pos={[1.6, 0.7, 1.4]}
            text={mode === 0 ? "Horns point downwind" : "Tapered downwind ends"}
            note={
              mode === 0
                ? "The crescent tips lie downwind of the central crest. The slip face is 32° at true scale; doubled relief makes it look steeper. Real angles of repose vary."
                : "These invented ridges taper downwind. Their shapes do not give a wind speed or erosion rate."
            }
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? "Barchan: deposited sand, a gentler windward slope and a steeper lee slip face. Dune position moves the dune downwind without a set speed."
          : "Yardang: rock carved into streamlined ridges, aligned broadly with the erosive wind."}
        <br />
        {
          "Play shows enlarged grains hopping downwind; the dune shape is not simulated from sand transport. Many deserts have rock or gravel surfaces; a dune needs a supply of sand."
        }
      </ScienceReadout>
    </>
  );
}
