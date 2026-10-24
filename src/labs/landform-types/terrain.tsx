import { useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { PlantStand } from "../shared/natural-world";
import { DebrisField, WaterRibbon, GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { Buildings } from "../shared/hazard-parts";
import { farmland, settlement } from "../shared/hazard-utils";
import type { LandSection } from "../shared/land-section";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
const NAMES = ["Mountain", "Hill", "Plateau", "Plain", "Basin"];
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
  if (kind === 2) {
    // The high surface runs off the back and right of the sample, so it reads as the edge of an
    // extensive plateau rather than an isolated flat-topped block (a mesa).
    const edge = Math.max(-x, z) + 0.12 * Math.sin(x * 2.3 + 1) + 0.1 * Math.sin(z * 2.9);
    return 0.08 + 1.22 / (1 + Math.exp((edge - 0.8) * 12)) + 0.015 * Math.sin(x * 5 + z * 3);
  }
  if (kind === 3) return 0.08 + 0.014 * Math.sin(x * 1.5) + 0.01 * Math.cos(z * 2);
  return 0.06 + 0.62 * (1 - Math.exp(-r / 1.8)) + 0.015 * Math.cos(x * 3) * Math.sin(z * 4);
}
/** Readout numbers for each form at true scale (1 unit = 1 km), sampled on a 50 m grid. */
const STATS = NAMES.map((_, kind) => {
  const n = 80,
    d = 4 / n,
    slopes: number[] = [];
  let hi = -Infinity,
    lo = Infinity;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = -2 + i * d,
        z = -2 + j * d,
        h = height(kind, x, z);
      hi = Math.max(hi, h);
      lo = Math.min(lo, h);
      if (i < n && j < n) {
        const gx = (height(kind, x + d, z) - h) / d,
          gz = (height(kind, x, z + d) - h) / d;
        slopes.push((Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI);
      }
    }
  slopes.sort((p, q) => p - q);
  return {
    hi: Math.round(hi * 100) * 10,
    lo: Math.round(lo * 100) * 10,
    relief: Math.round((hi - lo) * 100) * 10,
    typical: Math.round(slopes[Math.floor(slopes.length / 2)]),
    steepest: Math.round(slopes[slopes.length - 1]),
  };
});
const SECTIONS: LandSection[] = [
  { rock: "granite", soil: 0.02, regolith: 0.05 },
  { rock: "sandstone", soil: 0.05, regolith: 0.09, beds: 7 },
  { rock: "sandstone", soil: 0.03, regolith: 0.05, beds: 5 },
  { rock: "shale", soil: 0.08, regolith: 0.1, beds: 4 },
  { rock: "shale", soil: 0.06, regolith: 0.1, beds: 3 },
];
const SNOW = new THREE.Color("#eef2f3"),
  SCREE = new THREE.Color("#9b968a"),
  ALPINE = new THREE.Color("#8d9a5f"),
  FOREST = new THREE.Color("#55703f"),
  PASTURE = new THREE.Color("#7f9d55"),
  MOOR = new THREE.Color("#8b8158"),
  WOOD = new THREE.Color("#5f7a45");

/** Fields with low-contrast hedgerow edges, so the pattern reads as farmland rather than a grid. */
function fields(x: number, z: number, cell: number) {
  const c = farmland(x, z, cell).lerp(PASTURE, 0.35),
    u = (x + 0.3 * Math.sin(z * 1.3)) / cell,
    v = (z + 0.2 * Math.sin(x * 1.1)) / (cell * 0.8),
    edge = Math.min(
      u - Math.floor(u),
      1 - u + Math.floor(u),
      v - Math.floor(v),
      1 - v + Math.floor(v),
    );
  // farmland() darkens edges strongly; lift them back to a soft hedge line.
  if (edge < 0.05) c.multiplyScalar(1.18);
  return c;
}

/** Land cover for each form; steep ground shows the bedrock through the surface shader. */
function cover(kind: number, x: number, z: number) {
  const h = height(kind, x, z),
    n = noise(x * 3 + kind, z * 3),
    c = new THREE.Color();
  if (kind === 0) {
    c.copy(FOREST)
      .lerp(ALPINE, THREE.MathUtils.smoothstep(h, 0.42 + 0.1 * n, 0.6))
      .lerp(SCREE, THREE.MathUtils.smoothstep(h, 0.8, 1.05) * 0.8)
      .lerp(SNOW, THREE.MathUtils.smoothstep(h, 1.15 + 0.15 * n, 1.3));
  } else if (kind === 1) {
    c.copy(farmland(x, z, 0.5))
      .lerp(PASTURE, 0.35)
      .lerp(MOOR, THREE.MathUtils.smoothstep(h, 0.32, 0.43));
  } else if (kind === 2) {
    c.copy(fields(x, z, 0.45)).lerp(MOOR, THREE.MathUtils.smoothstep(h, 0.6, 1.1));
    c.lerp(PASTURE, 0.3 * n);
  } else if (kind === 3) {
    c.copy(fields(x, z, 0.42));
    if (Math.abs(z - RIVER(x)) < 0.16) c.lerp(new THREE.Color("#8fae62"), 0.7);
  } else {
    c.copy(fields(x, z, 0.4)).lerp(PASTURE, THREE.MathUtils.smoothstep(h, 0.2, 0.35));
    c.lerp(WOOD, THREE.MathUtils.smoothstep(h, 0.4, 0.55) * (0.5 + 0.5 * n));
  }
  return c.getStyle();
}

function Tile({ kind, x, vertical }: { kind: number; x: number; vertical: number }) {
  const surface = useMemo(
    () => (px: number, pz: number) => height(kind, px, pz) * vertical,
    [kind, vertical],
  );
  const colour = useMemo(() => (px: number, _y: number, pz: number) => cover(kind, px, pz), [kind]);
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 70 && i < 900; i++) {
      const px = -1.88 + random(i + kind * 89) * 3.76,
        pz = -1.88 + random(i + 129 + kind * 7) * 3.76,
        h = height(kind, px, pz),
        n = noise(px * 2.5 + 3, pz * 2.5);
      const ok =
        kind === 0
          ? h < 0.52 && n > 0.3
          : kind === 1
            ? n > 0.62
            : kind === 2
              ? h < 0.4 && n > 0.58
              : kind === 3
                ? Math.abs(pz - RIVER(px)) > 0.2 && n > 0.66
                : h > 0.25 && n > 0.45;
      if (ok) out.push([px, surface(px, pz) - 0.005, pz]);
    }
    return out;
  }, [kind, surface]);
  const houses = useMemo(
    () =>
      kind === 3
        ? settlement(0.7, 0.9, 9, 0.45, 0.07, 2, (px, pz) => Math.abs(pz - RIVER(px)) > 0.25)
        : kind === 4
          ? settlement(0, 0, 14, 0.6, 0.07, 5)
          : kind === 2
            ? settlement(-0.4, 0.3, 4, 0.35, 0.07, 8)
            : [],
    [kind],
  );
  return (
    <group position={[x, 0, 0]}>
      <GeomorphicTerrain
        height={surface}
        colour={colour}
        width={4}
        depth={4}
        resolution={160}
        base={-0.14}
        cliff={kind === 0 ? 0.52 : 0.68}
        mottle={0.08}
        section={SECTIONS[kind]}
      />
      {kind === 3 && (
        <WaterRibbon
          path={Array.from({ length: 81 }, (_, i) => {
            const px = -2 + (i / 80) * 4,
              pz = RIVER(px);
            return [px, height(kind, px, pz) * vertical + 0.012, pz] as [number, number, number];
          })}
          width={0.06}
          color="#4f8ea8"
        />
      )}
      <PlantStand
        kind={kind === 0 ? "conifer" : "broadleaf"}
        scale={0.075}
        seed={kind + 2}
        positions={trees}
      />
      <Buildings items={houses} ground={surface} />
      {kind === 0 && (
        <DebrisField
          points={Array.from({ length: 30 }, (_, i) => {
            const a = i * 2.399,
              r = 0.75 + 0.25 * Math.sin(i * 3),
              px = r * Math.cos(a),
              pz = r * Math.sin(a);
            return [px, surface(px, pz) + 0.02, pz];
          })}
          size={0.035}
          color="#a7a197"
        />
      )}
      <Tag
        pos={[0, 0.2, 2.4]}
        text={NAMES[kind]}
        note={
          kind === 0
            ? "High relief and steep, rugged slopes: forest gives way to alpine grassland, bare rock and snow with height. No single height separates mountains from hills."
            : kind === 1
              ? "This hill has lower relief and gentler slopes than the mountain. Height alone does not define a landform."
              : kind === 2
                ? "A plateau is a broad, fairly level high surface. Its edges may be steep, exposing the rock layers beneath, and rivers may cut valleys into it. Plateaux form in different ways."
                : kind === 3
                  ? "A plain has low local relief. Plains can lie at high or low elevation; this one is low, with fields and a meandering river."
                  : "A basin is lower than the land around it. It may have an outlet or drain inwards; the shape alone does not mean it holds a lake."
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
        horizon
        slug="landform-types"
        camera={[3.5, 5.5, 8]}
        scale="Both samples: 4 × 4 km · relief ×2 · identical comparison scale · trees and buildings enlarged"
        trueScale="Both samples: 1 scene unit = 1 km · common horizontal and vertical scale · trees, buildings and boulders enlarged"
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
        <span className="mt-2 grid grid-cols-2 gap-3">
          {[a, b].map((kind, i) => (
            <span key={i}>
              <strong>
                {i === 0 ? "Left" : "Right"}: {NAMES[kind]}
              </strong>
              <br />
              Highest point {STATS[kind].hi.toLocaleString("en-GB")} m · lowest{" "}
              {STATS[kind].lo.toLocaleString("en-GB")} m
              <br />
              Local relief <strong>{STATS[kind].relief.toLocaleString("en-GB")} m</strong>
              <br />
              Typical slope {STATS[kind].typical}° · steepest {STATS[kind].steepest}°
            </span>
          ))}
        </span>
        <br />
        {
          "Choose any two of the five forms. These are invented surfaces, not real places. Heights are measured from the scene's zero level, taken as sea level; local relief is highest minus lowest point in the 4 × 4 km sample. Slopes are true-scale values, whatever the relief setting. Colour and texture help you read them; they do not show origin, climate or rock type."
        }
      </ScienceReadout>
    </>
  );
}
