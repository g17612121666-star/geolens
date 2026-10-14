import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon } from "../shared/geomorphic-terrain";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { GlacierMaterial } from "../shared/alpine-material";
import { glacierBed as bed, icePosition, glacierIceGeometry } from "./geometry";
import { Cirques } from "./cirques";
function Ice({ length }: { length: number }) {
  const geometry = useMemo(() => glacierIceGeometry(length), [length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <GlacierMaterial />
    </mesh>
  );
}
export default function Glaciers() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 50);
  const extent = params.extent ?? 0.5,
    length = 2.2 + 3.1 * extent,
    vertical = trueScale ? 1 : 1.5,
    showIce = params.ice > 0.5;
  const height = useMemo(() => bed, []),
    colour = useMemo(
      () => (x: number, y: number, z: number) =>
        y > 2.0 ? "#eef2f2" : y > 1.85 ? "#c4ccc9" : Math.abs(z) < 0.8 ? "#6b655a" : "#4d6a4f",
      [],
    );
  const stream = useMemo(
    () =>
      Array.from({ length: 101 }, (_, i) => {
        const x = -2.7 + length + ((5.7 - length) * i) / 100;
        return [x, bed(x, 0) + 0.02, 0] as [number, number, number];
      }),
    [length],
  );
  return (
    <>
      <ScienceStudio
        slug="glaciers"
        camera={[6, 6, 2.8]}
        scale={
          params.view > 0.5
            ? "6 × 6 km selected cirques · relief ×1.5 · ice flows away from the headwalls"
            : "6 × 4 km selected valley · relief ×1.5 · ice flow remains down-valley"
        }
        trueScale="1 scene unit = 1 km · equal geometric scales · debris, cracks and vegetation enlarged"
      >
        <group scale={[1, vertical, 1]}>
          {params.view > 0.5 ? (
            <Cirques ice={showIce} t={t} />
          ) : (
            <>
              <GeomorphicTerrain
                height={height}
                colour={colour}
                material="alpine"
                resolution={180}
              />
              {showIce && <Ice length={length} />}
              <WaterRibbon path={stream} width={0.04} />
              <PlantStand
                kind="conifer"
                scale={0.055}
                seed={3}
                positions={Array.from({ length: 70 }, (_, i) => {
                  const rand = (n: number) => {
                    const s = Math.sin(n * 71.37 + 23) * 43758.54;
                    return s - Math.floor(s);
                  };
                  const x = 0.15 + rand(i + 1) * 2.75,
                    z = (i % 2 ? -1 : 1) * (0.83 + rand(i + 400) * 0.67);
                  return [x, bed(x, z), z] as [number, number, number];
                }).filter(
                  ([x, y, z]) =>
                    y < 1.25 && Math.abs((bed(x, z + 0.02) - bed(x, z - 0.02)) / 0.04) < 1.6,
                )}
              />
              {showIce &&
                Array.from({ length: 22 }, (_, i) => {
                  const s = (t * 0.6 + i / 22) % 1,
                    a = icePosition(s, 0.15 * Math.sin(i * 7), length);
                  return (
                    <mesh key={i} position={[a[0], a[1] + 0.018, a[2]]}>
                      <sphereGeometry args={[0.018, 8, 6]} />
                      <meshBasicMaterial color="#f5efe0" />
                    </mesh>
                  );
                })}
              {showIce &&
                [0.25, 0.42, 0.58].map((s, i) => (
                  <Line
                    key={s}
                    points={Array.from({ length: 25 }, (_, j) => {
                      const a = icePosition(
                        s + 0.006 * Math.sin(j * 2 + i),
                        (j / 24) * 1.3 - 0.65,
                        length,
                      );
                      return [a[0], a[1] + 0.003, a[2]] as [number, number, number];
                    })}
                    color="#527c8d"
                    lineWidth={1.5}
                  />
                ))}
              {[-1, 1].map((side) => (
                <Line
                  key={side}
                  points={Array.from({ length: 90 }, (_, i) => {
                    const a = icePosition(0.08 + (i / 89) * 0.84, side * 0.91, length);
                    return [a[0], a[1] + 0.012, a[2]] as [number, number, number];
                  })}
                  color="#7c7464"
                  lineWidth={4}
                />
              ))}
              {Array.from({ length: 30 }, (_, i) => {
                const a = -1.15 + (i / 29) * 2.3,
                  x = 2.68 + 0.22 * Math.cos(a),
                  z = 0.68 * Math.sin(a);
                return (
                  <mesh
                    key={i}
                    position={[x, bed(x, z) + 0.025, z]}
                    rotation={[i * 0.5, i * 0.7, 0]}
                  >
                    <dodecahedronGeometry args={[0.04 + 0.025 * Math.sin(i * 7) ** 2, 0]} />
                    <RockMaterial color="#8f897b" />
                  </mesh>
                );
              })}
              <Arrow from={[-1.8, 1.6, 0]} to={[-0.2, 1.1, 0]} color="#e1bc84" width={1} />
              {showIce && (
                <>
                  <Line
                    points={Array.from({ length: 33 }, (_, j) => {
                      const p = icePosition(0.45, (j / 32) * 2 - 1, length);
                      return [p[0], p[1] + 0.02, p[2]] as [number, number, number];
                    })}
                    color="#f4f7f8"
                    lineWidth={2.5}
                    dashed
                    dashSize={0.06}
                    gapSize={0.04}
                  />
                  <Tag
                    pos={(() => {
                      const p = icePosition(0.45, 1, length);
                      return [p[0], p[1] + 0.35, p[2] + 0.2] as [number, number, number];
                    })()}
                    text="Equilibrium line"
                    note="Above this line more snow accumulates each year than melts (accumulation zone); below it melting and calving exceed snowfall (ablation zone). The balance between the two decides whether the snout advances or retreats."
                    occlude={false}
                  />
                </>
              )}
              <Tag
                pos={[-2.4, 2.2, -1.25]}
                text="Accumulation"
                note="Snow persisting across years compacts to firn and ice. The illustrated head is a source area, not a calculated equilibrium-line altitude."
                occlude={false}
              />
              <Tag
                pos={[-0.5, 2.0, 2.0]}
                text="U-shaped trough"
                note="Abrasion and quarrying by debris-bearing ice can broaden and deepen a valley. Hiding present ice exposes the selected bed; it does not simulate the rate or history of valley erosion."
                occlude={false}
              />
              <Tag
                pos={[2.8, 0.3, 0.7]}
                text="Earlier moraine"
                note="This ridge marks a chosen earlier ice margin. Unsorted debris can accumulate at a margin that remains in roughly one position. A retreating glacier still moves its surviving ice down-valley."
                occlude={false}
              />
            </>
          )}
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {params.view > 0.5 ? (
          <>
            {
              "Three adjacent cirques leave intervening arêtes and a central horn. Hide Ice to inspect the selected bedrock form."
            }
            <br />
            {
              "The 6 × 6 km block has equal horizontal scales; T removes 1.5-fold vertical exaggeration. Ice and flow tracers are schematic; Extent applies to Valley glacier."
            }
          </>
        ) : (
          <>
            {"Selected valley ice length "}
            {length.toFixed(2)} {"km. Play always moves ice down-valley."}
            <br />
            {
              "Extent compares margin positions independently; it does not reverse flow or calculate a mass-balance response. Hide Ice to inspect the trough and debris."
            }
          </>
        )}
      </ScienceReadout>
    </>
  );
}
