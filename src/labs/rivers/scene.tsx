import { useMemo, useEffect } from "react";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { useIsCompact } from "@/hooks/use-media";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { SectionMaterial } from "../shared/section-material";
import { landSectionGlsl } from "../shared/land-section";
import { Buildings, settlement } from "../shared/hazard-parts";
import { waterRibbonGeometry } from "../shared/river-terrain";
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

const SIDES = landSectionGlsl({ rock: "sandstone", soil: 0.035, regolith: 0.07, beds: 9 });
const BRIDGE_X = 2.25;

/** A stone road bridge where a lane crosses the lower river; the deck clears flood stage. */
function Bridge({ f }: { f: number }) {
  const [left, right] = riverBanks(BRIDGE_X, 1.6),
    deck = (riverStage(BRIDGE_X, 1.6) + 0.07) * f,
    span = right - left + 0.16,
    mid = (left + right) / 2;
  const road = useMemo(() => {
    const path = Array.from({ length: 90 }, (_, i) => {
      const z = -1.98 + (i / 89) * 3.96,
        x = BRIDGE_X + 0.12 * Math.sin(z * 1.3) * Math.min(1, Math.abs(z - mid) * 2),
        onDeck = z > mid - span / 2 - 0.05 && z < mid + span / 2 + 0.05;
      return [x, Math.max(riverLand(x, z) * f + 0.006, onDeck ? deck + 0.012 : 0), z] as [
        number,
        number,
        number,
      ];
    });
    return waterRibbonGeometry(path, 0.03);
  }, [f, deck, mid, span]);
  useEffect(() => () => road.dispose(), [road]);
  return (
    <>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#8b8478" roughness={0.95} />
      </mesh>
      <group position={[BRIDGE_X, deck, mid]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.085, 0.024, span]} />
          <meshStandardMaterial color="#a39a88" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.038, 0.02, 0]} castShadow>
            <boxGeometry args={[0.01, 0.018, span]} />
            <meshStandardMaterial color="#988f7d" roughness={0.9} />
          </mesh>
        ))}
        {[-0.5, 0, 0.5].map((k) => (
          <mesh key={k} position={[0, -deck / 2 + 0.01, k * span * 0.62]} castShadow>
            <boxGeometry args={[0.07, deck - 0.02, 0.035]} />
            <meshStandardMaterial color="#8e8574" roughness={0.95} />
          </mesh>
        ))}
      </group>
    </>
  );
}
export default function Rivers() {
  const compact = useIsCompact();
  const { params, trueScale, t } = useLabControls();
  useLabTick(1 / 12);
  const q = params.discharge ?? 0.7,
    f = trueScale ? 1 / 12 : 1;
  const village = useMemo(
    () =>
      settlement(2.15, 0.65, 16, 0.6, 0.075, 4, (x, z) => {
        const r = riverBanks(x, 1.6)[1];
        return z > r + 0.3 && Math.abs(x - BRIDGE_X) > 0.07 && z < 1.85 && x < 2.9;
      }),
    [],
  );
  const vegetation = useMemo(() => {
    const v = riverVegetation(f),
      clear = (p: [number, number, number]) =>
        village.every((b) => Math.hypot(p[0] - b.x, p[2] - b.z) > 0.12) &&
        Math.abs(p[0] - BRIDGE_X) > 0.06;
    return {
      conifers: v.conifers.filter((t) => clear(t.p)),
      broadleaf: v.broadleaf.filter((t) => clear(t.p)),
      shrubs: v.shrubs.filter(clear),
      grass: v.grass,
    };
  }, [f, village]);
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
            <SectionMaterial attach="material-1" glsl={SIDES} surface cacheKey="rivers-sides" />
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
          <Buildings items={village} ground={(x, z) => riverLand(x, z) * f} />
          <Bridge f={f} />
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
