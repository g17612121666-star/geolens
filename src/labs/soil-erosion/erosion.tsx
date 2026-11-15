import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { useLabFrame, useLabTick } from "@/labs/tick";
import { soilExport } from "@/lib/soil-erosion-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { GrassPatch, RootNetwork, DebrisField, WaterRibbon } from "../shared/geomorphic-terrain";
import { TerrainMaterial } from "../shared/natural-world";
import { SectionMaterial } from "../shared/section-material";
import { RainStreaks } from "../atmosphere-layers/weather-volumes";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import {
  blockX,
  blockZ,
  heightBlockGeometry,
  setBlockHeights,
  type HeightBlockSpec,
} from "../shared/height-block";
import {
  FIELD,
  PLOT,
  PLOT_GLSL,
  COMPARE_SHIFT,
  RILLS,
  TROUGH,
  fieldHeight,
  ground,
  inPlot,
  rillGrowth,
  rillShape,
} from "./plots";

/** Grid: about 1.8 cm across the slope (9 cm on the ground), fine enough to shape the rills. */
const NX = 360,
  NZ = 180;
const SPEC: HeightBlockSpec = { ...FIELD, nx: NX, nz: NZ };
const PLOTS = [PLOT.bare, PLOT.compare] as const;
const MEADOW = new THREE.Color("#7f9a55"),
  MEADOW_DARK = new THREE.Color("#6b8748"),
  CROP = new THREE.Color("#55703c"),
  CROP_DARK = new THREE.Color("#47612f"),
  CRUST = new THREE.Color("#957454"),
  MOIST = new THREE.Color("#6f5239"),
  WET = new THREE.Color("#4b3626"),
  SILT = new THREE.Color("#a08566");

/**
 * The field's surface layers, fixed for a given cover: undisturbed height, how deep a rill cuts
 * at each point per unit of rill depth, and which plot (if any) each point belongs to.
 */
function fieldLayers(covered: boolean) {
  const n = (NX + 1) * (NZ + 1),
    base = new Float32Array(n),
    shape = new Float32Array(n),
    plot = new Int8Array(n).fill(-1);
  for (let j = 0; j <= NZ; j++)
    for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i,
        x = blockX(SPEC, i),
        z = blockZ(SPEC, j);
      base[k] = fieldHeight(x, z, [0, 0], 0, covered);
      if (inPlot(x, z, PLOT.bare)) {
        plot[k] = 0;
        shape[k] = rillShape(x, z);
      } else if (inPlot(x, z, PLOT.compare)) {
        plot[k] = 1;
        shape[k] = covered ? 0 : rillShape(x, z, COMPARE_SHIFT);
      }
    }
  return { base, shape, plot };
}

/** The hillside with both plots, updated in place as the plots lower and rills deepen. */
function Field({
  lowering,
  rill,
  covered,
  wind,
}: {
  lowering: [number, number];
  rill: number;
  covered: boolean;
  wind: boolean;
}) {
  const block = useMemo(() => heightBlockGeometry(SPEC, (x, z) => ground(z)), []);
  useEffect(() => () => block.geometry.dispose(), [block]);
  const layers = useMemo(() => fieldLayers(covered), [covered]);
  useLayoutEffect(() => {
    const n = layers.base.length,
      h = new Float32Array(n),
      colors = block.geometry.attributes.color as THREE.BufferAttribute,
      c = new THREE.Color(),
      cut = wind ? 0 : rill,
      wetness = Math.min(1, cut / 0.015);
    for (let j = 0; j <= NZ; j++)
      for (let i = 0; i <= NX; i++) {
        const k = j * (NX + 1) + i,
          x = blockX(SPEC, i),
          z = blockZ(SPEC, j),
          p = layers.plot[k],
          n1 = noise(x * 3.3 + 2, z * 3.3),
          n2 = noise(x * 19, z * 19);
        h[k] = layers.base[k] - (p >= 0 ? lowering[p] + cut * layers.shape[k] : 0);
        if (p < 0) c.copy(MEADOW).lerp(MEADOW_DARK, n1 * 0.7);
        else if (p === 1 && covered) c.copy(CROP).lerp(CROP_DARK, n1 * 0.8);
        else {
          // Bare soil: a pale, rain-sealed crust over darker moist soil, with clods.
          c.copy(MOIST).lerp(CRUST, (0.45 + 0.5 * n2) * (wind ? 1 : 0.85));
          if (layers.shape[k] > 0 && cut > 0) {
            // Rill floors are wet and dark; near the foot they spill silt onto the plot.
            c.lerp(WET, Math.min(1, layers.shape[k] * 1.6) * wetness);
            c.lerp(
              SILT,
              THREE.MathUtils.smoothstep(z, 1.3, 1.8) * (1 - layers.shape[k]) * 0.6 * wetness,
            );
          }
        }
        colors.setXYZ(k, c.r, c.g, c.b);
      }
    colors.needsUpdate = true;
    setBlockHeights(block, h);
  }, [block, layers, lowering, rill, covered, wind]);
  return (
    <mesh geometry={block.geometry} castShadow receiveShadow>
      <TerrainMaterial attach="material-0" kind="soil" color="#d4d4d4" vertexColors />
      <SectionMaterial attach="material-1" glsl={PLOT_GLSL} cacheKey="soil-plots-v2" />
    </mesh>
  );
}

