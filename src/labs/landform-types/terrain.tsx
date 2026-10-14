import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { DebrisField, WaterRibbon } from "../shared/geomorphic-terrain";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
import { AlpineMaterial } from "../shared/alpine-material";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
const NAMES = ["Mountain", "Hill", "Plateau", "Plain", "Basin"];
const FIELDS = ["#7d9a5a", "#98ad62", "#c2b56e", "#6c8a50", "#a9b878", "#8a9f5c"];
const RIVER = (x: number) => 0.55 * Math.sin(x * 1.6) - 0.2;
function height(kind: number, x: number, z: number) {
  const r = x * x + z * z;
  if (kind === 0) {
    const ridge = 0.17 * noise(x * 5, z * 6) + 0.06 * noise(x * 14, z * 17);
    return (
      0.08 +
      1.7 * Math.exp(-r / 1.1) * (0.76 + 0.24 * Math.cos(x * 3 - z * 2) ** 2) +
      0.44 * Math.exp(-((x - 1) ** 2 + (z + 0.5) ** 2) / 0.42) +
      ridge * Math.exp(-r / 2)
    );
  }
  if (kind === 1)
    return 0.07 + 0.38 * Math.exp(-r / 1.6) + 0.012 * Math.sin(x * 3) * Math.cos(z * 2);
  if (kind === 2)
    return (
      0.08 +
      1.22 / (1 + Math.exp((Math.max(Math.abs(x), Math.abs(z)) - 1.25) * 12)) +
      0.015 * Math.sin(x * 5 + z * 3)
    );
  if (kind === 3) return 0.08 + 0.014 * Math.sin(x * 1.5) + 0.01 * Math.cos(z * 2);
  return 0.06 + 0.62 * (1 - Math.exp(-r / 1.8)) + 0.015 * Math.cos(x * 3) * Math.sin(z * 4);
}
function Tile({ kind, x, vertical }: { kind: number; x: number; vertical: number }) {
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry((x, z) => height(kind, x, z) * vertical, 4, 4, 112, -0.12),
      p = g.attributes.position,
      colours = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const h = height(kind, p.getX(i), p.getZ(i)),
        c = new THREE.Color("#79936c").lerp(new THREE.Color("#b0a58b"), Math.min(1, h / 1.8));
      // Lowland floors read as farmland: a patchwork of fields in several crops.
      if (kind === 3 || (kind === 4 && h < 0.2) || (kind === 1 && h < 0.18)) {
        const cell =
          Math.floor((p.getX(i) + 5) * 1.7) * 31 + Math.floor((p.getZ(i) + 5) * 1.3) * 17;
        c.set(FIELDS[Math.abs(Math.floor(Math.sin(cell) * 1000)) % FIELDS.length]);
      }
      c.multiplyScalar(0.95 + 0.05 * Math.sin(p.getX(i) * 11 + p.getZ(i) * 9));
      colours.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return g;
  }, [kind, vertical]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geometry}>
        {kind === 0 ? (
          <AlpineMaterial attach="material-0" />
        ) : (
          <TerrainMaterial
            attach="material-0"
            kind="grass"
            color="#cfcfcf"
            map={null}
            vertexColors
            roughness={0.96}
            normalScale={new THREE.Vector2(0.2, 0.2)}
          />
        )}
        <RockMaterial attach="material-1" color="#b39a7c" strata roughness={1} />
      </mesh>
      {kind === 3 && (
        <WaterRibbon
          path={Array.from({ length: 81 }, (_, i) => {
            const px = -2 + (i / 80) * 4,
              pz = RIVER(px);
            return [px, height(kind, px, pz) * vertical + 0.012, pz] as [number, number, number];
          })}
          width={0.09}
          color="#5f9fb4"
        />
      )}
      <PlantStand
        kind={kind === 0 ? "conifer" : "broadleaf"}
        scale={0.07}
        seed={kind + 2}
        positions={
          Array.from({ length: 60 }, (_, i) => {
            const px = -1.8 + random(i + kind * 89) * 3.6,
              pz = -1.7 + random(i + 129) * 3.4;
            return [px, height(kind, px, pz) * vertical, pz];
          }).filter(
            (p) =>
              height(kind, p[0], p[2]) < 0.5 && (kind !== 3 || Math.abs(p[2] - RIVER(p[0])) > 0.18),
          ) as [number, number, number][]
        }
      />
      {kind === 0 && (
        <DebrisField
          points={Array.from({ length: 24 }, (_, i) => {
            const px = -1.4 + (i % 8) * 0.4,
              pz = -1.4 + Math.floor(i / 8) * 1.35;
            return [px, height(kind, px, pz) * vertical + 0.025, pz];
          })}
          size={0.04}
        />
      )}
      <Tag
        pos={[0, 0.2, 2.4]}
        text={NAMES[kind]}
        note={
          kind === 0
            ? "High relief and steep, rugged slopes characterise this mountain example. There is no universal height threshold separating all mountains and hills."
            : kind === 1
              ? "This hill has lower relief and gentler slopes than the mountain selected here. Height alone does not define every landform."
              : kind === 2
                ? "A plateau is an extensive relatively level high surface. Its edge may be steep, and rivers may dissect it; plateaux have different origins."
                : kind === 3
                  ? "A plain has relatively low local relief. Plains can occur at high or low elevation; this selected example is low."
                  : "A basin is a depression relative to its surroundings. It can have an outlet or internal drainage; the shape alone does not guarantee a lake."
        }
        occlude={false}
      />
    </group>
  );
}
export default function LandformTypes() {
  const { params, trueScale } = useLabControls(),
    a = Math.round(params.left ?? 0),
    b = Math.round(params.right ?? 3),
    f = trueScale ? 1 : 2;
  return (
    <>
      <ScienceStudio
        slug="landform-types"
        camera={[3.5, 5.5, 8]}
        scale="Both samples: 4 × 4 km · relief ×2 · identical comparison scale"
        trueScale="Both samples: 1 scene unit = 1 km · common horizontal and vertical scale · vegetation / clasts enlarged"
      >
        <Tile kind={a} x={-2.5} vertical={f} />
        <Tile kind={b} x={2.5} vertical={f} />
      </ScienceStudio>
      <ScienceReadout>
        {NAMES[a]} {"and "}
        {NAMES[b]}{" "}
        {
          "at the same scale. Compare elevation, local relief, slope and the shape of the surface separately."
        }
        <br />
        {
          "Select any two of five forms. These are invented terrain surfaces, not surveyed locations. Colour and texture aid reading; they do not determine origin, climate or rock type."
        }
      </ScienceReadout>
    </>
  );
}
