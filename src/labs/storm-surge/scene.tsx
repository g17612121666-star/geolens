import { useMemo } from "react";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { shelfSetup } from "@/lib/ocean-wave-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { OceanSection } from "../shared/ocean-section";
import { RockPrism } from "../shared/rock-prism";
import { Tag } from "../shared/kit";
export default function StormSurge() {
  const { params, trueScale } = useLabControls(),
    wind = params.wind ?? 30,
    depth = params.depth ?? 20,
    pressure = params.pressure ?? 3000,
    f = trueScale ? 1 : 1000;
  const result = useMemo(() => shelfSetup(wind, depth, pressure), [wind, depth, pressure]);
  const samples = useMemo(
    () =>
      result.points.map((p) => ({
        x: p.x / 20000 - 2.5,
        bed: (-depth / 20000) * f,
        surface: (p.eta / 20000) * f,
      })),
    [result, depth, f],
  );
  return (
    <>
      <ScienceStudio
        slug="storm-surge"
        camera={[1.6, 2.3, 7]}
        scale="Vertical dimensions ×1000 · 100 km flat shelf · steady coastal setup"
        trueScale="1 scene unit = 20 km · real sea-level rise is small beside shelf width"
      >
        <OceanSection samples={samples} base={(-depth / 20000) * f - 0.12} />
        <RockPrism
          points={[
            [2.5, (10 / 20000) * f],
            [2.62, (10.4 / 20000) * f],
            [2.78, (11 / 20000) * f],
            [3, (10.5 / 20000) * f],
            [3, (-depth / 20000) * f],
            [2.5, (-depth / 20000) * f],
          ]}
          depth={1.8}
          color="#a69474"
        />
        {wind > 0 &&
          [-0.55, 0, 0.55].flatMap((z) =>
            [0.45, 0.7].map((h) => (
              <Line
                key={`${z}-${h}`}
                points={Array.from(
                  { length: 65 },
                  (_, i) =>
                    [-2.35 + (i / 64) * 4.65, h + 0.012 * Math.sin(i * 0.6 + z), z] as [
                      number,
                      number,
                      number,
                    ],
                )}
                color="#d8d7c0"
                transparent
                opacity={0.12 + (wind / 45) * 0.28}
                lineWidth={0.6 + wind / 45}
              />
            )),
          )}
        <Line
          points={[
            [-2.5, 0.001, 1],
            [2.5, 0.001, 1],
          ]}
          color="#bbc3b8"
          dashed
          dashSize={0.07}
          gapSize={0.04}
        />
        {wind > 0 &&
          [-1.5, 0, 1.5].map((x) => (
            <Arrow
              key={x}
              from={[x - 0.35, 0.65, 0]}
              to={[x + 0.35, 0.65, 0]}
              color="#d9b57e"
              width={1.2}
            />
          ))}
        <Tag
          pos={[-1.8, 0.95, 0]}
          text={`Onshore wind ${wind} m/s`}
          note="Wind stress is rho_air × Cd × speed², using air density 1.225 kg/m³ and constant drag coefficient 0.0015. These are disclosed teaching inputs."
          occlude={false}
        />
        <Tag
          pos={[2.3, 0.85 + (result.coastalSetup / 20000) * f, 0]}
          text={`Setup ${result.coastalSetup.toFixed(2)} m`}
          note="The offshore end is held at mean sea level and the coast is closed. The steady slope balances onshore wind stress and an imposed atmospheric pressure gradient."
          occlude={false}
        />
        <Tag
          pos={[0, (-depth / 20000) * f - 0.35, 0.9]}
          text={`Shelf depth ${depth} m`}
          note="The shelf is flat. Real coastal bathymetry, storm track, storm duration, tide, Coriolis and wave breaking are excluded."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Wind stress "}
        {result.stress.toFixed(2)} {"Pa · imposed pressure drop "}
        {pressure} {"Pa ("}
        {(pressure / 100).toFixed(0)} {"hPa). Pressure-only rise "}
        {result.inverseBarometer.toFixed(2)} {"m."}
        <br />
        {"Combined steady setup "}
        {result.coastalSetup.toFixed(2)}{" "}
        {
          "m. The textured shore is a closed boundary, not mapped terrain; pale lines mark imposed onshore airflow. This excludes tides, waves and inundation and must not be used as a warning or flood forecast."
        }
      </ScienceReadout>
    </>
  );
}
