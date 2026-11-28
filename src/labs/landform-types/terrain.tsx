import { useMemo } from "react";
import * as THREE from "three";
import { useLabState } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { PlantStand } from "../shared/natural-world";
import { DebrisField, WaterRibbon, GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { Buildings } from "../shared/hazard-parts";
import { farmland, settlement } from "../shared/hazard-utils";
import type { LandSection } from "../shared/land-section";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import {
  BASIN_CENTER,
  BASIN_OUTLET,
  NAMES,
  canyonRiver,
  hillStream,
  landformHeight,
  onEscarpment,
  plainRiver,
} from "./shapes";
import { useT } from "@/lib/i18n";
const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const height = landformHeight;
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
/** Gray crystalline rock with faint banding and a few joints, for the mountain's cut faces. */
const MOUNTAIN_ROCK = `
  vec2 q = vec2(p.x + p.z, p.y);
  float m = sNoise(q * 3.) * .5 + sNoise(q * 9. + 2.) * .3 + g * .2;
  vec3 c = mix(vec3(.47, .46, .44), vec3(.64, .63, .6), m);
  c *= 1. - .1 * smoothstep(.6, .9, sNoise(vec2(q.x * 1.5, q.y * 14. + q.x * 3.)));
  float j = fract(q.x * 2.2 + .5 * sNoise(vec2(q.y * 2., 1.)));
  c *= mix(.88, 1., smoothstep(0., .02, min(j, 1. - j)));
  return c;`;
const SECTIONS: LandSection[] = [
  { custom: MOUNTAIN_ROCK, soil: 0.02, regolith: 0.05 },
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

const TALUS = new THREE.Color("#a29a88"),
  RIPARIAN = new THREE.Color("#7fa45a");

/** Land cover for each form; steep ground shows the bedrock through the surface shader. */
function cover(kind: number, x: number, z: number) {
  const h = height(kind, x, z),
    n = noise(x * 3 + kind, z * 3),
    c = new THREE.Color();
  if (kind === 0) {
    // Forest, then alpine grassland, bare rock and scree, and snow on the highest ground.
    c.copy(FOREST)
      .lerp(ALPINE, smooth(h, 0.48 + 0.1 * n, 0.66))
      .lerp(SCREE, smooth(h, 0.85, 1.1) * 0.8)
      .lerp(SNOW, smooth(h, 1.25 + 0.12 * n, 1.4));
  } else if (kind === 1) {
    c.copy(fields(x, z, 0.5)).lerp(MOOR, smooth(h, 0.3, 0.42));
    c.lerp(RIPARIAN, Math.exp(-(((z - hillStream(x)) / 0.12) ** 2)) * 0.6);
  } else if (kind === 2) {
    c.copy(fields(x, z, 0.45)).lerp(MOOR, smooth(h, 0.7, 1.15) * 0.8);
    c.lerp(PASTURE, 0.3 * n);
    // Pale talus below the cliffs, and green along the river in the canyon floor.
    if (onEscarpment(x, z)) c.lerp(TALUS, smooth(h, 0.12, 0.3) * (1 - smooth(h, 0.75, 0.9)));
    c.lerp(RIPARIAN, Math.exp(-(((x - canyonRiver(z)) / 0.08) ** 2)) * (1 - smooth(h, 0.5, 0.9)));
  } else if (kind === 3) {
    c.copy(fields(x, z, 0.42));
    if (Math.abs(z - plainRiver(x)) < 0.16) c.lerp(RIPARIAN, 0.7);
  } else {
    // Fields and the town on the basin floor; woods on its walls; rough grazing on the hills.
    c.copy(fields(x, z, 0.4)).lerp(PASTURE, smooth(h, 0.18, 0.3));
    c.lerp(WOOD, smooth(h, 0.28, 0.45) * (1 - smooth(h, 0.62, 0.72)) * (0.5 + 0.5 * n));
    c.lerp(MOOR, smooth(h, 0.62, 0.78) * 0.7);
  }
  return c.getStyle();
}

/** Where each form's river runs, as points across its sample (none on the mountain). */
function riverPath(kind: number): [number, number][] {
  const n = 90;
  if (kind === 1)
    return Array.from({ length: n }, (_, i) => [-2 + (4 * i) / (n - 1), 0]).map(([x]) => [
      x,
      hillStream(x),
    ]);
  if (kind === 2)
    // Down the canyon and out across the lowland, in the groove it has cut through the talus.
    return Array.from({ length: n }, (_, i) => {
      const z = -2 + (4 * i) / (n - 1);
      return [canyonRiver(z), z];
    });
  if (kind === 3)
    return Array.from({ length: n }, (_, i) => [-2 + (4 * i) / (n - 1), 0]).map(([x]) => [
      x,
      plainRiver(x),
    ]);
  if (kind === 4) {
    // From the far side of the basin floor, past the town and out through the gap in the rim.
    const ca = Math.cos(BASIN_OUTLET),
      sa = Math.sin(BASIN_OUTLET);
    return Array.from({ length: n }, (_, i) => {
      const s = -0.75 + (3.1 * i) / (n - 1),
        wobble = 0.07 * Math.sin(s * 3.5);
      return [BASIN_CENTER[0] + s * ca - wobble * sa, BASIN_CENTER[1] + s * sa + wobble * ca];
    }).filter(([x, z]) => Math.abs(x) < 2 && Math.abs(z) < 2) as [number, number][];
  }
  return [];
}

function Tile({ kind, x, vertical }: { kind: number; x: number; vertical: number }) {
  const tr = useT();
  const surface = useMemo(
    () => (px: number, pz: number) => height(kind, px, pz) * vertical,
    [kind, vertical],
  );
  const color = useMemo(() => (px: number, _y: number, pz: number) => cover(kind, px, pz), [kind]);
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 70 && i < 900; i++) {
      const px = -1.88 + random(i + kind * 89) * 3.76,
        pz = -1.88 + random(i + 129 + kind * 7) * 3.76,
        h = height(kind, px, pz),
        n = noise(px * 2.5 + 3, pz * 2.5);
      const ok =
        kind === 0
          ? h < 0.5 && n > 0.3
          : kind === 1
            ? n > 0.6 && Math.abs(pz - hillStream(px)) > 0.12
            : kind === 2
              ? (h < 0.3 || h > 1.1) && n > 0.55 && Math.abs(px - canyonRiver(pz)) > 0.1
              : kind === 3
                ? Math.abs(pz - plainRiver(px)) > 0.2 && n > 0.66
                : h > 0.28 && h < 0.6 && n > 0.42;
      if (ok) out.push([px, surface(px, pz) - 0.005, pz]);
    }
    return out;
  }, [kind, surface]);
  const houses = useMemo(
    () =>
      kind === 3
        ? settlement(0.7, 0.9, 9, 0.45, 0.07, 2, (px, pz) => Math.abs(pz - plainRiver(px)) > 0.25)
        : kind === 4
          ? settlement(
              BASIN_CENTER[0] - 0.3,
              BASIN_CENTER[1] + 0.25,
              14,
              0.42,
              0.07,
              5,
              (px, pz) =>
                Math.abs(
                  (px - BASIN_CENTER[0]) * Math.sin(BASIN_OUTLET) -
                    (pz - BASIN_CENTER[1]) * Math.cos(BASIN_OUTLET),
                ) > 0.14,
            )
          : kind === 2
            ? settlement(1.35, -1.2, 4, 0.3, 0.07, 8)
            : kind === 1
              ? settlement(-1.35, 0.35, 3, 0.2, 0.07, 3)
              : [],
    [kind],
  );
  const river = useMemo(
    () =>
      riverPath(kind).map(
        ([px, pz]) => [px, height(kind, px, pz) * vertical + 0.012, pz] as [number, number, number],
      ),
    [kind, vertical],
  );
  return (
    <group position={[x, 0, 0]}>
      <GeomorphicTerrain
        height={surface}
        color={color}
        width={4}
        depth={4}
        resolution={160}
        base={-0.14}
        cliff={kind === 0 ? 0.52 : kind === 2 || kind === 4 ? 0.42 : 0.68}
        mottle={0.08}
        section={SECTIONS[kind]}
      />
      {river.length > 1 && (
        <WaterRibbon path={river} width={kind === 3 ? 0.06 : 0.045} color="#4f8ea8" />
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
        text={tr(NAMES[kind])}
        note={
          kind === 0
            ? tr(
                "High relief and steep, rugged slopes: forest gives way to alpine grassland, bare rock and snow with height. No single height separates mountains from hills.",
              )
            : kind === 1
              ? tr(
                  "This hill has lower relief and gentler slopes than the mountain. Height alone does not define a landform.",
                )
              : kind === 2
                ? tr(
                    "A plateau is a broad, fairly level high surface. Its edges may be steep, exposing the rock layers beneath, and rivers may cut canyons into it. The flat-topped hill in front is a butte: a piece of the plateau left standing as its edge wore back. Plateaus form in different ways.",
                  )
                : kind === 3
                  ? tr(
                      "A plain has low local relief. Plains can lie at high or low elevation; this one is low, with fields and a meandering river.",
                    )
                  : tr(
                      "A basin is lower than the land around it. This one drains through a gap in its rim; others drain inward. The shape alone does not mean it holds a lake.",
                    )
        }
        occlude={false}
      />
    </group>
  );
}
export default function LandformTypes() {
  const tr = useT();
  const { params, trueScale } = useLabState("params", "trueScale"),
    a = Math.round(params.left ?? 0),
    b = Math.round(params.right ?? 3),
    f = trueScale ? 1 : 2;
  return (
    <>
      <ScienceStudio
        horizon
        slug="landform-types"
        camera={[3.5, 5.5, 8]}
        scale={tr(
          "Both samples: 4 × 4 km · relief ×2 · identical comparison scale · trees and buildings enlarged",
        )}
        trueScale={tr(
          "Both samples: 1 scene unit = 1 km · common horizontal and vertical scale · trees, buildings and boulders enlarged",
        )}
      >
        <Tile kind={a} x={-2.5} vertical={f} />
        <Tile kind={b} x={2.5} vertical={f} />
      </ScienceStudio>
      <ScienceReadout>
        {tr(
          "{a} and {b} at the same scale. Compare elevation, local relief, slope and the shape of the surface separately.",
          { a: tr(NAMES[a]), b: tr(NAMES[b]) },
        )}
        <span className="mt-2 grid grid-cols-2 gap-3">
          {[a, b].map((kind, i) => (
            <span key={i}>
              <strong>
                {i === 0
                  ? tr("Left: {name}", { name: tr(NAMES[kind]) })
                  : tr("Right: {name}", { name: tr(NAMES[kind]) })}
              </strong>{" "}
              <br />
              {tr("Highest point {hi} m · lowest {lo} m", {
                hi: STATS[kind].hi.toLocaleString("en-US"),
                lo: STATS[kind].lo.toLocaleString("en-US"),
              })}{" "}
              <br />
              {tr("Local relief")} <strong>{STATS[kind].relief.toLocaleString("en-US")} m</strong>{" "}
              <br />
              {tr("Typical slope {typical}° · steepest {steepest}°", {
                typical: STATS[kind].typical,
                steepest: STATS[kind].steepest,
              })}
            </span>
          ))}
        </span>{" "}
        <br />
        {tr(
          "Choose any two of the five forms. These are invented surfaces, not real places. Heights are measured from the scene's zero level, taken as sea level; local relief is highest minus lowest point in the 4 × 4 km sample. Slopes are true-scale values, whatever the relief setting. Color and texture help you read them; they do not show origin, climate or rock type.",
        )}
      </ScienceReadout>
    </>
  );
}
