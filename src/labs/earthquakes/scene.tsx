import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { waveExperiment } from "@/lib/seismic-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { RockMaterial } from "../shared/rock-material";
import { TerrainMaterial } from "../shared/natural-world";
function Wavefront({ radius, depth, color }: { radius: number; depth: number; color: string }) {
  if (radius < 0.001) return null;
  const start = radius > depth ? Math.acos(depth / radius) : 0;
  const meridian = Array.from({ length: 97 }, (_, i): [number, number, number] => {
    const a = start + ((Math.PI - start) * i) / 96;
    return [radius * Math.sin(a), -depth + radius * Math.cos(a), 0.025];
  });
  return (
    <group>
      <mesh position={[0, -depth, 0]}>
        <sphereGeometry args={[radius, 96, 64, 0, Math.PI * 2, start, Math.PI - start]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.085}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Line points={meridian} color={color} lineWidth={2} />
      <Line
        points={meridian.map((p) => [-p[0], p[1], p[2]] as [number, number, number])}
        color={color}
        lineWidth={2}
      />
    </group>
  );
}
export default function Earthquakes() {
  const { t, params } = useLabControls();
  useLabTick(1 / 45);
  const seconds = t * 25,
    depth = params.depth ?? 20,
    d = depth / 50,
    w = waveExperiment(seconds, depth),
    radius = w.surfaceRadius / 50;
  const faultX = -d / Math.tan(Math.PI / 3);
  return (
    <>
      <ScienceStudio
        slug="earthquakes"
        camera={[1.5, 1.3, 8]}
        ground={false}
        scale="One geometric scale · 1 scene unit = 50 km · hypocentre marker enlarged"
        trueScale="P = 6 km/s · S = 3.5 km/s in a uniform solid · no ray refraction"
      >
        <mesh position={[0, -2.1, 0]}>
          <boxGeometry args={[7.2, 4.2, 3.4]} />
          <RockMaterial
            color="#b88f6a"
            desaturate={0.9}
            strata
            roughness={1}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[7.2, 0.045, 3.4]} />
          <TerrainMaterial kind="grass" color="#7c9b55" transparent opacity={0.85} />
        </mesh>
        <Line
          points={[
            [faultX, 0, -1.5],
            [faultX, 0, 1.5],
          ]}
          color="#d89a85"
          lineWidth={2}
        />
        <Line
          points={[
            [faultX, 0, 0],
            [0, -d, 0],
            [(4.1 - d) / Math.tan(Math.PI / 3), -4.1, 0],
          ]}
          color="#d89a85"
          lineWidth={1.5}
          dashed
          dashSize={0.1}
          gapSize={0.06}
        />
        <Wavefront radius={w.pRadius / 50} depth={d} color="#edc086" />
        <Wavefront radius={w.sRadius / 50} depth={d} color="#8dcbdb" />
        {radius > 0 && (
          <Line
            points={Array.from(
              { length: 161 },
              (_, i) =>
                [
                  radius * Math.cos((i / 160) * Math.PI * 2),
                  0.04,
                  radius * Math.sin((i / 160) * Math.PI * 2),
                ] as [number, number, number],
            )}
            color="#cfb0d1"
            lineWidth={3}
          />
        )}
        <Line
          points={[
            [0, -d, 0],
            [0, 0.03, 0],
          ]}
          color="#e7ebe3"
          dashed
          dashSize={0.05}
          gapSize={0.035}
        />
        <mesh position={[0, -d, 0]}>
          <sphereGeometry args={[0.055, 24, 16]} />
          <meshBasicMaterial color="#f0c084" />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.09, 32]} />
          <meshBasicMaterial color="#ece9d7" side={THREE.DoubleSide} />
        </mesh>
        <group position={[1, 0.045, 0]}>
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[0.2, 0.09, 0.16]} />
            <meshStandardMaterial color="#a4b6ab" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.025, 0.036, 0.2, 16]} />
            <meshStandardMaterial color="#d8d5bc" metalness={0.45} roughness={0.4} />
          </mesh>
          <Line
            points={[
              [0, 0.25, 0],
              [0.16, 0.34, 0],
              [0.23, 0.34, 0],
            ]}
            color="#e2dcc5"
            lineWidth={2}
          />
        </group>
        <group position={[1.3, 0.9, 0.05]}>
          <mesh position={[0.55, 0, -0.015]}>
            <boxGeometry args={[1.2, 0.52, 0.035]} />
            <meshStandardMaterial color="#182e32" roughness={0.7} />
          </mesh>
          <Line
            points={Array.from({ length: 161 }, (_, i): [number, number, number] => {
              const time = seconds - 8 + (i / 160) * 8,
                p = time - w.pArrival,
                s = time - w.sArrival,
                amp =
                  (p > 0 ? 0.052 * Math.exp(-p / 4) * Math.sin(p * 10) : 0) +
                  (s > 0 ? 0.11 * Math.exp(-s / 5) * Math.sin(s * 6) : 0);
              return [(i / 160) * 1.12, amp, 0.012];
            })}
            color="#9bdbd0"
            lineWidth={1.5}
          />
        </group>
        <Line
          points={[
            [0, 0.05, 0],
            [-2.7, 0.5, 0.6],
          ]}
          color="#9daaa7"
          lineWidth={0.8}
        />
        <Line
          points={[
            [0, -d, 0],
            [-2.7, -1.1, 0.6],
          ]}
          color="#9daaa7"
          lineWidth={0.8}
        />
        <Line
          points={[
            [1, 0.11, 0],
            [2.7, 0.5, 0.6],
          ]}
          color="#9daaa7"
          lineWidth={0.8}
        />
        <Tag
          pos={[-2.7, 0.5, 0.6]}
          text="Epicentre"
          note="The epicentre is vertically above the hypocentre. It is not necessarily where the inclined fault reaches the surface."
          occlude={false}
        />
        <Tag
          pos={[-2.7, -1.1, 0.6]}
          text={`Hypocentre · ${depth.toFixed(0)} km`}
          note="Rupture starts at the focus or hypocentre. This point-source experiment launches spherical fronts in a uniform solid; real ruptures extend over a fault area."
          occlude={false}
        />
        <Tag
          pos={[2.7, 0.5, 0.6]}
          text="Station · 50 km"
          note="The station is 50 km horizontally from the epicentre. Straight-ray travel distance is the square root of depth squared plus 50 km squared."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {seconds.toFixed(1)} {"s · "}
        <span className="text-sandstone">
          {"P: "}
          {w.pRadius.toFixed(1)} {"km"}
        </span>{" "}
        ·{" "}
        <span className="text-glacier">
          {"S: "}
          {w.sRadius.toFixed(1)} {"km"}
        </span>
        {". Station arrivals: P "}
        {w.pArrival.toFixed(2)} {"s; S "}
        {w.sArrival.toFixed(2)} {"s."}
        <br />
        {
          "Transparent rock reveals the wave fronts. The violet front begins after the S wave reaches the epicentre; each arrival activates the station trace."
        }
      </ScienceReadout>
    </>
  );
}
