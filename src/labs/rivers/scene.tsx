import { useMemo, useEffect } from "react";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { useIsCompact } from "@/hooks/use-media";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { RockMaterial } from "../shared/rock-material";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { RiverWaterMaterial } from "./water-material";
import { riverVegetation } from "./vegetation";
import { DebrisField, GrassPatch } from "../shared/geomorphic-terrain";
import {
  riverTerrain,
  riverSurface,
  riverBed,
  riverZ,
  riverLand,
  riverBanks,
  riverStage,
} from "../shared/river-terrain";
export default function Rivers() {
  const compact = useIsCompact();
  const { params, trueScale, t } = useLabControls();
  useLabTick(1 / 12);
  const q = params.discharge ?? 0.7,
    f = trueScale ? 1 / 12 : 1;
  const vegetation = useMemo(() => riverVegetation(f), [f]);
  const gravel = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const x = -2.95 + ((i * 0.61803398875) % 1) * 5.9,
          side = i % 2 ? 1 : 0,
          banks = riverBanks(x, 0.2),
          bank = banks[side];
        const z = bank + (side ? 1 : -1) * (0.015 + 0.085 * ((i * 0.41421356) % 1));
        return [x, riverLand(x, z) * f + 0.005, z] as [number, number, number];
      }),
    [f],
  );
  const terrain = useMemo(() => riverTerrain(f), [f]),
    water = useMemo(() => riverSurface(q, f), [q, f]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => water.dispose(), [water]);
  return (
    <>
      <ScienceStudio
        slug="rivers"
        scale="Long-profile relief ×12 · channel breadth enlarged"
        trueScale="Long-profile relief ×1 · channel breadth and vegetation still enlarged"
        camera={[4.7, 5.8, 6.7]}
      >
        <group position={[0, -0.6, 0]}>
          <mesh geometry={terrain} receiveShadow castShadow>
            <TerrainMaterial
              attach="material-0"
              kind="grass"
              color="#ffffff"
              vertexColors
              roughness={0.94}
            />
            <RockMaterial attach="material-1" color="#8c795f" />
          </mesh>
          <mesh geometry={water} receiveShadow renderOrder={2}>
            <RiverWaterMaterial />
          </mesh>
          <PlantStand
            kind="conifer"
            seed={4}
            positions={vegetation.conifers.map((t) => t.p)}
            scales={vegetation.conifers.map((t) => t.size)}
          />
          <PlantStand
            kind="broadleaf"
            seed={17}
            positions={vegetation.broadleaf.map((t) => t.p)}
            scales={vegetation.broadleaf.map((t) => t.size)}
          />
          <PlantStand kind="broadleaf" scale={0.065} seed={36} positions={vegetation.shrubs} />
          <GrassPatch positions={vegetation.grass} height={0.045} color="#7a8b4f" />
          <DebrisField points={gravel} size={0.013} />
          {Array.from({ length: 18 }, (_, i) => {
            const x = -3 + ((t + i / 18) % 1) * 6,
              [left, right] = riverBanks(x, q),
              z = left + (right - left) * (0.25 + 0.5 * ((i * 0.618) % 1));
            const heading = Math.atan2(riverZ(x + 0.003) - riverZ(x - 0.003), 0.006);
            return (
              <mesh
                key={i}
                renderOrder={3}
                position={[x, riverStage(x, q) * f + 0.003, z]}
                rotation={[0, -heading, 0]}
                scale={[0.027, 0.0015, 0.004]}
              >
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color="#d4e1cd" transparent opacity={0.32} depthWrite={false} />
              </mesh>
            );
          })}
          <Tag
            pos={[-2.5, riverBed(-2.5) * f + 0.35, riverZ(-2.5)]}
            text={compact ? "1" : "Upper course · steeper"}
            title={"1 · Upper course"}
            occlude={false}
            note="A steep long profile often favours incision; channel shape, sediment and discharge also matter."
          />
          <Tag
            pos={[0.5, riverBed(0.5) * f + 0.35, riverZ(0.5)]}
            text={compact ? "2" : "Meanders"}
            title={"2 · Meanders"}
            occlude={false}
            note="Outside bends tend to erode; slower flow along inside bends favours deposition."
          />
          <Tag
            pos={[2.7, riverBed(2.7) * f + 0.4, riverZ(2.7)]}
            text={compact ? "3" : "Lower course · gentler"}
            title={"3 · Lower course"}
            occlude={false}
            note="Low gradient and a wider channel. Increased discharge raises water level and flow capacity; it does not automatically cause deposition."
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {compact && (
          <div className="mb-2 text-chalk">
            {"1 · Steeper upper course"}
            <br />
            {"2 · Meanders · 3 · Gentler lower course"}
          </div>
        )}
        {"Relative discharge "}
        {q.toFixed(2)}
        {
          "×. Increasing discharge raises the water level within the fixed channel. Play to follow the downstream flow."
        }
      </ScienceReadout>
    </>
  );
}
