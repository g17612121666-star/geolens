import { useMemo } from "react";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { longWaveTransect, longWaveElevation } from "@/lib/ocean-wave-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { OceanSection } from "../shared/ocean-section";
import { Tag } from "../shared/kit";
const TRANSECT = longWaveTransect();
export default function Tsunami() {
  const { t, trueScale } = useLabControls();
  useLabTick(1 / 55);
  const source = t < 0.15,
    uplift = Math.min(1, t / 0.15),
    seconds = Math.max(0, (t - 0.15) / 0.85) * (TRANSECT.totalTravel + 1200),
    f = trueScale ? 1 : 20;
  const sourceShape = (x: number) => Math.exp((-x * x) / (2 * 50000 ** 2));
  const elevation = (p: (typeof TRANSECT.points)[number]) =>
    source ? uplift * sourceShape(p.x) : longWaveElevation(p, seconds);
  const samples = useMemo(
    () =>
      TRANSECT.points.map((p) => ({
        x: p.x / 100000 - 2.5,
        bed: ((-p.depth + uplift * sourceShape(p.x)) / 100000) * f,
        surface: (elevation(p) / 100000) * f,
      })),
    [source, uplift, seconds, f],
  );
  const crest = TRANSECT.points.reduce(
    (best, p) => (Math.abs(p.travel - seconds) < Math.abs(best.travel - seconds) ? p : best),
    TRANSECT.points[0],
  );
  const profile = TRANSECT.points.map((p) => ({
      x: 30 + (p.x / TRANSECT.length) * 540,
      y: 55 - elevation(p) * 25,
    })),
    trace = profile.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" ");
  return (
    <>
      <ScienceStudio
        slug="tsunami"
        camera={[1.8, 2.8, 7]}
        scale="Bathymetric relief ×20 · wave and depth share the same vertical scale"
        trueScale="1 scene unit = 100 km · metres-high waves are barely visible at this scale"
      >
        <OceanSection samples={samples} base={(-4000 / 100000) * f - 0.15} />
        {source ? (
          <Arrow
            from={[-2.2, (-4000 / 100000) * f, 0.98]}
            to={[-2.2, (-4000 / 100000) * f + 0.05 + uplift * 0.45, 0.98]}
            color="#ddbb7f"
            width={1.1}
          />
        ) : (
          <Line
            points={[
              [crest.x / 100000 - 2.5, 0.04, -0.9],
              [crest.x / 100000 - 2.5, 0.04, 0.9],
            ]}
            color="#ddbb7f"
            lineWidth={3}
          />
        )}
        {!source && (
          <Line
            points={[
              [crest.x / 100000 - 2.5, (elevation(crest) / 100000) * f, 0.925],
              [crest.x / 100000 - 2.5, (-crest.depth / 100000) * f, 0.925],
            ]}
            color="#d4bc8d"
            lineWidth={1.5}
            dashed
            dashSize={0.025}
            gapSize={0.018}
          />
        )}
        <Line
          points={TRANSECT.points.map(
            (p) => [p.x / 100000 - 2.5, (-p.depth / 100000) * f, 0.925] as [number, number, number],
          )}
          color="#b8a487"
          lineWidth={1.4}
        />
        <Tag
          pos={[-2, 0.7, 0]}
          text="Deep ocean · 4000 m"
          note="An ideal offshore disturbance has launched a 20-minute long-wave packet with a 0.5 m deep-water amplitude. The source rupture and its seafloor deformation are not solved here."
          occlude={false}
        />
        <Tag
          pos={[2, 0.7, 0]}
          text="Shelf · 100 m"
          note="Wave speed decreases as sqrt(g h). The Green’s-law approximation increases amplitude as depth to the power −1/4, conserving one-dimensional wave-energy flux in slowly varying depth."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 600 125"
          className="mx-auto h-24 w-full"
          role="img"
          aria-label={
            "Sea-surface displacement in metres across a 500 kilometre transect; vertical axis minus two to plus two metres"
          }
        >
          {[-2, 0, 2].map((y) => (
            <g key={y}>
              <line
                x1="30"
                x2="570"
                y1={55 - y * 25}
                y2={55 - y * 25}
                stroke="#526662"
                strokeDasharray={y === 0 ? undefined : "3 5"}
              />
              <text x="2" y={59 - y * 25} fill="var(--color-mist)" fontSize="11">
                {y} {"m"}
              </text>
            </g>
          ))}
          <polyline points={trace} fill="none" stroke="var(--color-ice)" strokeWidth="2" />
          <text x="32" y="122" fill="var(--color-mist)" fontSize="11">
            {"0 km"}
          </text>
          <text x="525" y="122" fill="var(--color-mist)" fontSize="11">
            {"500 km"}
          </text>
        </svg>
        {source
          ? `Source stage: prescribed uplift ${uplift.toFixed(2)} m displaces the water column. Gold arrow enlarges its direction of motion.`
          : `Propagation stage: ${(seconds / 60).toFixed(1)} min · front ${crest.speed.toFixed(1)} m/s at ${crest.depth.toFixed(0)} m depth. Central crest reaches 100 m water at ${(TRANSECT.totalTravel / 60).toFixed(1)} min.`}
        <br />
        {
          "Two teaching stages: prescribed uplift, then a separate long-wave approximation. The dotted depth marker follows the wave packet; the chart enlarges displacement. No rupture dynamics, breaking, run-up or inundation are calculated."
        }
      </ScienceReadout>
    </>
  );
}
