import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, DebrisField, GrassPatch } from "../shared/geomorphic-terrain";
import { CoastalWater } from "./coastal-water";
import { RockMaterial } from "../shared/rock-material";
import { CoastalRock as RockPrism, CoastalRockMaterial } from "./coastal-rock";
import { createHeadlandFront, cliffPoint } from "./cliff-geometry";
import { Tag } from "../shared/kit";
function Headland({ stage }: { stage: number }) {
  const geometry = useMemo(() => createHeadlandFront(stage === 0), [stage]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const grasses = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => {
        const random = (salt: number) => {
          const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
          return v - Math.floor(v);
        };
        const x = -3.02 + random(1) * 1.3,
          z = -2.4 + random(2) * 1.42;
        const top = x < -2.3 ? 1.69 + ((x + 3.15) / 0.85) * 0.14 : 1.83 - ((x + 2.3) / 0.7) * 0.03;
        const point = cliffPoint(x, top, z + 0.83);
        point[2] -= 0.83;
        return point;
      }),
    [],
  );
  return (
    <>
      <RockPrism
        points={[
          [-3.15, -0.3],
          [-1.3, -0.3],
          [-1.2, 1.52],
          [-1.6, 1.8],
          [-2.3, 1.83],
          [-3.15, 1.69],
        ]}
        depth={3.6}
        position={[0, 0, -0.83]}
      />
      <GrassPatch positions={grasses} height={0.075} color="#7e8860" />
      {stage < 2 ? (
        <>
          <mesh geometry={geometry} castShadow receiveShadow>
            <CoastalRockMaterial />
          </mesh>
          {stage === 0 && (
            <RockPrism
              points={[
                [-3, -0.2],
                [0.9, -0.2],
                [0.86, 1.5],
                [0.5, 1.82],
                [-0.7, 1.69],
                [-3, 1.73],
              ]}
              depth={0.82}
              position={[0, 0, -0.24]}
            />
          )}
        </>
      ) : (
        <>
          <RockPrism
            points={[
              [-3, -0.2],
              [-1.12, -0.2],
              [-1.19, 0.6],
              [-1.32, 0.88],
              [-1.23, 1.36],
              [-1.28, 1.52],
              [-1.8, 1.85],
              [-3, 1.73],
            ]}
            depth={1.3}
          />
          <RockPrism
            points={
              stage === 2
                ? [
                    [0.22, -0.2],
                    [0.9, -0.2],
                    [0.95, 0.43],
                    [0.8, 0.85],
                    [0.86, 1.5],
                    [0.55, 1.73],
                    [0.37, 1.2],
                    [0.28, 0.67],
                  ]
                : [
                    [0.2, -0.2],
                    [0.94, -0.2],
                    [0.82, 0.27],
                    [0.65, 0.33],
                    [0.4, 0.35],
                  ]
            }
            depth={1.05}
          />
        </>
      )}
      <Tag
        pos={[0.35, 2.2, -0.6]}
        text={["Sea cave", "Sea arch", "Sea stack", "Stump"][stage]}
        note="A possible headland sequence: wave erosion enlarges an opening, an arch can form, roof collapse isolates a stack, and further erosion lowers it. Rock structure and strength control the sequence; no stage has a prescribed age."
        occlude={false}
      />
    </>
  );
}
export default function Coasts() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const mode = Math.round(params.view ?? 0),
    stage = Math.round(params.stage ?? 1),
    constructive = params.constructive > 0.5,
    groyne = params.groyne > 0.5,
    drift = params.drift > 0.5,
    progress = params.spit ?? 0.6,
    v = trueScale ? 1 : 2;
  const height = useMemo(
    () => (x: number, z: number) => {
      if (mode === 1) {
        const base = -0.16 * z;
        return (
          base +
          (constructive ? 0.13 : 0) * Math.exp(-(((z + 0.9) / 0.32) ** 2)) +
          (groyne && x < 0
            ? 0.13 * Math.exp((-x * x) / 0.5) * Math.exp(-(((z + 0.1) / 0.7) ** 2))
            : 0)
        );
      }
      const coast = z < -0.05 && x < -0.3 ? 0.18 : -0.2,
        centre = -0.06 - 0.13 * Math.max(0, x) ** 2,
        length = 0.4 + 2.4 * progress;
      return Math.max(
        coast,
        x > -0.7 && x < length ? 0.3 * Math.exp(-(((z - centre) / 0.2) ** 2)) - 0.17 : -0.2,
      );
    },
    [mode, constructive, groyne, progress],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const dry = new THREE.Color("#cdb995"),
        wet = new THREE.Color("#8b8b70"),
        grass = new THREE.Color("#859171");
      return wet
        .lerp(dry, THREE.MathUtils.smoothstep(y, 0.015, 0.15))
        .lerp(
          grass,
          THREE.MathUtils.smoothstep(y, 0.18, 0.32) * THREE.MathUtils.smoothstep(-z, 0.65, 1.6),
        )
        .multiplyScalar(0.97 + 0.03 * Math.sin(x * 29 + z * 31))
        .getStyle();
    },
    [],
  );
  const zigzag = useMemo(
    () =>
      Array.from({ length: 17 }, (_, i) => {
        const x = -2.8 + Math.floor(i / 2) * 0.7 + (i % 2) * 0.7,
          z = i % 2 ? -0.5 : 0.6;
        return [x, height(x, z) + 0.055, z] as [number, number, number];
      }).filter((p) => p[0] <= 3),
    [height],
  );
  return (
    <>
      <ScienceStudio
        slug="coasts"
        camera={[4.3, 3.4, 7]}
        scale={
          mode === 0
            ? "Headland: 1 scene unit = 10 m · common distances"
            : "Beach / spit: 1 scene unit = 20 m · vertical ×2"
        }
        trueScale={
          mode === 0
            ? "Headland: common 10 m scale · water symbols enlarged"
            : "Beach / spit: common 20 m scale · grains and vegetation enlarged"
        }
      >
        {mode === 0 ? (
          <Headland stage={stage} />
        ) : (
          <group scale={[1, v, 1]}>
            <GeomorphicTerrain height={height} colour={colour} base={-0.4} material="beach" />
            <GrassPatch
              positions={Array.from({ length: 145 }, (_, i) => {
                const a = i * 2.399,
                  r = Math.sqrt((i * 0.618) % 1),
                  x = -1.7 + Math.cos(a) * r * 1.15,
                  z = -1.25 + Math.sin(a) * r * 0.56;
                return [x, height(x, z), z] as [number, number, number];
              }).filter((p) => p[1] > 0.13)}
              height={0.06}
            />
            {mode === 1 && groyne && (
              <group>
                {Array.from({ length: 12 }, (_, i) => (
                  <mesh
                    key={i}
                    position={[0.015 * Math.sin(i * 17), 0.08, -1.02 + i * 0.16]}
                    rotation={[0.02, Math.sin(i * 13) * 0.1, 0.04 * Math.sin(i)]}
                    castShadow
                  >
                    <boxGeometry args={[0.16, 0.36, 0.145]} />
                    <RockMaterial color="#655d4b" />
                  </mesh>
                ))}
              </group>
            )}
            {mode === 1 && drift && (
              <>
                <Line points={zigzag} color="#f0c889" lineWidth={1.4} />
                {Array.from({ length: 13 }, (_, i) => {
                  const u = ((t + i / 13) % 1) * (zigzag.length - 1),
                    j = Math.floor(u),
                    a = new THREE.Vector3(...zigzag[j]).lerp(
                      new THREE.Vector3(...zigzag[Math.min(j + 1, zigzag.length - 1)]),
                      u - j,
                    );
                  if (groyne && a.x > -0.05) return null;
                  return (
                    <mesh key={i} position={a}>
                      <sphereGeometry args={[0.035, 10, 8]} />
                      <meshBasicMaterial color="#f5d8a0" />
                    </mesh>
                  );
                })}
              </>
            )}
            <Tag
              pos={[-1.6, 0.75, -1.3]}
              text={
                mode === 1
                  ? constructive
                    ? "Berm-building example"
                    : "Eroded profile example"
                  : "Mainland"
              }
              note="Selected beach profiles illustrate possible net sediment gain or loss. Real cross-shore transport depends on wave period, height, grain size, beach slope and water level; a wave label alone does not predict the outcome."
              occlude={false}
            />
            <Tag
              pos={[1.7, 0.55, 0.8]}
              text={
                mode === 1 ? (groyne ? "Downdrift supply reduced" : "Longshore transport") : "Spit"
              }
              note={
                mode === 1
                  ? "Oblique swash and roughly downslope backwash can move grains alongshore. Alongshore currents also transport sediment. The groyne intercepts the illustrated supply, but bypassing and changing wave directions occur in real systems."
                  : "A spit is attached to land at one end and extends into water as sediment accumulates. A hooked end can reflect changing waves and currents. Growth is selected geometry, not a predicted rate or complete sediment budget."
              }
              occlude={false}
            />
          </group>
        )}
        <CoastalWater height={height} vertical={v} headland={mode === 0} stage={stage} />
        {mode === 0 && (
          <DebrisField
            points={Array.from({ length: 32 }, (_, i) => [
              -1.35 + Math.sin(i * 2.399) * (0.3 + i / 50),
              -0.08 + 0.02 * Math.sin(i),
              0.2 + Math.cos(i * 2.399) * (0.2 + i / 55),
            ])}
            size={0.065}
            color="#b3b29f"
          />
        )}

        <Arrow from={[-2, 0.55, 2]} to={[-1.3, 0.55, 0.8]} width={0.7} color="#a7d0d3" />
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? "Inspect the cave from the seaward side, then compare arch, stack and stump. Openings are cut into a solid rock body; the cave retains a back wall."
          : mode === 1
            ? "Swash moves grains obliquely up the beach; backwash returns downslope. The zigzag is one transport pathway, not the full nearshore circulation."
            : "A spit extends from the shore into a bay. Change Spit extent to compare the attached deposit; the water beyond remains open."}
        <br />
        {mode === 1
          ? groyne
            ? "Groyne on: illustrated grains are intercepted updrift. This does not create new sediment."
            : "Select Constructive waves to compare a berm-bearing profile; the alternatives are chosen beach states."
          : "No erosion or growth rate is calculated. Rock structure, waves, tides and sediment supply control real coasts."}
      </ScienceReadout>
    </>
  );
}