const METAL = <meshStandardMaterial color="#9aa1a6" metalness={0.45} roughness={0.45} />;
const SLOPE_ANGLE = Math.atan(0.12);

/** Metal sheets set into the ground along a plot's sides and upper end. */
function Borders({ plot }: { plot: { x0: number; x1: number } }) {
  const length = (PLOT.z1 - PLOT.z0) / Math.cos(SLOPE_ANGLE),
    mid = (PLOT.z0 + PLOT.z1) / 2;
  return (
    <group>
      {[plot.x0, plot.x1].map((x) => (
        <mesh
          key={x}
          position={[x, ground(mid) + 0.015, mid]}
          rotation={[SLOPE_ANGLE, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.014, 0.11, length]} />
          {METAL}
        </mesh>
      ))}
      <mesh position={[(plot.x0 + plot.x1) / 2, ground(PLOT.z0) + 0.015, PLOT.z0]} castShadow>
        <boxGeometry args={[plot.x1 - plot.x0, 0.11, 0.014]} />
        {METAL}
      </mesh>
    </group>
  );
}

/** The trough across a plot's foot: water and soil leaving the plot collect in it. */
function Trough({
  plot,
  fill,
  muddy,
}: {
  plot: { x0: number; x1: number };
  fill: number;
  muddy: boolean;
}) {
  const width = plot.x1 - plot.x0,
    depth = TROUGH.z1 - TROUGH.z0,
    rim = ground(TROUGH.z0),
    x = (plot.x0 + plot.x1) / 2,
    z = (TROUGH.z0 + TROUGH.z1) / 2;
  return (
    <group position={[x, rim - TROUGH.depth / 2, z]}>
      {(
        [
          [0, -TROUGH.depth / 2, 0, width, 0.012, depth],
          [0, 0, -depth / 2, width, TROUGH.depth, 0.012],
          [0, 0.01, depth / 2, width, TROUGH.depth + 0.02, 0.012],
          [-width / 2, 0, 0, 0.012, TROUGH.depth, depth],
          [width / 2, 0, 0, 0.012, TROUGH.depth, depth],
        ] as const
      ).map(([px, py, pz, sx, sy, sz], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow receiveShadow>
          <boxGeometry args={[sx, sy, sz]} />
          {METAL}
        </mesh>
      ))}
      {/* Soil that has settled in the trough, and the runoff standing over it. */}
      {fill > 0.002 && (
        <mesh position={[0, -TROUGH.depth / 2 + (0.07 * fill) / 2 + 0.006, 0]}>
          <boxGeometry args={[width - 0.02, 0.07 * fill, depth - 0.02]} />
          <meshStandardMaterial color="#6f5236" roughness={0.95} />
        </mesh>
      )}
      <mesh
        position={[0, -TROUGH.depth / 2 + 0.07 * fill + 0.014, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width - 0.02, depth - 0.02]} />
        <meshStandardMaterial
          color={muddy ? "#8a6b48" : "#7fa3ab"}
          transparent
          opacity={muddy ? 0.85 : 0.55}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

/** Each plot's rills (or, under cover, its sheet flow), at the start and the foot. */
function runoffPaths(plotIndex: number, rillDepth: number, lowering: number, rills: boolean) {
  const shift = plotIndex === 1 ? COMPARE_SHIFT : 0;
  if (!rills)
    return [0.45, 1.0, 1.55].map((offset) =>
      Array.from({ length: 41 }, (_, i): [number, number, number] => {
        const z = PLOT.z0 + 0.3 + ((PLOT.z1 - PLOT.z0 - 0.32) * i) / 40,
          x = PLOTS[plotIndex].x0 + offset + 0.03 * Math.sin(z * 3 + offset * 5);
        return [x, ground(z) - lowering + 0.006, z];
      }),
    );
  return RILLS.map((line) =>
    Array.from({ length: 61 }, (_, i): [number, number, number] => {
      const z = -1.45 + ((PLOT.z1 + 1.43) * i) / 60;
      return [line(z) + shift, ground(z) - lowering - rillDepth * rillGrowth(z) + 0.004, z];
    }),
  );
}

/** Drops splashing soil up from bare ground; under cover, the leaves take the impact. */
function Splashes({ lowering, covered }: { lowering: [number, number]; covered: boolean }) {
  const count = 90,
    mesh = useRef<THREE.InstancedMesh>(null),
    m = useMemo(() => new THREE.Matrix4(), []),
    drops = useMemo(
      () =>
        Array.from({ length: count }, (_, i) => {
          const plot = i % 2,
            x = PLOTS[plot].x0 + 0.08 + random(i + 3) * 1.84,
            z = PLOT.z0 + 0.1 + random(i + 17) * 3.8,
            a = random(i + 29) * Math.PI * 2;
          return { plot, x, z, dx: Math.cos(a), dz: Math.sin(a), seed: random(i + 41) };
        }),
      [],
    );
  useLabFrame((t) => {
    if (!mesh.current) return;
    drops.forEach((d, i) => {
      const phase = (t * 40 + d.seed) % 1,
        bare = d.plot === 0 || !covered,
        reach = bare ? 0.07 : 0.025,
        rise = bare ? 0.06 : 0.015,
        s = (bare ? 0.011 : 0.006) * (1 - 0.5 * phase);
      m.makeScale(s, s, s).setPosition(
        d.x + d.dx * reach * phase,
        ground(d.z) - lowering[d.plot] + 0.008 + 4 * rise * phase * (1 - phase),
        d.z + d.dz * reach * phase,
      );
      mesh.current!.setMatrixAt(i, m);
      mesh.current!.setColorAt(i, bare ? BARE_SPLASH : LEAF_SPLASH);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}
const BARE_SPLASH = new THREE.Color("#8c6a48"),
  LEAF_SPLASH = new THREE.Color("#cfe3e6");

/** Dry wind lifting and carrying soil off bare ground; little leaves covered ground. */
function Dust({ lowering, covered }: { lowering: [number, number]; covered: boolean }) {
  const count = 70,
    mesh = useRef<THREE.InstancedMesh>(null),
    m = useMemo(() => new THREE.Matrix4(), []);
  useLabFrame((t) => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      const plot = i % 2,
        bare = plot === 0 || !covered,
        phase = (t * 3 + random(i + 7)) % 1,
        z = PLOT.z0 + 0.2 + random(i + 13) * 3.6,
        x = PLOTS[plot].x0 + random(i + 19) * 2 + phase * 1.6,
        rise = 0.08 + phase * (0.25 + 0.6 * random(i + 23)),
        s = (0.035 + 0.08 * phase) * (bare ? 1 : 0.35);
      m.makeScale(s, s * 0.8, s).setPosition(x, ground(z) - lowering[plot] + rise, z);
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color="#c9a771" transparent opacity={0.26} depthWrite={false} />
    </instancedMesh>
  );
}

/** Grass on the covered plot and in the meadow around the plots. */
const CROP_TUFTS = Array.from({ length: 900 }, (_, i): [number, number, number] => {
  const x = PLOT.compare.x0 + 0.04 + random(i + 72) * 1.92,
    z = PLOT.z0 + 0.04 + random(i + 429) * 3.92;
  return [x, ground(z) - 0.002, z];
});
const MEADOW_TUFTS = Array.from({ length: 700 }, (_, i): [number, number, number] => {
  const x = FIELD.x0 + random(i + 901) * (FIELD.x1 - FIELD.x0),
    z = FIELD.z0 + random(i + 977) * (FIELD.z1 - FIELD.z0);
  return [x, fieldHeight(x, z, [0, 0], 0, true) - 0.002, z];
}).filter(
  ([x, , z]) =>
    !inPlot(x, z, { x0: PLOT.bare.x0 - 0.05, x1: PLOT.bare.x1 + 0.05 }) &&
    !inPlot(x, z, { x0: PLOT.compare.x0 - 0.05, x1: PLOT.compare.x1 + 0.05 }) &&
    !(z > TROUGH.z0 - 0.05 && z < TROUGH.z1 + 0.05),
);

function plotNote(r: ReturnType<typeof soilExport>, wind: boolean) {
  return `Model soil budget: ${r.remaining.toFixed(1)} kg in place, ${r.moving.toFixed(1)} kg in transport and ${r.exported.toFixed(1)} kg exported, always totaling 6000 kg. Cover multiplies detachment by 0.15, a chosen value, not a measured reduction. ${wind ? "Wind carries exported soil off through the air, so the trough stays empty" : "Exported soil collects in the trough at the plot's foot"}; the dark topsoil in the cut face thins as the surface lowers.`;
}

export default function SoilErosion() {
  const { params, trueScale } = useLabState("params", "trueScale");
  useLabTick(1 / 55);
  // The ground is rebuilt in steps; the readout follows lab time continuously.
  const step = useLabControls((s) => Math.round(s.t * 120) / 120);
  const covered = params.veg > 0.5,
    wind = params.wind > 0.5;
  const { budgets, lowering, rill } = useMemo(() => {
    const budgets = [soilExport(step * 60, false, wind), soilExport(step * 60, covered, wind)];
    return {
      budgets,
      lowering: budgets.map((r) => (r.meanLossMm / 1000 / 5) * (trueScale ? 1 : 30)) as [
        number,
        number,
      ],
      // Rill depth is schematic: it grows with the share of the bare plot's soil detached.
      rill: wind ? 0 : Math.min(0.07, 0.004 + 0.3 * (budgets[0].detached / budgets[0].initial)),
    };
  }, [step, covered, wind, trueScale]);
  const flowing = !wind && step > 0.01;
  const paths = useMemo(
    () =>
      PLOTS.map((_, p) => {
        const rills = p === 0 || !covered;
        return runoffPaths(p, rills ? rill : 0, lowering[p], rills);
      }),
    [covered, rill, lowering],
  );
  const pebbles = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i): [number, number, number] => {
        const p = covered ? 0 : i % 2,
          x = PLOTS[p].x0 + 0.06 + random(i + 931) * 1.88,
          z = PLOT.z0 + 0.06 + random(i + 818) * 3.88;
        return [x, ground(z) - lowering[p] + 0.006, z];
      }),
    [covered, lowering],
  );
  const top = ground(PLOT.z0);
  return (
    <>
      <ScienceStudio
        horizon
        slug="soil-erosion"
        camera={[-4.8, 4.6, 7.2]}
        scale="Two 20 × 10 m runoff plots on one 12% slope · surface lowering exaggerated ×30 · rill depths schematic · raindrops and grains enlarged"
        trueScale="1 scene unit = 5 m · true mean surface lowering · rill depths schematic · raindrops and grains still enlarged"
      >
        <Field lowering={lowering} rill={rill} covered={covered} wind={wind} />
        {PLOTS.map((plot, p) => (
          <Fragment key={p}>
            <Borders plot={plot} />
            <Trough
              plot={plot}
              fill={wind ? 0 : Math.min(1, (budgets[p].exported / 6000) * 4)}
              muddy={!wind && (p === 0 || !covered) && step > 0.01}
            />
            {flowing &&
              paths[p].map((path, i) => (
                <WaterRibbon
                  key={i}
                  path={path}
                  width={p === 0 || !covered ? 0.02 : 0.012}
                  opacity={p === 0 || !covered ? 0.62 : 0.4}
                  color={p === 0 || !covered ? "#7a6247" : "#9fbfc4"}
                />
              ))}
          </Fragment>
        ))}
        {covered && (
          <>
            <GrassPatch positions={CROP_TUFTS} height={0.12} color="#55703c" />
            {[-1.6, -0.6, 0.4, 1.4].map((z, i) => (
              <group
                key={i}
                position={[PLOT.compare.x1 + 0.004, ground(z) - lowering[1], z]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <RootNetwork depth={0.2} spread={0.12} seed={i} />
              </group>
            ))}
          </>
        )}
        <GrassPatch positions={MEADOW_TUFTS} height={0.07} color="#6f8a4c" />
        <DebrisField points={pebbles} size={0.014} color="#a39276" />
        {/* A rain gauge between the plots measures what falls on them. */}
        <group position={[0, ground(-0.6), -0.6]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
            <meshStandardMaterial color="#7d6a52" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.27, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.034, 0.08, 20]} />
            {METAL}
          </mesh>
        </group>
        {!wind ? (
          <>
            <RainStreaks
              position={[0, top + 1.2, 0]}
              width={FIELD.x1 - FIELD.x0}
              depth={FIELD.z1 - FIELD.z0}
              height={1.4}
              count={420}
              wind={0.05}
            />
            <Splashes lowering={lowering} covered={covered} />
          </>
        ) : (
          <Dust lowering={lowering} covered={covered} />
        )}
        <Tag
          pos={[(PLOT.bare.x0 + PLOT.bare.x1) / 2, top + 0.5, PLOT.z0 + 0.2]}
          text="Bare plot"
          note={plotNote(budgets[0], wind)}
          occlude={false}
        />
        <Tag
          pos={[(PLOT.compare.x0 + PLOT.compare.x1) / 2, top + 0.5, PLOT.z0 + 0.2]}
          text={covered ? "Covered plot" : "Bare plot"}
          note={plotNote(budgets[1], wind)}
          occlude={false}
        />
        {rill > 0.012 && (
          <Tag
            pos={[PLOT.bare.x0 - 0.15, ground(0.4) + 0.45, 0.4]}
            text="Rills · soil in transport"
            note="Runoff gathers into small channels that cut down as they carry the loosened soil. Muddy water is soil in transport; rill depths here are schematic, not calculated."
            occlude={false}
          />
        )}
        {!wind && (
          <Tag
            pos={[PLOT.bare.x0 - 0.1, ground(TROUGH.z1) + 0.2, TROUGH.z1 + 0.25]}
            text="Trough · exported soil"
            note="Soil that has left the plot settles in the trough at its foot, so the exported store can be weighed. The fill here grows with the model's exported soil."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <SoilReadout covered={covered} wind={wind} />
    </>
  );
}

/** Live numbers for both plots, following lab time continuously. */
function SoilReadout({ covered, wind }: { covered: boolean; wind: boolean }) {
  const { t } = useLabState("t"),
    a = soilExport(t * 60, false, wind),
    b = soilExport(t * 60, covered, wind);
  return (
    <ScienceReadout>
      <p>
        {"Model minute "}
        {(t * 60).toFixed(1)}
      </p>
      <dl className="mt-1 grid w-fit grid-cols-[auto_auto_auto_auto_auto] gap-x-5 gap-y-0.5 text-left tabular-nums">
        <dt />
        <dd className="text-mist">{"Still in place"}</dd>
        <dd className="text-mist">{"In transport"}</dd>
        <dd className="text-mist">{"Carried off (exported)"}</dd>
        <dd className="text-mist">{"Ground lowered (average)"}</dd>
        {[
          { name: "Bare plot (left)", r: a },
          { name: covered ? "Covered plot (right)" : "Bare plot (right)", r: b },
        ].map(({ name, r }) => (
          <Fragment key={name}>
            <dt className="text-mist">{name}</dt>
            <dd>{r.remaining.toFixed(0)} kg</dd>
            <dd>{r.moving.toFixed(0)} kg</dd>
            <dd>{r.exported.toFixed(0)} kg</dd>
            <dd>{r.meanLossMm.toFixed(2)} mm</dd>
          </Fragment>
        ))}
      </dl>
      <p className="mt-2">
        {
          "Each plot starts with 6000 kg of loose surface soil; the three stores always add up to 6000 kg. Ground lowering counts all soil loosened so far, including soil still in transport. "
        }
        {wind
          ? "Dry wind-transport example."
          : "Rain splash and runoff example; muddy water runs in rills down the bare plot and settles in its trough, and the rill depths are schematic, not calculated."}{" "}
        {"Model values for comparison only, not predictions for a real field."}
      </p>
    </ScienceReadout>
  );
}
