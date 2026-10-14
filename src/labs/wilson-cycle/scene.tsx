import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockPrism } from "../shared/rock-prism";
import { Tag } from "../shared/kit";
import { Line } from "@react-three/drei";
import { FlowWaterMaterial } from "../shared/flow-water";
const STAGES = [
  "Continental rift",
  "Young ocean",
  "Open ocean",
  "Subduction begins",
  "Ocean closes",
  "Continental collision",
];
export default function WilsonCycle() {
  const { params, trueScale, setParam } = useLabControls(),
    stage = Math.round(params.stage ?? 2),
    f = trueScale ? 1 : 2;
  const gap =
      stage === 0
        ? 0.12
        : stage === 1
          ? 0.5
          : stage === 2 || stage === 3
            ? 1.25
            : stage === 4
              ? 0.65
              : 0,
    converging = stage >= 3;
  const wedge = gap + (0.6 * 1.7) / 1.22;
  const mantleTop: [number, number][] =
    stage === 5
      ? [
          [-3, -0.68],
          [-0.7, -0.82],
          [0.18, -0.95],
          [0.7, -0.83],
          [3, -0.68],
        ]
      : stage === 0
        ? [
            [-3, -0.68],
            [-gap, -0.76],
            [gap, -0.76],
            [3, -0.68],
          ]
        : converging
          ? [
              [-3, -0.68],
              [-gap, -0.76],
              [-gap, -0.22],
              [gap - 0.05, -0.22],
              [gap + 1.618, -1.414],
              [gap + 1.7, -1.3],
              [gap + 1.7, -0.68],
              [3, -0.68],
            ]
          : [
              [-3, -0.68],
              [-gap, -0.76],
              [-gap, -0.22],
              [0, -0.165],
              [gap, -0.22],
              [gap, -0.76],
              [3, -0.68],
            ];
  return (
    <>
      <ScienceStudio
        slug="wilson-cycle"
        camera={[2.8, 2.3, 7]}
        scale="Vertical dimensions ×2 · idealised 300 km section through a basin"
        trueScale="1 scene unit = 50 km · section is not the full width of a real ocean"
      >
        <group scale={[1, f, 1]}>
          <RockPrism points={[...mantleTop, [3, -1.65], [-3, -1.65]]} depth={1.8} color="#a0603d" />
          {stage < 5 ? (
            <>
              <RockPrism
                points={[
                  [-3, 0.02],
                  [-gap - 0.3, 0.02],
                  [-gap, -0.06],
                  [-gap, -0.76],
                  [-3, -0.68],
                ]}
                color="#d2b07c"
              />
              <RockPrism
                points={
                  converging
                    ? [
                        [gap, 0.01],
                        [gap + 0.4, 0.12],
                        [gap + 0.6, 0.02],
                        [3, 0.02],
                        [3, -0.68],
                        [wedge, -0.68],
                        [gap, -0.08],
                      ]
                    : [
                        [gap, -0.06],
                        [gap + 0.3, 0.02],
                        [3, 0.02],
                        [3, -0.68],
                        [gap, -0.76],
                      ]
                }
                color="#d2b07c"
              />
              {stage > 0 && (
                <RockPrism
                  points={
                    converging
                      ? [
                          [-gap, -0.08],
                          [gap, -0.08],
                          [gap + 1.7, -1.3],
                          [gap + 1.618, -1.414],
                          [gap - 0.05, -0.22],
                          [-gap, -0.22],
                        ]
                      : [
                          [-gap, -0.08],
                          [0, -0.025],
                          [gap, -0.08],
                          [gap, -0.22],
                          [0, -0.165],
                          [-gap, -0.22],
                        ]
                  }
                  color="#4d5560"
                />
              )}
              {converging && (
                <RockPrism
                  points={[
                    [wedge, -0.68],
                    [gap + 1.7, -0.68],
                    [gap + 1.7, -1.3],
                  ]}
                  color="#a0603d"
                />
              )}
              {stage === 0 && (
                <RockPrism
                  points={[
                    [-0.12, -0.06],
                    [0.12, -0.06],
                    [0.12, -0.76],
                    [-0.12, -0.76],
                  ]}
                  color="#817663"
                />
              )}
              {stage > 0 && (
                <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[gap * 2, 1.82]} />
                  <FlowWaterMaterial color="#52899c" opacity={0.45} speed={0} roughness={0.28} />
                </mesh>
              )}
            </>
          ) : (
            <>
              <RockPrism
                points={[
                  [-3, 0.02],
                  [-1, 0.02],
                  [-0.5, 0.09],
                  [0, 0.18],
                  [0.18, 0.14],
                  [0.18, -0.95],
                  [-0.7, -0.82],
                  [-3, -0.68],
                ]}
                color="#d2b07c"
              />
              <RockPrism
                points={[
                  [0.18, 0.14],
                  [0.55, 0.08],
                  [1, 0.02],
                  [3, 0.02],
                  [3, -0.68],
                  [0.7, -0.83],
                  [0.18, -0.95],
                ]}
                color="#c4a272"
              />
            </>
          )}
          {/* Melt: decompression melting under the opening ridge; slab-derived melt feeding an arc. */}
          {(stage === 1 || stage === 2) && (
            <mesh position={[0, -0.36, 0]} scale={[0.32, 0.12, 0.85]}>
              <sphereGeometry args={[1, 32, 16]} />
              <meshStandardMaterial
                color="#e0773a"
                emissive="#ff6a20"
                emissiveIntensity={0.6}
                transparent
                opacity={0.85}
              />
            </mesh>
          )}
          {converging && stage < 5 && (
            <>
              <mesh position={[gap + 0.75, -0.62, 0]} scale={[0.14, 0.32, 0.6]}>
                <sphereGeometry args={[1, 24, 16]} />
                <meshStandardMaterial
                  color="#e0773a"
                  emissive="#ff6a20"
                  emissiveIntensity={0.55}
                  transparent
                  opacity={0.8}
                />
              </mesh>
              <mesh position={[gap + 0.75, 0.13, 0]}>
                <coneGeometry args={[0.24, 0.24, 40]} />
                <meshStandardMaterial color="#5a504a" roughness={0.95} />
              </mesh>
              <mesh position={[gap + 0.75, 0.255, 0]}>
                <sphereGeometry args={[0.035, 16, 12]} />
                <meshBasicMaterial color="#ffb060" toneMapped={false} />
              </mesh>
            </>
          )}
          {[-1, 1].map((side) => (
            <Line
              key={side}
              points={Array.from({ length: 61 }, (_, i) => {
                const x = side * (gap + 0.3 + ((2.7 - gap) * i) / 60);
                return [x, -0.25 + 0.018 * Math.sin(x * 7), 0.905] as [number, number, number];
              })}
              color="#c3ac8c"
              lineWidth={1.25}
            />
          ))}
          {stage === 5 &&
            Array.from({ length: 4 }, (_, i) => (
              <Line
                key={i}
                points={Array.from({ length: 81 }, (_, j) => {
                  const x = -1.3 + (j / 80) * 2.6;
                  return [
                    x,
                    -0.11 - i * 0.13 + 0.18 * Math.cos(x * 2.3) * Math.exp(-x * x),
                    0.91,
                  ] as [number, number, number];
                })}
                color="#d8c098"
                lineWidth={1.4}
              />
            ))}
        </group>
        <Arrow
          from={[-1.4, 0.65, 0]}
          to={[converging ? -0.6 : -2.2, 0.65, 0]}
          color="#8ec8d1"
          width={1.4}
        />
        <Arrow
          from={[1.4, 0.65, 0]}
          to={[converging ? 0.6 : 2.2, 0.65, 0]}
          color="#8ec8d1"
          width={1.4}
        />
        <Tag
          pos={[0, 1.25, 0]}
          text={STAGES[stage]}
          note="These are idealised stages of ocean-basin opening and closure. A basin need not complete every stage or close along the same boundary; this is not a prediction of the Atlantic’s future."
          occlude={false}
        />
        <Tag
          pos={[-2.3, -0.38 * f, 1.15]}
          text="Continental crust"
          note="The unstretched reference continent is about 35 km thick in this section. Rifted margins are simplified; continental collision thickens the crustal root."
          occlude={false}
        />
        <Tag
          pos={[1.7, -1.3 * f, 1.15]}
          text="Mantle · mostly solid"
          note="Lithosphere includes crust and rigid upper mantle. The section separates crust composition from mantle; it does not represent the mantle as a magma ocean."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <div className="pointer-events-auto mb-2 flex flex-wrap justify-center gap-1">
          {STAGES.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={i === stage}
              onClick={() => setParam("stage", i)}
              className={`min-h-11 rounded-lg border px-2 text-xs ${i === stage ? "border-glacier text-chalk" : "border-white/10 text-mist"}`}
            >
              {i + 1}. {name}
            </button>
          ))}
        </div>
        {"Stage "}
        {stage + 1}/6: {STAGES[stage]}.{" "}
        {stage < 3
          ? "Extension and spreading can open a basin."
          : stage < 5
            ? "Oceanic lithosphere subducts; continental crust is not simply swallowed in the same way."
            : "Collision thickens and deforms the continental crust; remnants of an ocean may remain in the suture."}
        <br />
        {
          "Select a stage to compare the structure. The reference continental crust is 35 km thick and oceanic crust about 7 km thick."
        }
      </ScienceReadout>
    </>
  );
}
