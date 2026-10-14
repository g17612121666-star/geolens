import { useMemo, useEffect } from "react";
import { Line } from "@react-three/drei";
import { terrainBlockGeometry } from "./science-geometry";
import { TerrainMaterial, PlantStand } from "./natural-world";
import { WaterRibbon, GrassPatch, DebrisField } from "./geomorphic-terrain";
import { RockMaterial } from "./rock-material";
import { useLabControls } from "@/lib/store/lab-controls";
import { landscapeRandom as random, landscapeNoise as noise } from "./landscape-noise";
const streamDistance = (x: number, z: number) =>
  Math.min(Math.abs(z), x >= -1.7 && x <= 0 ? Math.abs(Math.abs(z) + (x * 1.2) / 1.7) : 10);
export const catchmentHeight = (x: number, z: number) =>
  0.08 +
  0.52 * ((2 - x) / 4) ** 2 +
  0.5 * Math.sin((z * Math.PI) / 3.2) ** 2 +
  0.025 * (noise(x * 4, z * 5) - 0.5) * Math.min(1, streamDistance(x, z) * 8) -
  0.055 * Math.exp(-((streamDistance(x, z) / 0.1) ** 4));
const trees = Array.from({ length: 130 }, (_, i) => {
  const x = -1.85 + random(i + 3) * 3.7,
    z = -1.48 + random(i + 611) * 2.96;
  return [x, catchmentHeight(x, z), z] as [number, number, number];
}).filter(([x, y, z]) => streamDistance(x, z) > 0.22 && y < 1);
export function CatchmentLandscape({
  urban = 0,
  rain = 0,
  flow = 0.2,
  divide = false,
}: {
  urban?: number;
  rain?: number;
  flow?: number;
  divide?: boolean;
}) {
  const t = useLabControls((s) => s.t),
    geometry = useMemo(() => terrainBlockGeometry(catchmentHeight, 4, 3.2, 128, -0.3), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const line = (start: number, end: number, z0: number) =>
    Array.from({ length: 65 }, (_, i): [number, number, number] => {
      const x = start + ((end - start) * i) / 64,
        z = z0 * (1 - i / 64);
      return [x, catchmentHeight(x, z) + 0.025, z];
    });
  return (
    <group>
      <mesh geometry={geometry} receiveShadow castShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#75916d" />
        <RockMaterial attach="material-1" color="#b39a7c" strata />
      </mesh>
      <WaterRibbon path={line(-2, 2, 0)} width={0.045 + flow * 0.11} color="#4c97a4" />
      <DebrisField
        points={Array.from({ length: 60 }, (_, i) => {
          const x = -1.9 + ((i % 30) / 29) * 3.8,
            z = (i < 30 ? -1 : 1) * (0.08 + flow * 0.11);
          return [x, catchmentHeight(x, z) + 0.014, z];
        })}
        size={0.021}
        color="#aaa28a"
      />
      {[-1, 1].map((sign) => (
        <WaterRibbon
          key={sign}
          path={line(-1.7, 0, sign * 1.2)}
          width={0.022 + flow * 0.03}
          color="#62adba"
        />
      ))}
      <PlantStand
        kind="broadleaf"
        scale={0.1}
        seed={11}
        positions={trees.slice(Math.round(urban * trees.length))}
      />
      {Array.from({ length: Math.round(urban * 24) }, (_, i) => {
        const x = -1.65 + (i % 6) * 0.55,
          z = 0.45 + Math.floor(i / 6) * 0.29;
        return (
          <group key={i} position={[x, catchmentHeight(x, z), z]}>
            <mesh position={[0, 0.015, 0]}>
              <boxGeometry args={[0.38, 0.025, 0.23]} />
              <meshStandardMaterial color="#687b83" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.085, 0]}>
              <boxGeometry args={[0.19, 0.14, 0.13]} />
              <meshStandardMaterial color="#b9b5a9" roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.172, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.14, 0.08, 4]} />
              <meshStandardMaterial color="#716758" roughness={0.95} />
            </mesh>
          </group>
        );
      })}
      <GrassPatch
        positions={Array.from({ length: 130 }, (_, i) => {
          const x = -1.85 + random(i + 117) * 3.7,
            z = -1.43 + random(i + 713) * 2.86;
          return [x, catchmentHeight(x, z), z] as [number, number, number];
        }).filter(([x, y, z]) => streamDistance(x, z) > 0.13)}
        height={0.055}
      />
      {[-1, 1].map((sign, k) =>
        Array.from({ length: 7 }, (_, i) => {
          const u = (t + i / 7) % 1,
            x = -1.7 + u * 1.7,
            z = sign * 1.2 * (1 - u);
          return (
            <mesh key={`${k}-${i}`} position={[x, catchmentHeight(x, z) + 0.035, z]}>
              <sphereGeometry args={[0.015, 8, 6]} />
              <meshBasicMaterial color="#dbefdf" />
            </mesh>
          );
        }),
      )}
      {Array.from({ length: Math.round(72 * Math.min(1, rain)) }, (_, i) => {
        const x = -1.8 + (i % 9) * 0.42,
          z = -1.3 + Math.floor(i / 9) * 0.34,
          y = catchmentHeight(x, z) + ((((i * 0.618 - t * 10) % 1) + 1) % 1) * 1.1;
        return (
          <Line
            key={i}
            points={[
              [x, y + 0.07, z],
              [x, y, z],
            ]}
            color="#a4d6e3"
            lineWidth={1}
          />
        );
      })}
      {divide && (
        <Line
          points={[
            ...Array.from({ length: 33 }, (_, i): [number, number, number] => {
              const x = 2 - i / 8;
              return [x, catchmentHeight(x, -1.6) + 0.025, -1.6];
            }),
            ...Array.from({ length: 33 }, (_, i): [number, number, number] => {
              const z = -1.6 + i / 10;
              return [-2, catchmentHeight(-2, z) + 0.025, z];
            }),
            ...Array.from({ length: 33 }, (_, i): [number, number, number] => {
              const x = -2 + i / 8;
              return [x, catchmentHeight(x, 1.6) + 0.025, 1.6];
            }),
          ]}
          color="#e6c68b"
          lineWidth={2.5}
        />
      )}
    </group>
  );
}
