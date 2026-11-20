import { useMemo } from "react";
import { useLabState } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import {
  HIGH_CENTER_HPA,
  LOW_CENTER_HPA,
  frontLines,
  isobarRadius,
} from "@/lib/pressure-system-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CloudDeck, Fronts, FrontalRain, Isobars, RegionMap, WindPaths } from "./weather-map";
import { surface } from "./region";

const LOW_LEVELS = [984, 992, 1000, 1008, 1016],
  HIGH_LEVELS = [1032, 1028, 1024],
  /** Isobar labels sit along this ray (radians from east), to the southwest over land. */
  LABEL_ANGLE = -2.2;

/** Air rising through the low and spreading out aloft, or converging aloft and sinking. */
function VerticalMotion({ high, color }: { high: boolean; color: string }) {
  const aloft = useMemo(
    () =>
      Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2 + 0.5,
          inner: [number, number, number] = [0.3 * Math.cos(a), 1.32, 0.3 * Math.sin(a)],
          outer: [number, number, number] = [1.3 * Math.cos(a), 1.32, 1.3 * Math.sin(a)];
        return high ? { from: outer, to: inner } : { from: inner, to: outer };
      }),
    [high],
  );
  return (
    <group>
      <Arrow
        from={[0, high ? 1.45 : 0.1, 0]}
        to={[0, high ? 0.1 : 1.45, 0]}
        color={color}
        width={3}
      />
      {aloft.map((a, k) => (
        <Arrow key={k} from={a.from} to={a.to} color={color} width={1.8} />
      ))}
    </group>
  );
}

export default function PressureCentres() {
  const { params } = useLabState("params");
  useLabTick(1 / 30);
  const high = params.anti > 0.5,
    south = params.sh > 0.5,
    spin = (high ? -1 : 1) * (south ? -1 : 1),
    flow = high ? "#ffb347" : "#ffe14d",
    vertical = high ? "#f0b45e" : "#7fd0ec",
    levels = high ? HIGH_LEVELS : LOW_LEVELS,
    labelled = high ? HIGH_LEVELS : [984, 1000, 1016],
    { cold, warm } = frontLines(south);
  return (
    <>
      <ScienceStudio
        slug="cyclone-anticyclone"
        camera={[1.4, 6.7, 6]}
        scale="Idealized pressure system about 2,000 km across · heights exaggerated about 25× · coastline, fronts and clouds schematic"
        trueScale="At true scale the map is 2,000 km across, but the weather fills only its lowest 12 km: the clouds would be a film thinner than the map's edge"
      >
        <RegionMap />
        <Isobars high={high} south={south} levels={levels} />
        {!high && <Fronts south={south} />}
        <WindPaths high={high} south={south} color={flow} />
        <CloudDeck high={high} south={south} />
        {!high && <FrontalRain south={south} />}
        <VerticalMotion high={high} color={vertical} />
        {labelled.map((level) => {
          const r = isobarRadius(level, LABEL_ANGLE, high, south) ?? 2,
            x = r * Math.cos(LABEL_ANGLE),
            z = -r * Math.sin(LABEL_ANGLE);
          return (
            <Tag
              key={level}
              pos={[x, surface(x, z) + 0.05, z]}
              text={`${level} hPa`}
              note={`Isobar: a line joining places with the same sea-level pressure, here ${level} hPa. ${high ? "Around a high the isobars are far apart, so the pressure gradient and the winds are weak." : "Isobars packed close together mean a steep pressure gradient and strong winds."}`}
              occlude={false}
            />
          );
        })}
        <Tag
          pos={[0, 1.62, 0]}
          text={
            high ? `H · ${HIGH_CENTER_HPA} hPa · sinking` : `L · ${LOW_CENTER_HPA} hPa · rising`
          }
          short={high ? "H · sinking" : "L · rising"}
          priority={2}
          note={
            high
              ? "Air sinks from above to replace the air spreading out at the surface. Sinking air warms as it is compressed, which tends to clear the sky. The vertical arrow is exaggerated."
              : "Air converging at the surface has nowhere to go but up. Rising air cools, and its water vapor condenses into cloud. The vertical arrow is exaggerated."
          }
          occlude={false}
        />
        <Tag
          pos={[1.75, 1.3, 0.8]}
          priority={0.5}
          text={high ? "Air converges aloft" : "Air spreads out aloft"}
          short={high ? "Converges aloft" : "Spreads aloft"}
          note={
            high
              ? "High in the troposphere, air flows in over the high and sinks, feeding the outflow at the surface."
              : "Near the top of the troposphere, the rising air spreads out over the low. If more air leaves aloft than arrives at the surface, the low deepens."
          }
          occlude={false}
        />
        <Tag
          pos={[-3.2, 0.1, -0.5]}
          text={`${south ? "SH" : "NH"} · ${spin > 0 ? "counterclockwise" : "clockwise"}`}
          priority={2}
          note="Viewed from above. Switching hemisphere reverses the spin, but a low still converges and a high still diverges near the surface. Friction turns the surface wind about 25° across the isobars."
          occlude={false}
        />
        {!high && (
          <>
            <Tag
              pos={[cold[2][0], surface(cold[2][0], cold[2][1]) + 0.08, cold[2][1]]}
              priority={1}
              text="Cold front"
              note="Blue triangles point the way the cold front moves: cold air pushes under the warm air, lifting it steeply into a narrow band of tall shower clouds."
              occlude={false}
            />
            <Tag
              pos={[warm[3][0], surface(warm[3][0], warm[3][1]) + 0.08, warm[3][1]]}
              priority={1}
              text="Warm front"
              note="Red half circles point the way the warm front moves: warm air slides gently up over the cold air ahead, spreading a wide sheet of layered cloud and steady rain. This is a midlatitude depression, not a tropical cyclone."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {south ? "Southern" : "Northern"} {"hemisphere · "}
        {high
          ? "high pressure, surface divergence and sinking air"
          : "low pressure, surface convergence and rising air"}
        {". Spin is read from above."} <br />
        {high
          ? "The isobars are far apart, so winds are light. Sinking air usually stops deep cloud forming, but fog or low cloud may persist. Follow the parcels spiraling out from the center."
          : "The isobars are packed close together, so winds are strong. Blue triangles mark the cold front and red half circles the warm front; both point the way the front moves. Follow the parcels spiraling in toward the rising center."}
      </ScienceReadout>
    </>
  );
}
