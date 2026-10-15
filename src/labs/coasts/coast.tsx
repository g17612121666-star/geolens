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
import { WaterSides } from "../shared/shallow-water";
import { landscapeNoise as noise } from "../shared/landscape-noise";

const box = (x: number, z: number, cx: number, cz: number, hx: number, hz: number) => {
  const qx = Math.abs(x - cx) - hx,
    qz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
};
/** Wave-cut platform around the rock, deepening offshore, with a sandy beach in the cove. */
function seabed(stage: number) {
  return (x: number, z: number) => {
    const rock = Math.min(
        box(x, z, -2.23, -0.83, 1.0, 1.8),
        stage < 2 ? box(x, z, -1.05, 0, 1.95, 0.65) : box(x, z, 0.6, 0, 0.36, 0.55),
      ),
      ledges = 0.012 * Math.sin(x * 9 + Math.sin(z * 5)) + 0.025 * (noise(x * 3, z * 3) - 0.5),
      platform = -0.05 - 0.32 * THREE.MathUtils.smoothstep(rock, 0.35, 1.7) + ledges;
    const cove =
        THREE.MathUtils.smoothstep(-x, 1.5, 2.1) * THREE.MathUtils.smoothstep(z, 0.95, 1.2),
      beach = 0.07 - 0.16 * (z - 1.0) - 0.02 * (x + 2.4);
    return Math.max(platform, THREE.MathUtils.lerp(platform, beach, cove));
  };
}
/** Spit-and-bay geometry: the coast turns inland while the spit carries on across the bay. */
const coastZ = (x: number) =>
  x < -0.3
    ? -0.15 + 0.06 * Math.sin(x * 1.3)
    : -0.15 + 0.06 * Math.sin(-0.39) - 1.1 * THREE.MathUtils.smoothstep(x, -0.3, 2.4);
const spitTip = (progress: number) => 0.4 + 2.4 * progress;
const spitCentre = (x: number, tip: number) =>
  -0.06 - 0.06 * Math.max(0, x) - 0.3 * Math.exp(-(((x - tip) / 0.28) ** 2));
function spitHeight(x: number, z: number, tip: number) {
  const inland = coastZ(x) - z,
    land = inland > 0 ? 0.2 * THREE.MathUtils.smoothstep(inland, 0, 0.45) - 0.015 : -1,
    dunes = inland > 0.25 ? 0.05 * noise(x * 3, z * 3) : 0,
    c = spitCentre(x, tip),
    seaward = z - c;
  // Open sea deepens offshore; the lagoon behind the spit stays shallow, with marsh at its edge.
  const sea =
    seaward > 0
      ? -0.06 - 0.26 * THREE.MathUtils.smoothstep(seaward, 0.1, 1.6)
      : -0.045 + 0.06 * THREE.MathUtils.smoothstep(-inland, 0.4, 0) + 0.01 * noise(x * 6, z * 6);
  const along =
      THREE.MathUtils.smoothstep(x, -0.6, -0.3) *
      (1 - THREE.MathUtils.smoothstep(x, tip - 0.05, tip + 0.1)),
    ridge = 0.15 * Math.exp(-((seaward / 0.13) ** 2)) * along - 0.03;
  return Math.max(land + dunes, sea, ridge);
}

const SEABED_ROCK = new THREE.Color("#8f8c7a"),
  WEED = new THREE.Color("#5c6a44"),
  SEA_SAND = new THREE.Color("#b9a983"),
  BEACH = new THREE.Color("#dccb9f");
