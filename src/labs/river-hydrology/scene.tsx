import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { annualRiverRegime, catchmentRelief } from "@/lib/river-regime-science";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
const hill = catchmentRelief;
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
function Basin({
  snow,
  flow,
  x,
  dam,
  vertical,
}: {
  snow: number;
  flow: number;
  x: number;
  dam: boolean;
  vertical: number;
}) {
  const alpine = x > 0;
  // The snow-fed basin is a craggier mountain valley; the rain-fed one is lowland hills.
  const relief = useMemo(
    () => (u: number, z: number) =>
      (hill(u, z) +
        (alpine
          ? 0.35 * Math.max(0, (1.6 - u) / 3.2) * (fbm(u * 2.2 + 3, z * 2.2) - 0.35)
          : 0.03 * (fbm(u * 2, z * 2) - 0.5))) *
      vertical,
    [alpine, vertical],
  );
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(relief, 3.2, 3.2, 140, -0.12);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color(),
      snowline = 0.85 - Math.min(0.6, snow / 400);
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i),
        z = p.getZ(i),
        h = p.getY(i) / Math.max(vertical, 1e-3),
        n = fbm(u * 3, z * 3);
      col.copy(farmland(u * 1.6, z * 1.6, 0.3));
      col.lerp(tone.set("#3f5e3a"), ss(h, 0.25, 0.4) * 0.8);
      if (alpine) {
        col.lerp(tone.set("#8a9a6a"), ss(h, 0.6, 0.72) * 0.8);
        col.lerp(tone.set("#8b857a"), ss(h, 0.78, 0.9) * (0.5 + 0.5 * n));
      }
      if (snow > 1 && h > snowline - 0.05 * n) col.set("#eef3f4");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [snow, vertical, relief, alpine]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const houses = useMemo(
    () => settlement(-1.05, 0.55, 9, 0.28, 0.05, alpine ? 4 : 8, (_u, z) => Math.abs(z) > 0.2),
    [alpine],
  );
  const line = Array.from({ length: 65 }, (_, i): [number, number, number] => {
    const x = -1.6 + (i / 64) * 3.2;
    return [x, relief(x, 0) + 0.015, 0];
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geometry}>
        <TerrainMaterial
          attach="material-0"
          kind="grass"
          vertexColors
          color="#ffffff"
          roughness={0.95}
        />
        <RockMaterial attach="material-1" color="#c4ad8c" strata />
      </mesh>
      <WaterRibbon
        path={line}
        width={0.018 + Math.min(0.085, Math.sqrt(flow) * 0.045)}
        color="#5994ad"
      />
      <PlantStand
        kind="conifer"
        scale={0.05}
        seed={11}
        positions={Array.from({ length: 72 }, (_, i) => {
          const a = -1.45 + random(i + 378) * 2.9,
            z = -1.45 + random(i + 721) * 2.9;
          return [a, relief(a, z), z] as [number, number, number];
        }).filter(([a, , z]) => Math.abs(z) > 0.18 && hill(a, z) < (alpine ? 0.6 : 0.78))}
      />
      <DebrisField
        points={Array.from({ length: 42 }, (_, i) => {
          const a = -1.5 + random(i + 414) * 3,
            z = (random(i + 886) < 0.5 ? -1 : 1) * (0.1 + random(i + 684) * 0.13);
          return [a, relief(a, z) + 0.005, z];
        })}
        size={0.014}
      />
      <Buildings items={houses} ground={relief} />
      {dam && (
        <mesh position={[0.73, relief(0.9, 0) + 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.48, 0.7]} />
          <FlowWaterMaterial color="#518da4" opacity={0.8} flow={[0.15, 0]} speed={0.1} />
        </mesh>
      )}
      {dam && (
        <mesh position={[1, relief(1, 0) + 0.12, 0]}>
          <boxGeometry args={[0.12, 0.25, 0.8]} />
          <meshStandardMaterial color="#adb6ae" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
export default function RiverHydrology() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 65);
  const dam = params.dam > 0.5,
    a = useMemo(() => annualRiverRegime(false, false), []),
    b = useMemo(() => annualRiverRegime(true, dam), [dam]),
    free = useMemo(() => annualRiverRegime(true, false), []),
    day = Math.min(364, Math.floor(t * 365)),
    av = a.series[day],
    bv = b.series[day],
    f = trueScale ? 0.1 : 1,
    // Fixed axis (undammed snow-fed peak) so switching the dam on visibly lowers the peak.
    max = Math.max(...a.series.map((s) => s.flow), ...free.series.map((s) => s.flow)) * 1.1,
    date = (d: number) =>
      new Date(Date.UTC(2001, 0, d + 1)).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    peak = (series: typeof a.series) =>
      series.reduce((p, s) => (s.flow > p.flow ? s : p), series[0]),
    pa = peak(a.series),
    pb = peak(b.series);
  const poly = (series: typeof a.series) =>
    series
      .map(
        (s) => `${(35 + (s.day / 364) * 530).toFixed(3)},${(78 - (s.flow / max) * 67).toFixed(3)}`,
      )
      .join(" ");
  return (
    <>
      <ScienceStudio
        slug="river-hydrology"
        camera={[4, 5, 8]}
        scale="Two invented 100 km² catchments · relief ×10 · channel width symbolic"
        trueScale="Terrain uses 1 scene unit = 3.125 km · river width, dam and vegetation remain enlarged symbols"
      >
        <Basin x={-2.15} snow={0} flow={av.flow} dam={false} vertical={f} />
        <Basin x={2.15} snow={bv.snow} flow={bv.flow} dam={dam} vertical={f} />
        <Tag
          pos={[-2.15, 0.25, 2]}
          text={`Rain-fed · ${av.flow.toFixed(2)} m³/s`}
          note="An invented maritime regime with wetter winters. 40% of the rain is lost (for example to evaporation) and a ten-day store delays the rest. Not fitted to the Thames."
          occlude={false}
        />
        <Tag
          pos={[2.15, 0.25, 2]}
          text={`Snow-fed · ${bv.flow.toFixed(2)} m³/s`}
          note="An invented temperature cycle stores winter snowfall. Above 0 °C, up to 3 mm of snow-water equivalent melts per degree per day, and a seven-day store delays the runoff. The dam adds a 60-day reservoir, not a real operating rule."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 600 106"
          className="mx-auto h-28 w-full"
          role="img"
          aria-label={
            "Annual daily discharge: rain-fed in gold and snow-fed in blue (dashed: snow-fed without the dam), linked to the selected day"
          }
        >
          <line x1="35" x2="565" y1="78" y2="78" stroke="#718a84" />
          <polyline
            points={poly(a.series)}
            fill="none"
            stroke="var(--color-sandstone)"
            strokeWidth="2"
          />
          {dam && (
            <polyline
              points={poly(free.series)}
              fill="none"
              stroke="var(--color-ice)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          )}
          <polyline points={poly(b.series)} fill="none" stroke="var(--color-ice)" strokeWidth="2" />
          <line
            x1={35 + (day / 364) * 530}
            x2={35 + (day / 364) * 530}
            y1="10"
            y2="80"
            stroke="var(--color-chalk)"
          />
          <text x="1" y="14" fill="var(--color-mist)" fontSize="12">
            {max.toFixed(1)}
          </text>
          <text x="1" y="42" fill="var(--color-mist)" fontSize="12">
            {"m³/s"}
          </text>
          <text x="35" y="101" fill="var(--color-mist)" fontSize="12">
            {"Jan"}
          </text>
          <text x="295" y="101" fill="var(--color-mist)" fontSize="12">
            {"Jul"}
          </text>
          <text x="540" y="101" fill="var(--color-mist)" fontSize="12">
            {"Dec"}
          </text>
        </svg>
        {`${date(day)} · snow store ${bv.snow.toFixed(0)} mm water equivalent, melt `}
        {`${bv.melt.toFixed(1)} mm/day. Annual peak: rain-fed (gold) ${pa.flow.toFixed(1)} m³/s `}
        {`on ${date(pa.day)}; snow-fed (blue) ${pb.flow.toFixed(1)} m³/s on ${date(pb.day)}`}
        {dam
          ? ` (${peak(free.series).flow.toFixed(1)} m³/s on ${date(peak(free.series).day)} without the dam, dashed).`
          : "."}
        <br />
        {`Day ${day + 1} of a repeating year. Dam `}
        {dam ? "on: the reservoir stores the melt peak and releases it more slowly" : "off"}
        {
          ". Both regimes are invented and repeat every year; they are not forecasts or records of real rivers."
        }
      </ScienceReadout>
    </>
  );
}
