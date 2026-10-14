import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { isostaticColumn, AIRY } from "@/lib/isostasy-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
export default function Isostasy() {
  const { params, trueScale } = useLabControls(),
    ice = params.ice ?? 1650,
    result = isostaticColumn(ice),
    bare = isostaticColumn(0);
  const scale = 1 / 10000,
    exaggeration = trueScale ? 1 : 5,
    land = (bare.landElevation - result.depression * exaggeration) * scale;
  return (
    <>
      <ScienceStudio
        slug="isostasy"
        scale="Load and vertical displacement ×5 · local Airy equilibrium"
        trueScale="All lengths share a scale · 1 scene unit = 10 km"
        camera={[4, 2.8, 6]}
      >
        <mesh position={[0, -1.9, 0]}>
          <boxGeometry args={[4.6, 3.8, 2.8]} />
          <meshStandardMaterial
            color="#b8673d"
            roughness={0.9}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        {/* Unloaded neighbours: the same crust at its ice-free equilibrium, for comparison. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[
              side * 1.66,
              bare.landElevation * scale - (AIRY.crustThickness * scale) / 2,
              0,
            ]}
          >
            <boxGeometry args={[0.96, AIRY.crustThickness * scale, 1.8]} />
            <RockMaterial color="#c7b896" desaturate={0.9} transparent opacity={0.55} />
          </mesh>
        ))}
        <mesh position={[0, land - (AIRY.crustThickness * scale) / 2, 0]}>
          <boxGeometry args={[2.1, AIRY.crustThickness * scale, 1.8]} />
          <RockMaterial color="#c4b48f" desaturate={0.9} />
        </mesh>
        {ice > 0 && (
          <mesh position={[0, land + (ice * scale * exaggeration) / 2, 0]}>
            <boxGeometry args={[2.1, ice * scale * exaggeration, 1.8]} />
            <meshPhysicalMaterial
              color="#b0d7df"
              roughness={0.2}
              metalness={0}
              transparent
              opacity={0.86}
              ior={1.31}
              clearcoat={0.35}
            />
          </mesh>
        )}
        {Array.from({ length: 6 }, (_, i) => (
          <Line
            key={i}
            points={Array.from({ length: 49 }, (_, j) => {
              const x = -1.05 + (j / 48) * 2.1;
              return [x, land - 0.3 - i * 0.46 + 0.012 * Math.sin(x * 9 + i), 0.906] as [
                number,
                number,
                number,
              ];
            })}
            color="#d0ba98"
            transparent
            opacity={0.6}
            lineWidth={1.2}
          />
        ))}
        {ice > 0 &&
          Array.from({ length: 6 }, (_, i) => (
            <Line
              key={i}
              points={Array.from({ length: 31 }, (_, j) => {
                const x = -1.04 + (j / 30) * 2.08;
                return [x, land + ice * scale * exaggeration * (0.1 + i * 0.14), 0.908] as [
                  number,
                  number,
                  number,
                ];
              })}
              color="#f0f5ee"
              transparent
              opacity={0.48}
              lineWidth={0.8}
            />
          ))}
        <Line
          points={[
            [-2, 0, 1.5],
            [2, 0, 1.5],
          ]}
          color="#9fac9c"
          dashed
          dashSize={0.1}
          gapSize={0.06}
        />
        <Arrow
          from={[1.55, bare.landElevation * scale, 1]}
          to={[1.55, land, 1]}
          color="#e4b77c"
          width={0.5}
        />
        <Tag
          pos={[-1.65, -2.7, 1]}
          text="Mantle · solid, creeping"
          note="The mantle can deform over long timescales while remaining mostly solid. The surrounding volume is translucent to reveal the crustal root, not to depict a liquid tank."
          occlude={false}
        />
        <Tag
          pos={[0, land + 0.55 + ice * scale * exaggeration, 0]}
          text={`${Math.round(ice)} m of ice`}
          note="Ice loading depresses the column by its added mass divided by mantle density. Real adjustment is delayed and spreads through lithospheric flexure."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Ice "}
        {Math.round(ice)} {"m → equilibrium depression "}
        {result.depression.toFixed(0)}{" "}
        {"m. Mantle / crust / ice densities: 3300 / 2800 / 917 kg/m³."}
        <br />
        {
          "The rock column keeps its thickness and mass. Unloading raises the equilibrium position; this static experiment does not predict rebound timing or global sea level."
        }
      </ScienceReadout>
    </>
  );
}