import { Tag } from "../shared/kit";
function Headland({ stage }: { stage: number }) {
  const geometry = useMemo(() => createHeadlandFront(stage === 0), [stage]);
  const bed = useMemo(() => seabed(stage), [stage]);
  const bedColour = useMemo(
    () => (x: number, y: number, z: number) => {
      const c = SEA_SAND.clone().lerp(SEABED_ROCK, THREE.MathUtils.smoothstep(y, -0.3, -0.12));
      if (y > -0.12 && noise(x * 4 + 2, z * 4) > 0.55) c.lerp(WEED, 0.6);
      if (z > 1 && x < -1.4) c.lerp(BEACH, THREE.MathUtils.smoothstep(y, -0.06, 0.0));
      return c.getStyle();
    },
    [],
  );
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
      <GeomorphicTerrain
        height={bed}
        colour={bedColour}
        width={7}
        depth={5}
        resolution={200}
        base={-0.55}
        cliff={0.5}
        mottle={0.05}
        section={{ rock: "chalk", soil: 0, regolith: 0.02, beds: 3.2, bedOffset: 0.3 }}
      />
      <WaterSides land={bed} level={() => 0.02} width={7} depth={5} colour="#164a5a" />
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
        note="Waves exploit joints in the chalk to enlarge a cave. It can break through to form an arch; the roof collapses to leave a stack, and erosion lowers the stack to a stump. Rock structure controls the details, and the stages are not dated."
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
      return spitHeight(x, z, spitTip(progress));
    },
    [mode, constructive, groyne, progress],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const h = y,
        c = new THREE.Color("#8b8b70")
          .lerp(new THREE.Color("#d8c79e"), THREE.MathUtils.smoothstep(h, 0.01, 0.07))
          .lerp(new THREE.Color("#cdbb92"), THREE.MathUtils.smoothstep(h, 0.08, 0.14));
      // Shingle on the berm crest, then marram-covered dunes and grassland inland.
      c.lerp(new THREE.Color("#9d9585"), Math.exp(-(((h - 0.12) / 0.025) ** 2)) * 0.5);
      c.lerp(new THREE.Color("#9da36a"), THREE.MathUtils.smoothstep(h, 0.17, 0.26) * 0.8);
      c.lerp(
        new THREE.Color("#7c9a55"),
        THREE.MathUtils.smoothstep(-z, 1.3, 1.9) * THREE.MathUtils.smoothstep(h, 0.15, 0.2),
      );
      // Salt marsh in the sheltered, shallow water behind the spit.
      if (mode === 2 && h > -0.02 && h < 0.03 && z < spitCentre(x, spitTip(progress)) && x > -0.3)
        c.lerp(new THREE.Color("#7c8a55"), 0.7);
      return c.multiplyScalar(0.96 + 0.08 * noise(x * 10, z * 10)).getStyle();
    },
    [mode, progress],
  );
  const headlandBed = useMemo(() => seabed(stage), [stage]);
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
        horizon
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
            <GeomorphicTerrain
              height={height}
              colour={colour}
              width={7}
              depth={5}
              resolution={200}
              base={-0.4}
              cliff={0.3}
              mottle={0.05}
              section={{ rock: "sand", soilTone: "sandy", soil: 0.015, regolith: 0, beds: 5 }}
            />
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
              note={
                mode === 1
                  ? "These two beach profiles show a possible net gain (a berm) or loss of sand. Real outcomes also depend on wave height and period, grain size, beach slope and tide level."
                  : "The spit is attached to the mainland at this end. Sediment drifting along the coast feeds its growth."
              }
              occlude={false}
            />
            <Tag
              pos={[1.7, 0.55, 0.8]}
              text={
                mode === 1 ? (groyne ? "Down-drift supply reduced" : "Longshore transport") : "Spit"
              }
              note={
                mode === 1
                  ? "Swash runs up the beach at an angle and backwash returns straight down the slope, so grains zigzag along the shore; currents also move sediment. The groyne traps this supply, though on real coasts some sand passes round groynes and wave direction changes."
                  : "A spit is attached to land at one end and grows into open water as drifting sediment builds up. A hooked end can record changing waves and currents. Sheltered water behind it fills with mud and salt marsh. Spit extent is a chosen shape, not a predicted growth rate."
              }
              occlude={false}
            />
          </group>
        )}
        {mode === 0 ? (
          <CoastalWater height={headlandBed} vertical={1} stage={stage} />
        ) : (
          <>
            <CoastalWater height={height} vertical={v} stage={stage} />
            <WaterSides
              land={(x, z) => height(x, z) * v}
              level={() => 0.02}
              width={7}
              depth={5}
              colour="#164a5a"
            />
          </>
        )}
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
          ? "Look into the cave from the sea, then compare the arch, stack and stump. The chalk headland, banded with dark flint, stands on a wave-cut platform; the cave has a back wall."
          : mode === 1
            ? "Swash moves grains diagonally up the beach; backwash returns them straight downslope. The zigzag is one simplified pathway."
            : "A spit grows from the shore across a bay, sheltering a shallow lagoon with salt marsh behind it. Change Spit extent to compare its length; the water beyond its tip stays open."}
        <br />
        {mode === 1
          ? groyne
            ? "Groyne on: grains are trapped on the up-drift side, so less reaches the beach beyond. The groyne creates no new sediment."
            : "Toggle Constructive waves to compare a beach with a berm and an eroded beach; both are example profiles."
          : "No erosion or growth rate is calculated. Rock structure, waves, tides and sediment supply control real coasts."}
      </ScienceReadout>
    </>
  );
}
