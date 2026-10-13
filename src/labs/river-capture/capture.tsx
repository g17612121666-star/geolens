import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { PlantStand } from "../shared/natural-world";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
const donor = (x: number) => 0.8 - 0.08 * x;
export default function RiverCapture() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const stage = Math.round(params.stage ?? 0),
    head = [0.9, -0.2, -0.9][stage],
    v = trueScale ? 1 : 2;
  const height = useMemo(
    () => (x: number, z: number) => {
      const upland = 1.32 + 0.04 * Math.sin(x * 3) - 0.07 * z,
        d = donor(x) + Math.min(2, Math.abs(z + 0.9) * 2),
        c = 0.74 - (0.64 * (z + 0.9)) / 2.9 + Math.abs(x) * 2.5;
      return Math.min(upland, d, z >= head ? c : upland);
    },
    [head],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) =>
      Math.abs(z + 0.9) < 0.2 || (Math.abs(x) < 0.15 && z > head) ? "#a29c7c" : "#789079",
    [head],
  );
  const incoming = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const x = -3 + (3 * i) / 80;
        return [x, donor(x) + 0.035, -0.9] as [number, number, number];
      }),
    [],
  );
  const old = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const x = (3 * i) / 80;
        return [x, donor(x) + 0.035, -0.9] as [number, number, number];
      }),
    [],
  );
  const captured = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const z = head + ((2 - head) * i) / 80;
        return [0, 0.775 - (0.64 * (z + 0.9)) / 2.9, z] as [number, number, number];
      }),
    [head],
  );
  const path = stage === 2 ? [...incoming, ...captured] : [...incoming, ...old];
  return (
    <>
      <ScienceStudio
        slug="river-capture"
        camera={[2.7, 6.4, 5.8]}
        scale="Invented 6 × 4 km catchments · relief ×2 · three selected stages"
        trueScale="1 scene unit = 1 km · common distances · water and vegetation symbols enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain height={height} colour={colour} />
          <WaterRibbon path={incoming} />
          <WaterRibbon path={old} width={stage === 2 ? 0.025 : 0.12} />
          <WaterRibbon path={captured} width={stage === 2 ? 0.13 : 0.07} />
          <group scale={[1, 1 / v, 1]}>
            <PlantStand
              kind="broadleaf"
              scale={0.06}
              seed={9}
              positions={Array.from({ length: 80 }, (_, i) => {
                const x = -2.85 + random(i + 174) * 5.7,
                  z = -1.85 + random(i + 936) * 3.7;
                return [x, height(x, z) * v, z] as [number, number, number];
              }).filter(([x, , z]) => Math.abs(z + 0.9) > 0.4 && (z < head || Math.abs(x) > 0.5))}
            />
          </group>
          {stage === 2 && (
            <DebrisField
              points={Array.from({ length: 65 }, (_, i) => {
                const x = 0.3 + ((i % 13) / 12) * 2.6,
                  z = -0.9 + (Math.floor(i / 13) - 2) * 0.047;
                return [x, height(x, z) + 0.01, z];
              })}
              size={0.018}
              color="#c3b99a"
            />
          )}
          {stage === 2 && (
            <Line
              points={old.map((p) => [p[0], p[1] + 0.02, p[2]] as [number, number, number])}
              color="#d5b17b"
              dashed
              dashSize={0.1}
              gapSize={0.1}
            />
          )}
          {Array.from({ length: 22 }, (_, i) => {
            const p = path[Math.floor(((t + i / 22) % 1) * (path.length - 1))];
            return (
              <mesh key={i} position={[p[0], p[1] + 0.025, p[2]]}>
                <sphereGeometry args={[0.026, 8, 6]} />
                <meshBasicMaterial color="#e4ece5" />
              </mesh>
            );
          })}
          <Arrow
            from={[0.35, 1.5, Math.max(head + 0.5, 0.1)]}
            to={[0.35, 1.5, head - 0.1]}
            color="#dfb880"
            width={0.9}
          />
          <Tag
            pos={[-2, 1.25, -1.7]}
            text={stage === 2 ? "Captured headwaters" : "Neighbouring river"}
            note="The upstream water formerly continued east across the scene. After interception it turns into the lower captor valley. Channel widths and tracer speed do not quantify discharge."
            occlude={false}
          />
          <Tag
            pos={[-1.1, 0.6, 1.85]}
            text="Captor stream"
            note="Headward erosion extends this lower valley towards a divide. When the divide is breached, a new lower route can divert the neighbouring river. Relative base level, rock and structure affect the process."
            occlude={false}
          />
          {stage === 2 && (
            <Tag
              pos={[2, 1.3, 0.15]}
              text="Beheaded reach"
              note="A reduced local stream may occupy the former valley. An elbow of capture and an underfit valley are clues; neither proves capture without other geomorphic and geological evidence."
              occlude={false}
            />
          )}
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {
          [
            "Before capture: two separate drainage routes.",
            "Headward erosion: the captor approaches the divide.",
            "After capture: headwater flow turns into the lower outlet; the former downstream reach loses that supply.",
          ][stage]
        }
        <br />
        {
          "The gold arrow shows headward extension, opposite the captor’s downstream flow. Stages are selected geometry, not a dated erosion simulation. Play follows the current water route."
        }
      </ScienceReadout>
    </>
  );
}
