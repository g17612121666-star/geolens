import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon } from "../shared/geomorphic-terrain";
import { DebrisField } from "../shared/geomorphic-terrain";
import { landscapeNoise as noise } from "../shared/landscape-noise";
import { Tag } from "../shared/kit";
import { PlantStand } from "../shared/natural-world";
import { GlacierMaterial } from "../shared/alpine-material";
import { glacierBed as bed, glacierFloor, icePosition, glacierIceGeometry } from "./geometry";

/** Terminal moraine: an arc of unsorted debris at a chosen earlier ice margin. */
const moraineE = (x: number, z: number) => Math.hypot((x - 2.62) / 0.3, z / 0.72);
const moraine = (x: number, z: number) =>
  x < 2.3
    ? 0
    : 0.075 * Math.exp(-(((moraineE(x, z) - 1) / 0.22) ** 2)) * (0.8 + 0.4 * noise(x * 9, z * 9));
const land = (x: number, z: number) => bed(x, z) + moraine(x, z);
const TRIM = 0.62;
const SNOW = new THREE.Color("#eef2f3"),
  SHATTERED = new THREE.Color("#9c978c"),
  SCOURED = new THREE.Color("#7f8170"),
  MEADOW = new THREE.Color("#7f9356"),
  OUTWASH = new THREE.Color("#a59d88"),
  TILL = new THREE.Color("#8f8775");
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
  const height = useMemo(() => land, []),
    colour = useMemo(
      () => (x: number, y: number, z: number) => {
        const above = y - glacierFloor(x),
          n = noise(x * 3 + 1, z * 3),
          c = MEADOW.clone();
        // Ice-scoured rock below the trimline, frost-shattered rock and snow above it.
        c.lerp(SCOURED, THREE.MathUtils.smoothstep(above, 0.18, 0.4) * (0.6 + 0.4 * n));
        c.lerp(SHATTERED, THREE.MathUtils.smoothstep(above, TRIM - 0.04, TRIM + 0.06));
        c.lerp(SNOW, THREE.MathUtils.smoothstep(y, 1.75 + 0.2 * n, 1.95));
        // Valley floor: outwash gravels beyond the ice, and till on the moraine.
        if (Math.abs(z) < 0.45 && x > 1.2)
          c.lerp(OUTWASH, 1 - THREE.MathUtils.smoothstep(above, 0.03, 0.12));
        if (moraine(x, z) > 0.02) c.lerp(TILL, 0.8);
        return c.getStyle();
      },
      [],
    );
  const stream = useMemo(
    () =>
      Array.from({ length: 101 }, (_, i) => {
        const x = -2.7 + length + ((5.7 - length) * i) / 100;
        const z = 0.12 * Math.sin(x * 3.1);
        return [x, land(x, z) + 0.012, z] as [number, number, number];
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
                resolution={200}
                base={-0.15}
                cliff={0.6}
                mottle={0.08}
                section={{ rock: "granite", soil: 0.015, regolith: 0.06, soilTone: "thin" }}
              />
              {showIce && <Ice length={length} />}
              <WaterRibbon path={stream} width={0.035} color="#7fb3bd" />
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
              {showIce && (
                <DebrisField
                  points={Array.from({ length: 160 }, (_, i) => {
                    const side = i % 2 ? 1 : -1,
                      a = icePosition(
                        0.1 + ((i * 0.618) % 1) * 0.82,
                        side * (0.9 + 0.08 * Math.sin(i)),
                        length,
                      );
                    return [a[0], a[1] + 0.008, a[2]] as [number, number, number];
                  })}
                  size={0.018}
                  color="#8a8274"
                />
              )}
              <DebrisField
                points={Array.from({ length: 70 }, (_, i) => {
                  const a = -1.2 + ((i * 0.618) % 1) * 2.4,
                    r = 1 + 0.12 * Math.sin(i * 5),
                    x = 2.62 + 0.3 * r * Math.cos(a),
                    z = 0.72 * r * Math.sin(a);
                  return [x, land(x, z) + 0.015, z] as [number, number, number];
                })}
                size={0.035}
                color="#948c7e"
              />
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
        {params.view <= 0.5 && (
          <>
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
                return [x, land(x, z) * vertical, z] as [number, number, number];
              }).filter(
                ([x, y, z]) =>
                  y < 1.25 * vertical &&
                  Math.abs((bed(x, z + 0.02) - bed(x, z - 0.02)) / 0.04) < 1.6,
              )}
            />
          </>
        )}
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
