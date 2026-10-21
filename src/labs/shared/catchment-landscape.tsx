import { useMemo, useEffect } from "react";
import { Line } from "@react-three/drei";
import { terrainBlockGeometry } from "./science-geometry";
import { TerrainMaterial, PlantStand } from "./natural-world";
import { WaterRibbon, GrassPatch, DebrisField } from "./geomorphic-terrain";
import { SectionMaterial } from "./section-material";

/** Catchment cut faces: weathered regolith over gently dipping sandstone and mudstone beds. */
const BEDROCK_GLSL = `
vec3 sectionColour(vec3 p,vec3 w){
  float g=grain(w.xy+w.zy),bed=fract(w.y*7.+w.x*.12);
  vec3 sand=mix(vec3(.80,.68,.50),vec3(.70,.58,.42),g);
  vec3 mud=mix(vec3(.56,.50,.46),vec3(.46,.42,.40),g);
  vec3 c=bed<.62?sand:mud;
  c*=mix(.75,1.,smoothstep(0.,.03,min(bed,abs(bed-.62))));
  return mix(c,vec3(.50,.38,.27),smoothstep(-.05,.12,w.y)*.7);
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
import { useLabControls } from "@/lib/store/lab-controls";
import * as THREE from "three";
import { Buildings, farmland, settlement } from "./hazard-parts";
import { CloudVolume, RainStreaks } from "../atmosphere-layers/weather-volumes";
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
    geometry = useMemo(() => {
      const g = terrainBlockGeometry(catchmentHeight, 4, 3.2, 160, -0.3),
        p = g.attributes.position,
        c = new Float32Array(p.count * 3),
        col = new THREE.Color(),
        tone = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          n = noise(x * 3 + 4, z * 3),
          d = streamDistance(x, z);
        // Valley meadows and fields, wooded mid-slopes, upland moor and rock near the divide.
        col.copy(farmland(x * 1.4, z * 1.4, 0.32));
        col.lerp(tone.set("#4f6b3c"), THREE.MathUtils.smoothstep(y, 0.28, 0.42) * 0.7);
        col.lerp(tone.set("#8a7b5c"), THREE.MathUtils.smoothstep(y, 0.62, 0.78) * 0.8);
        col.lerp(tone.set("#7a5f6b"), THREE.MathUtils.smoothstep(y, 0.75, 0.9) * n * 0.6);
        if (y > 0.82 && n > 0.62) col.lerp(tone.set("#8d877c"), 0.8);
        if (d < 0.1) col.lerp(tone.set("#5f8a4a"), 0.6);
        // Impervious surfaces spread across the lower catchment as urban cover rises.
        if (urban > 0 && y < 0.42 && z > 0.25 && x < 1.4 && noise(x * 5, z * 5) < urban * 1.2)
          col.lerp(tone.set("#7b7d7c"), 0.75);
        c.set([col.r, col.g, col.b], i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      return g;
    }, [urban]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const houses = useMemo(
    () =>
      urban > 0.02
        ? settlement(-0.3, 0.75, Math.round(urban * 45), 0.95, 0.06, 5, (x, z) => {
            const y = catchmentHeight(x, z);
            return (
              y < 0.42 && streamDistance(x, z) > 0.14 && z > 0.25 && z < 1.45 && Math.abs(x) < 1.85
            );
          })
        : [],
    [urban],
  );
  const line = (start: number, end: number, z0: number) =>
    Array.from({ length: 65 }, (_, i): [number, number, number] => {
      const x = start + ((end - start) * i) / 64,
        z = z0 * (1 - i / 64);
      return [x, catchmentHeight(x, z) + 0.025, z];
    });
  return (
    <group>
      <mesh geometry={geometry} receiveShadow castShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
        <SectionMaterial attach="material-1" glsl={BEDROCK_GLSL} cacheKey="catchment-bedrock-v1" />
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
      <Buildings items={houses} ground={catchmentHeight} />
      <GrassPatch
        positions={Array.from({ length: 130 }, (_, i) => {
          const x = -1.85 + random(i + 117) * 3.7,
            z = -1.43 + random(i + 713) * 2.86;
          return [x, catchmentHeight(x, z), z] as [number, number, number];
        }).filter(([x, , z]) => streamDistance(x, z) > 0.13)}
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
      {rain > 0.02 &&
        [
          [-1.2, -0.7],
          [-0.2, 0.9],
          [0.9, -0.4],
          [1.5, 0.8],
        ]
          .slice(0, 1 + Math.round(Math.min(1, rain) * 3))
          .map(([x, z], i) => (
            <group key={i}>
              <CloudVolume
                position={[x, 1.45, z]}
                scale={[0.6, 0.22, 0.5]}
                seed={i * 5 + 3}
                opacity={0.55 + 0.3 * Math.min(1, rain)}
              />
              <RainStreaks
                t={t}
                position={[x, 1.3, z]}
                width={0.9}
                depth={0.8}
                height={1.1}
                count={Math.round(20 + 60 * Math.min(1, rain))}
              />
            </group>
          ))}
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
