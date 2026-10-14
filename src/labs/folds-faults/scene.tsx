import { useMemo, useEffect } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { foldedBed, faultBed, faultSlip } from "./geometry";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
// Distinct strata so each bed can be traced through folds and across faults.
const COLOURS = ["#9a5a42", "#d8c896", "#5f7466", "#cf9150", "#7d6b8a"];
export default function FoldsFaults() {
  const { params, explode, t } = useLabControls();
  useLabTick(1 / 40);
  const kind = params.structure ?? 0,
    amount = t,
    fold = kind < 2,
    slip = faultSlip(kind, amount * 0.7),
    separation = explode * 0.6;
  const beds = useMemo(
    () =>
      fold
        ? Array.from({ length: 5 }, (_, i) => foldedBed(i, amount, kind === 1))
        : Array.from({ length: 10 }, (_, i) => faultBed(i % 5, i >= 5, kind === 4)),
    [fold, kind, fold ? amount : 0],
  );
  useEffect(() => () => beds.forEach((g) => g.dispose()), [beds]);
  return (
    <>
      <ScienceStudio
        slug="folds-faults"
        camera={[3.2, 2.4, 7]}
        scale="Equal geometric scales · coloured beds mark relative ages"
        trueScale="1 scene unit = 1 km · any exploded gaps are for inspection only"
      >
        {beds.map((g, i) => {
          const right = !fold && i >= 5,
            index = i % 5,
            offset: [number, number, number] = fold
              ? [0, index * separation * 0.2, 0]
              : right
                ? [slip[0] + separation, slip[1], slip[2]]
                : [-separation, 0, 0];
          return (
            <mesh key={i} geometry={g} position={offset} castShadow receiveShadow>
              <RockMaterial
                color={COLOURS[index]}
                desaturate={0.92}
                roughness={0.93}
                envMapIntensity={0.12}
              />
            </mesh>
          );
        })}
        {fold &&
          Array.from({ length: 6 }, (_, i) => {
            const f = 1 - 0.25 * amount,
              b = (-1.1 + i * 0.35) / f;
            return (
              <Line
                key={i}
                points={Array.from({ length: 121 }, (_, j) => {
                  const x = -2.6 + (j / 120) * 5.2;
                  return [
                    x * f,
                    b + (kind === 1 ? -1 : 1) * amount * Math.exp((-x * x) / 1.9),
                    1.108,
                  ] as [number, number, number];
                })}
                color="#dfcfad"
                transparent
                opacity={0.52}
                lineWidth={1}
              />
            );
          })}
        {!fold &&
          Array.from({ length: 7 }, (_, i) => {
            const y = -0.95 + i * 0.22,
              x = kind === 4 ? 0 : (0.65 - y) / Math.tan(Math.PI / 3);
            return (
              <Line
                key={i}
                points={[
                  [x + separation + slip[0] + 0.003, y + slip[1], -0.95 + slip[2]],
                  [x + separation + slip[0] + 0.003, y + slip[1], 0.95 + slip[2]],
                ]}
                color="#dbc7a0"
                transparent
                opacity={0.45}
                lineWidth={1}
              />
            );
          })}
        {fold ? (
          <>
            <Line
              points={[
                [0, -1.2, 1.13],
                [0, 1.9, 1.13],
              ]}
              color="#acbab1"
              dashed
              dashSize={0.07}
              gapSize={0.06}
            />
            <Tag
              pos={[0, 2.25 + separation, 0]}
              text={kind === 0 ? "Anticline · older core" : "Syncline · younger core"}
              note="These beds remain upright: the oldest bed is at the bottom of the original sequence. Core age defines anticline versus syncline; inverted folds cannot be named from shape alone."
              occlude={false}
            />
          </>
        ) : (
          <>
            <Arrow
              from={[1.6, 1.1, 0]}
              to={[1.6 + slip[0], 1.1 + slip[1], slip[2]]}
              color="#ddac83"
              width={1.4}
            />
            {kind === 4 ? (
              <>
                <Line
                  points={[
                    [-2.6, 0.66, 0],
                    [-separation, 0.66, 0],
                  ]}
                  color="#e8daba"
                  lineWidth={3}
                />
                <Line
                  points={[
                    [separation, 0.66, slip[2]],
                    [2.6 + separation, 0.66, slip[2]],
                  ]}
                  color="#e8daba"
                  lineWidth={3}
                />
                <Tag
                  pos={[0, 1.5, 0]}
                  text="Strike-slip · lateral offset"
                  note="The cream marker crosses an originally continuous horizontal surface. The right block moves along a vertical fault with no vertical component in this example."
                  occlude={false}
                />
              </>
            ) : (
              <>
                <Tag
                  pos={[-1.7, 1.15, 0]}
                  text="Footwall"
                  note="The footwall lies below the inclined fault plane. It is held fixed here so the hanging-wall displacement is easy to compare."
                  occlude={false}
                />
                <Tag
                  pos={[1.8, 1.6, 0]}
                  text={kind === 2 ? "Hanging wall · down" : "Hanging wall · up"}
                  note="The hanging wall lies above the 60° dipping fault. Motion is parallel to that plane: down for normal faulting, up for reverse faulting."
                  occlude={false}
                />
              </>
            )}
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {
          [
            "Upright anticline",
            "Upright syncline",
            "Normal fault · extension",
            "Reverse fault · shortening",
            "Strike-slip fault",
          ][kind]
        }
        .{" "}
        {fold
          ? `Fold amplitude ${(amount * 1000).toFixed(0)} m; shortening ${(amount * 25).toFixed(0)}%, with bed volume preserved.`
          : `Relative slip ${(amount * 0.7 * 1000).toFixed(0)} m${kind === 4 ? "" : `; vertical throw ${Math.abs(slip[1] * 1000).toFixed(0)} m`}.`}
        <br />
        {
          "Play or scrub Process to deform the section. Explode separates beds or blocks for inspection; the gap is not a real canyon. Geometry demonstrates structure, not stress, strain history or earthquake timing."
        }
      </ScienceReadout>
    </>
  );
}
