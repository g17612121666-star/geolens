import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { catenaProfile } from "@/lib/soil-profile-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockPrism } from "../shared/rock-prism";
import { GrassPatch, RootNetwork, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
export default function SoilCatena() {
  const { params, trueScale } = useLabControls(),
    slope = params.slope ?? 0.55,
    thicknessScale = (trueScale ? 1 : 20) / 20;
  const top = useMemo(
      () =>
        Array.from({ length: 81 }, (_, i): [number, number] => {
          const x = -3 + (i / 80) * 6;
          return [x, catenaProfile(x, slope).surface];
        }),
      [slope],
    ),
    base = top.map(([x, y]): [number, number] => [
      x,
      y - catenaProfile(x, slope).thicknessM * thicknessScale,
    ]);
  const names = ["Crest", "Backslope", "Footslope / toe"],
    positions = [-2.5, -0.7, 2.4];
  return (
    <>
      <ScienceStudio
        slug="soil-catena"
        camera={[1.3, 2.1, 7]}
        scale="Soil thickness ×20 · 120 m hillslope · topographic slope to scale"
        trueScale="1 scene unit = 20 m · soil and relief use a common scale · blades and roots enlarged"
      >
        <RockPrism points={[...base, [3, -1.5], [-3, -1.5]]} depth={2} color="#b4a187" />
        <RockPrism points={[...top, ...base.slice().reverse()]} depth={2} color="#67513a" />
        <GrassPatch
          positions={Array.from({ length: 110 }, (_, i) => {
            const x = -2.9 + random(i + 120) * 5.8,
              z = -0.94 + random(i + 430) * 1.88;
            return [x, catenaProfile(x, slope).surface, z];
          })}
          height={0.11}
        />
        {positions.map((x, i) => (
          <RootNetwork
            key={i}
            x={x}
            y={catenaProfile(x, slope).surface - 0.015}
            z={1.008}
            depth={Math.min(0.45, catenaProfile(x, slope).thicknessM * thicknessScale * 0.8)}
            spread={0.15}
            seed={i}
          />
        ))}
        <DebrisField
          points={Array.from({ length: 36 }, (_, i) => {
            const x = -2.9 + random(i + 753) * 5.8;
            return [
              x,
              catenaProfile(x, slope).surface -
                catenaProfile(x, slope).thicknessM * thicknessScale -
                0.07 -
                random(i + 553) * 0.34,
              1.015,
            ];
          })}
          size={0.035}
        />
        <Line points={top.map(([x, y]) => [x, y + 0.015, 1.01])} color="#86a477" lineWidth={3} />
        {positions.map((x, i) => {
          const c = catenaProfile(x, slope),
            end: [number, number, number] = [x, c.surface + 0.25, 1.1];
          return (
            <group key={i}>
              <Line points={[[x, c.surface, 1.01], end]} color="#d8c294" />
              <Tag
                pos={end}
                text={`${names[i]} · ${c.thicknessM.toFixed(2)} m soil`}
                note={
                  i === 0
                    ? "A crest can export water and sediment, but soil thickness also depends on parent material, time, climate and land use. This sequence is one illustrative case."
                    : i === 1
                      ? "Steepening reduces prescribed backslope thickness in this example. The model is not an erosion-rate law and does not guarantee that every steep soil is thin."
                      : "The lower slope receives water and sediment. Accumulation can deepen the soil; wetter conditions may alter drainage and horizon colours."
                }
                occlude={false}
              />
            </group>
          );
        })}
        {[-1.8, 0, 1.5].map((x) => (
          <Arrow
            key={x}
            from={[x, catenaProfile(x, slope).surface + 0.45, 0]}
            to={[x + 0.65, catenaProfile(x + 0.65, slope).surface + 0.45, 0]}
            color="#87c9d7"
            width={1}
          />
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {
          "Soils share the same parent material, but their position on the slope changes drainage and sediment movement: the crest and backslope lose material, while the toe receives water and sediment."
        }
        <br />
        {
          "Change Slope to compare a prescribed sequence. Only soil thickness is enlarged in the teaching view. Soil development, erosion and deposition rates are not calculated."
        }
      </ScienceReadout>
    </>
  );
}
