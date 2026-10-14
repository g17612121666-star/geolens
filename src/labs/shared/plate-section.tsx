import { useLabControls } from "@/lib/store/lab-controls";
import { Line } from "@react-three/drei";
import { Arrow } from "./science-kit";
import { Tag } from "./kit";
import { RockPrism } from "./rock-prism";
import { FlowWaterMaterial } from "./flow-water";

function Slab({ points, color = "#898079" }: { points: [number, number][]; color?: string }) {
  return <RockPrism points={points} depth={1.25} color={color} />;
}
/** Geometry is a section, not a surveyed landscape. Every kinematic tracer uses t. */
export function PlateSection({ kind = 0 }: { kind?: number }) {
  const t = useLabControls((s) => s.t),
    opening = 0.04 + 0.22 * t,
    slip = (t - 0.5) * 0.65;
  return (
    <group position={[0, -0.2, 0]}>
      <Slab
        points={[
          [-2.8, -1.5],
          [2.8, -1.5],
          [2.8, -0.48],
          [-2.8, -0.48],
        ]}
        color="#635d4f"
      />
      {kind === 0 ? (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * opening, 0, 0]}>
              <Slab
                points={
                  side < 0
                    ? [
                        [-2.5, 0.02],
                        [-0.05, 0.19],
                        [-0.05, -0.32],
                        [-2.5, -0.52],
                      ]
                    : [
                        [0.05, 0.19],
                        [2.5, 0.02],
                        [2.5, -0.52],
                        [0.05, -0.32],
                      ]
                }
                color="#656862"
              />
              <Slab
                points={
                  side < 0
                    ? [
                        [-2.5, 0.05],
                        [-0.12, 0.2],
                        [-0.12, 0.145],
                        [-2.5, -0.01],
                      ]
                    : [
                        [0.12, 0.2],
                        [2.5, 0.05],
                        [2.5, -0.01],
                        [0.12, 0.145],
                      ]
                }
                color="#989083"
              />
              {Array.from({ length: 7 }, (_, i) => (
                <Line
                  key={i}
                  points={[
                    [side * (0.18 + i * 0.33), 0.18 - i * 0.018, -0.59],
                    [side * (0.18 + i * 0.33), 0.18 - i * 0.018, 0.59],
                  ]}
                  color="#c1aa84"
                  transparent
                  opacity={0.5}
                  lineWidth={1}
                />
              ))}
            </group>
          ))}
          <Slab
            points={[
              [-opening - 0.05, 0.19],
              [opening + 0.05, 0.19],
              [opening + 0.05, -0.38],
              [-opening - 0.05, -0.38],
            ]}
            color="#514c47"
          />
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.045, 0.08, 0.48, 24]} />
            <meshStandardMaterial color="#b86438" emissive="#c75121" emissiveIntensity={0.22} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Arrow from={[side * 0.35, 0.65, 0]} to={[side * 1.25, 0.65, 0]} />
              <mesh position={[side * (0.06 + 0.95 * t), 0.23, 0]}>
                <sphereGeometry args={[0.045, 20, 16]} />
                <meshBasicMaterial color="#e6c98d" />
              </mesh>
            </group>
          ))}
          <Tag
            pos={[0, 1.02, 0]}
            text="Divergent · new basalt"
            note="The crustal flanks separate while new basalt fills the ridge. Gold markers travel with each flank. Partial melt is local; the mantle volume below stays mostly solid."
            occlude={false}
          />
        </>
      ) : kind === 1 ? (
        <>
          <group position={[t * 0.28, -t * 0.14, 0]}>
            <Slab
              points={[
                [-2.8, 0.12],
                [-0.4, 0.12],
                [1.5, -0.85],
                [1.34, -1.15],
                [-0.48, -0.2],
                [-2.8, -0.2],
              ]}
              color="#62665f"
            />
            <Slab
              points={[
                [-2.8, 0.15],
                [-0.4, 0.15],
                [0.6, -0.4],
                [0.58, -0.47],
                [-0.42, 0.09],
                [-2.8, 0.09],
              ]}
              color="#a9987e"
            />
            {Array.from({ length: 8 }, (_, i) => {
              const x = -2.55 + i * 0.32;
              return (
                <Line
                  key={i}
                  points={[
                    [x, 0.165, -0.6],
                    [x, 0.165, 0.6],
                  ]}
                  color="#beb08b"
                  lineWidth={1}
                />
              );
            })}
          </group>
          <Slab
            points={[
              [0.13, 0.34],
              [0.5, 0.5],
              [0.77, 0.72],
              [0.92, 0.63],
              [1.08, 0.39],
              [1.4, 0.49],
              [1.8, 0.35],
              [2.6, 0.38],
              [2.6, -0.42],
              [0.75, -0.42],
              [0.13, -0.05],
            ]}
            color="#aa9877"
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.23, 0]}>
            <planeGeometry args={[2.2, 1.28]} />
            <FlowWaterMaterial opacity={0.5} flow={[1, 0]} speed={0.3} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const f = (t + i / 8) % 1;
            return (
              <mesh key={i} position={[-0.35 + f * 1.7, 0.1 - f * 0.95, 0.64]}>
                <sphereGeometry args={[0.026, 12, 8]} />
                <meshBasicMaterial color="#ebbf89" />
              </mesh>
            );
          })}
          <Arrow from={[-1.6, 0.65, 0]} to={[-0.65, 0.65, 0]} />
          <Arrow from={[1.8, 1, 0]} to={[0.95, 1, 0]} />
          <Tag
            pos={[0, 1.35, 0]}
            text="Convergent · descending slab"
            note="Oceanic lithosphere descends below the overriding continent. Gold markers follow the descending path; the upper surface has a trench and volcanic-arc relief. Geometry and speed are schematic."
            occlude={false}
          />
        </>
      ) : (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[0, 0, side * slip]}>
              <Slab
                points={
                  side < 0
                    ? [
                        [-2.5, 0.15],
                        [-0.045, 0.15],
                        [-0.045, -0.48],
                        [-2.5, -0.48],
                      ]
                    : [
                        [0.045, 0.15],
                        [2.5, 0.15],
                        [2.5, -0.48],
                        [0.045, -0.48],
                      ]
                }
              />
              <Line
                points={
                  side < 0
                    ? [
                        [-2.5, 0.17, 0],
                        [-0.045, 0.17, 0],
                      ]
                    : [
                        [0.045, 0.17, 0],
                        [2.5, 0.17, 0],
                      ]
                }
                color="#e8d4a5"
                lineWidth={3}
              />
              <Arrow from={[side * 0.7, 0.55, -side * 0.45]} to={[side * 0.7, 0.55, side * 0.45]} />
            </group>
          ))}
          <Tag
            pos={[0, 1, 0]}
            text="Transform · offset marker"
            note="The two halves of one cream surface marker separate along the fault. Crust slides laterally; it is neither created nor consumed. Play and the time slider move the same blocks."
            occlude={false}
          />
        </>
      )}
      <Tag
        pos={[0, -1.55, 0.8]}
        text="Mantle · mostly solid"
        note="Rock texture distinguishes material. The section has no measured speed or length scale and does not depict a global magma ocean."
        occlude={false}
      />
    </group>
  );
}
