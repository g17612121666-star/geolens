import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { waterfallLip, waterfallBed, waterfallLand } from "@/lib/fluvial-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
function Pothole({ t }: { t: number }) {
  const g = useMemo(() => {
    const shape = new THREE.Shape([
        new THREE.Vector2(-1.6, -1.4),
        new THREE.Vector2(1.6, -1.4),
        new THREE.Vector2(1.6, 1.4),
        new THREE.Vector2(-1.6, 1.4),
      ]),
      hole = new THREE.Path();
    hole.absarc(0, 0, 0.62, 0, 2 * Math.PI, true);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.9,
      bevelEnabled: false,
      curveSegments: 80,
    });
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <>
      <mesh geometry={g}>
        <RockMaterial color="#a8a49c" />
      </mesh>
      <mesh position={[0, -0.92, 0]}>
        <boxGeometry args={[3.2, 0.05, 2.8]} />
        <RockMaterial color="#8d8982" />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.615, 80]} />
        <FlowWaterMaterial color="#76b6bc" opacity={0.44} flow={[0.7, 0.5]} speed={0.6} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = t * 4 * Math.PI + i * 1.256,
          r = 0.35 + 0.09 * Math.sin(i * 4);
        return (
          <mesh
            key={i}
            position={[r * Math.cos(a), -0.77 + 0.02 * Math.sin(a), r * Math.sin(a)]}
            rotation={[a, i, a / 2]}
          >
            <dodecahedronGeometry args={[0.09, 1]} />
            <RockMaterial color="#8b7662" />
          </mesh>
        );
      })}
      <Line
        points={Array.from(
          { length: 121 },
          (_, i) =>
            [0.45 * Math.cos((i / 120) * 5.4), -0.22, 0.45 * Math.sin((i / 120) * 5.4)] as [
              number,
              number,
              number,
            ],
        )}
        color="#9ccdd0"
      />
      <Arrow from={[0.35, -0.22, -0.28]} to={[0.43, -0.22, -0.1]} width={0.8} />
      <Tag
        pos={[0, 0.4, -1.2]}
        text="Abrasion in a pothole"
        note="Turbulent flow can circulate sediment against bedrock and excavate a hollow. Stones shown here are enlarged tracers; some potholes also grow through suspended sediment abrasion and hydraulic processes."
        occlude={false}
      />
    </>
  );
}
export default function RiverErosion() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const mode = Math.round(params.feature ?? 0),
    progress = params.retreat ?? 0.35,
    lip = waterfallLip(progress),
    vertical = trueScale ? 1 : 1.5;
  const height = useMemo(
    () =>
      mode === 2
        ? (x: number, z: number) => 0.2 - 0.04 * x + 0.65 * Math.min(1.8, Math.abs(z))
        : (x: number, z: number) => waterfallLand(x, z, progress),
    [mode, progress],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) =>
      mode === 2
        ? Math.abs(z) < 0.12
          ? "#807766"
          : y > 1
            ? "#92968b"
            : "#748571"
        : y > 1.62
          ? "#838f75"
          : y > 1.42
            ? "#9e9f98"
            : "#b69873",
    [mode],
  );
  const path = useMemo(
    () =>
      mode === 2
        ? Array.from({ length: 161 }, (_, i) => {
            const x = -3 + (i / 160) * 6;
            return [x, height(x, 0) + 0.04, 0] as [number, number, number];
          })
        : [
            ...Array.from({ length: 71 }, (_, i) => {
              const x = -3 + ((lip + 3) * i) / 70;
              return [
                x,
                i === 70
                  ? waterfallBed(lip - 0.001, progress) + 0.04
                  : waterfallBed(x, progress) + 0.04,
                0,
              ] as [number, number, number];
            }),
            ...Array.from(
              { length: 31 },
              (_, i) =>
                [
                  lip + 0.035 * Math.sin((i / 30) * Math.PI),
                  THREE.MathUtils.lerp(
                    waterfallBed(lip - 0.001, progress) + 0.04,
                    waterfallBed(lip, progress) + 0.04,
                    i / 30,
                  ),
                  0,
                ] as [number, number, number],
            ),
            ...Array.from({ length: 71 }, (_, i) => {
              const x = lip + ((3 - lip) * i) / 70;
              return [x, waterfallBed(x, progress) + 0.04, 0] as [number, number, number];
            }),
          ],
    [mode, lip, progress, height],
  );
  return (
    <>
      <ScienceStudio
        slug="river-erosion"
        camera={[2.5, 6.2, 5.4]}
        scale={
          mode === 1
            ? "Pothole close-up · 1 unit = 1 m · sediment enlarged"
            : "60 × 40 m terrain · vertical ×1.5 · retreat prescribed, not dated"
        }
        trueScale={
          mode === 1
            ? "Pothole geometry at common metre scale · sediment enlarged"
            : "1 scene unit = 10 m · equal horizontal and vertical scale"
        }
      >
        {mode === 1 ? (
          <Pothole t={t} />
        ) : (
          <group scale={[1, vertical, 1]}>
            <GeomorphicTerrain height={height} colour={colour} />
            <WaterRibbon path={path} width={mode === 2 ? 0.09 : 0.19} />
            {mode === 0 &&
              Array.from({ length: 28 }, (_, i) => {
                const u = (t * 4 + i / 28) % 1,
                  x = lip + 0.17 + 0.22 * u,
                  z = 0.26 * Math.sin(i * 2.399) * u;
                return (
                  <mesh
                    key={`spray-${i}`}
                    position={[
                      x,
                      waterfallBed(lip + 0.25, progress) + 0.05 + 0.19 * Math.sin(u * Math.PI),
                      z,
                    ]}
                  >
                    <sphereGeometry args={[0.012 * (1 - u * 0.7), 6, 5]} />
                    <meshBasicMaterial color="#e2eff0" transparent opacity={0.7 * (1 - u)} />
                  </mesh>
                );
              })}
            {mode === 0 &&
              [0.55, 0.82, 1.1, 1.4].map((y) => (
                <Line
                  key={y}
                  points={Array.from({ length: 70 }, (_, i) => {
                    const x = lip + 0.06 + ((2.94 - lip) * i) / 69;
                    return [x, y, 0.405];
                  })}
                  color="#7d725f"
                  lineWidth={0.6}
                  transparent
                  opacity={0.5}
                />
              ))}
            <DebrisField
              points={Array.from({ length: 38 }, (_, i) => {
                const x =
                    mode === 0
                      ? lip + 0.12 + ((2.85 - lip) * (i % 19)) / 18
                      : -2.8 + ((i % 19) / 18) * 5.6,
                  z = (i < 19 ? -1 : 1) * (mode === 0 ? 0.26 : 0.13);
                return [x, height(x, z) + 0.013, z];
              })}
              size={0.025}
            />
            {Array.from({ length: 24 }, (_, i) => {
              const p = path[Math.floor(((t + i / 24) % 1) * (path.length - 1))];
              return (
                <mesh key={i} position={[p[0], p[1] + 0.018, p[2] + 0.12 * Math.sin(i * 3)]}>
                  <sphereGeometry args={[0.02, 8, 6]} />
                  <meshBasicMaterial color="#d5e9e3" />
                </mesh>
              );
            })}
            {mode === 0 ? (
              <>
                <Tag
                  pos={[lip, 2.1, -0.8]}
                  text="Resistant cap"
                  note="This example places more resistant rock above weaker rock. Undercutting and failure can cause upstream retreat; not every waterfall forms from this arrangement."
                  occlude={false}
                />
                <Tag
                  pos={[lip + 0.3, 0.3, 1.1]}
                  text="Plunge pool"
                  note="Impact, turbulent flow and sediment abrasion can deepen a pool. The displayed depth and retreat are chosen geometries, not calculated erosion rates."
                  occlude={false}
                />
                <Arrow
                  from={[1.2, 2.05, 1.25]}
                  to={[lip, 2.05, 1.25]}
                  color="#e4bd82"
                  width={0.8}
                />
              </>
            ) : (
              <Tag
                pos={[0, 1.6, 1.8]}
                text="V-shaped valley"
                note="River incision together with weathering and slope movement can produce a V-shaped cross-section. The river alone does not cut the entire valley side, and not all river valleys are V-shaped."
                occlude={false}
              />
            )}
          </group>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? `Water flows downstream; the waterfall retreats upstream by ${(25 * progress).toFixed(1)} m in this chosen sequence. Change Retreat to expose a longer gorge.`
          : mode === 1
            ? "Flow circulates abrasive sediment in a bedrock hollow. The closed rock body surrounds a 1.24 m wide, 0.9 m deep example."
            : "A narrow channel cuts the valley floor; weathering and slope processes act on both sides. The water moves downstream while the selected valley remains fixed."}
        <br />
        {
          "Play follows flow only. No erosion rate, sediment budget or landform age is inferred. Select a feature, rotate the model and compare the real photograph."
        }
      </ScienceReadout>
    </>
  );
}
