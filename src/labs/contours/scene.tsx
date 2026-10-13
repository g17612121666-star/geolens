import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { TerrainMaterial } from "../shared/natural-world";
import { RockMaterial } from "../shared/rock-material";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { contours, hillHeight } from "./geometry";
export default function Contours() {
  const { params, trueScale } = useLabControls();
  const interval = params.interval ?? 10,
    mode = (params.mode3d ?? 1) > 0.5,
    factor = mode ? (trueScale ? 1 : 2.5) : 0;
  const [spot, setSpot] = useState<[number, number]>([0, 0]);
  const g = useMemo(
    () => terrainBlockGeometry((x, z) => (hillHeight(x, z) / 100) * factor, 6, 4, 128, -0.16),
    [factor],
  );
  useEffect(() => () => g.dispose(), [g]);
  const lines = useMemo(() => contours(interval), [interval]);
  const sampled = hillHeight(...spot);
  return (
    <>
      <ScienceStudio
        slug="contours"
        scale="Relief ×2.5 · same hill and contour vertices · T restores equal horizontal / vertical scale"
        trueScale="1 scene unit = 100 m in all directions"
        camera={[4.8, 5.8, 7]}
      >
        <group position={[0, -0.7, 0]}>
          <mesh
            geometry={g}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              setSpot([e.point.x, e.point.z]);
            }}
          >
            <TerrainMaterial
              attach="material-0"
              kind="grass"
              color="#91a27d"
              normalScale={new THREE.Vector2(0.12, 0.12)}
              roughness={0.95}
            />
            <RockMaterial attach="material-1" color="#9e8a6b" />
          </mesh>
          {lines.map((l) => (
            <Line
              key={l.height}
              segments
              points={l.points.map((p) => [p[0], (l.height / 100) * factor + 0.008, p[1]])}
              color={l.height % 50 === 0 ? "#f0ce8b" : "#c5d4b3"}
              lineWidth={l.height % 50 === 0 ? 2 : 1}
            />
          ))}
          {mode && (
            <Line
              points={[
                [spot[0], 0.005, spot[1]],
                [spot[0], (sampled / 100) * factor + 0.015, spot[1]],
              ]}
              color="#f0b58b"
              lineWidth={1.2}
              dashed
              dashSize={0.04}
              gapSize={0.025}
            />
          )}
          <mesh position={[spot[0], (sampled / 100) * factor + 0.025, spot[1]]}>
            <sphereGeometry args={[0.04, 20, 20]} />
            <meshStandardMaterial color="#ff9974" />
          </mesh>
          <Tag
            pos={[spot[0], (sampled / 100) * factor + 0.22, spot[1]]}
            text={`${sampled.toFixed(1)} m`}
            note="Click any point on the surface to measure its elevation above this model's datum."
            occlude={false}
          />
          <Line
            points={[
              [-3, 0.01, 2.2],
              [-2, 0.01, 2.2],
            ]}
            color="#f4efe6"
            lineWidth={3}
          />
          <Tag pos={[-2.5, 0.01, 2.45]} text="100 m" occlude={false} />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {"Contour interval "}
        {interval} {"m · spot "}
        {sampled.toFixed(1)}{" "}
        {
          "m. Click the hill to check a height. Turn off “3D hill” and look from above for its contour map; the elevations stay the same."
        }
      </ScienceReadout>
    </>
  );
}
