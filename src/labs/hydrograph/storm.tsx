import { useMemo } from "react";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CatchmentLandscape } from "../shared/catchment-landscape";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { stormHydrograph } from "@/lib/hydrology-science";
export default function Hydrograph() {
  const { params, t, setT } = useLabControls();
  useLabTick(1 / 40);
  const urban = params.urban ?? 0.2,
    rain = params.rain ?? 1,
    data = useMemo(() => stormHydrograph(urban, rain), [urban, rain]);
  const hour = t * 24,
    row = data.rows[Math.min(959, Math.floor(hour / 0.05))],
    display = data.rows.filter((_, i) => i % 4 === 0 && i < 480),
    max = Math.max(1, data.peak.q * 1.15);
  const x = (h: number) => 40 + (h / 24) * 640,
    y = (q: number) => 92 - (q / max) * 76,
    path = display
      .map((r, i) => `${i ? "L" : "M"}${x(r.hour).toFixed(3)},${y(r.q).toFixed(3)}`)
      .join(" ");
  return (
    <>
      <ScienceStudio
        slug="hydrograph"
        scale="1 km² idealised catchment · relief, river width and vegetation enlarged · 24-hour storm view"
        trueScale="Storm model uses SI volumes and time · land geometry is conceptual"
        camera={[3, 2.8, 5]}
      >
        <CatchmentLandscape urban={urban} rain={row.rain / 32} flow={row.q / max} divide />
        <group position={[2.25, 0.08, 0]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.1, 0.72, 0.1]} />
            <meshStandardMaterial color="#a7aba1" roughness={0.85} />
          </mesh>
          <mesh position={[0, (0.72 * row.q) / max / 2, 0.065]}>
            <boxGeometry args={[0.11, Math.max(0.004, (0.72 * row.q) / max), 0.025]} />
            <meshStandardMaterial color="#85c7d8" roughness={0.35} />
          </mesh>
          <Tag
            pos={[0.12, 0.98, 0]}
            text={`${row.q.toFixed(2)} m³/s`}
            note="The bar shows discharge at the selected hour, not water depth. The river width and rain in the landscape match the same hour on the graph."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <div className="pointer-events-auto">
          <svg
            viewBox="0 0 700 116"
            className="mx-auto h-28 w-full"
            role="img"
            aria-label={`Storm hydrograph: peak ${data.peak.q.toFixed(2)} cubic metres per second, lag ${data.lag.toFixed(2)} hours`}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1="40"
                  x2="680"
                  y1={y(f * max)}
                  y2={y(f * max)}
                  stroke="#465256"
                  strokeDasharray="3 5"
                />
                <text
                  x="34"
                  y={y(f * max) + 4}
                  textAnchor="end"
                  fill="var(--color-mist)"
                  fontSize="11"
                >
                  {(f * max).toFixed(1)}
                </text>
              </g>
            ))}
            {display
              .filter((r) => r.rain > 0)
              .map((r) => (
                <rect
                  key={r.hour}
                  x={x(r.hour)}
                  y="5"
                  width="5"
                  height={((r.rain / 32) * 37).toFixed(3)}
                  fill="var(--color-sandstone)"
                  opacity=".6"
                />
              ))}
            <path d={path} fill="none" stroke="var(--color-ice)" strokeWidth="2.5" />
            <line x1={x(hour)} x2={x(hour)} y1="4" y2="94" stroke="var(--color-chalk)" />
            {[0, 6, 12, 18, 24].map((h) => (
              <text
                key={h}
                x={x(h)}
                y="110"
                fill="var(--color-mist)"
                textAnchor="middle"
                fontSize="11"
              >
                {h} {"h"}
              </text>
            ))}
            <text x="44" y="13" fill="var(--color-ice)" fontSize="11">
              {"m³/s"}
            </text>
            <text x="680" y="13" textAnchor="end" fill="var(--color-sandstone)" fontSize="11">
              {"Rain: 0–32 mm/h (gold); Q (blue)"}
            </text>
          </svg>
          <input
            type="range"
            min="0"
            max=".999"
            step=".001"
            value={t}
            onChange={(e) => setT(Number(e.target.value))}
            aria-label={"Storm hour"}
            className="h-2 w-full accent-glacier"
          />
        </div>
        {hour.toFixed(1)} {"h · rain "}
        {row.rain.toFixed(1)} {"mm/h · Q "}
        {row.q.toFixed(2)} {"m³/s · peak "}
        {data.peak.q.toFixed(2)} {"m³/s · lag "}
        {data.lag.toFixed(2)} {"h."}
        <br />
        {"Runoff fraction "}
        {data.coefficient.toFixed(2)}
        {"; storage time "}
        {data.tau.toFixed(2)} {"h in this model catchment."}
      </ScienceReadout>
    </>
  );
}
