import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { useLabFrame, useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { landscapeNoise as noise } from "../shared/landscape-noise";
import { Tag } from "../shared/kit";
import { PlantStand } from "../shared/natural-world";
import { IceMaterial } from "./ice-material";
import { GNEISS, MEADOW, OUTWASH, POLISHED, ROCK, SNOW, TILL, shape } from "./ground";
import {
  ELA_SHARE,
  HANGING,
  ICE_HEAD,
  MORAINE_X,
  floorHeight,
  glacierIceGeometry,
  iceLength,
  iceMargins,
  iceSurface,
  land,
  moraineHeight,
  streamZ,
} from "./geometry";
import { Cirques } from "./cirques";
import RealYosemite from "./real-yosemite";
import { useT } from "@/lib/i18n";

const smooth = THREE.MathUtils.smoothstep;
/** The glacier at its largest recent extent, which left the terminal moraine and the trimline. */
const LONGEST = iceLength(1);
/** Snow lies year-round on gentle ground above about this height (km). */
const SNOWLINE = 1.68;

/**
 * Ground colors: fresh, pale rock below the trimline that the ice reached at its largest, older
 * weathered rock above it, meadow on gentle low ground, barren till and outwash on the valley
 * floor the ice has left, and patchy snow on gentle high ground. Hollows and gullies are shaded
 * darker than ribs and crests.
 */
function groundColor(x: number, y: number, z: number) {
  const n = noise(x * 3 + 1, z * 3),
    { gradient, curvature } = shape(land, x, z),
    steep = smooth(gradient, 0.55, 1.25),
    trim = iceSurface(x, z, LONGEST) + 0.05 + 0.03 * (n - 0.5),
    below = 1 - smooth(y, trim - 0.03, trim + 0.03),
    c = ROCK.clone().lerp(POLISHED, below);
  // Alpine meadows on the gentle shoulders above the trough and on low ground.
  c.lerp(MEADOW, (1 - steep) * (1 - smooth(y, 1.35, 1.55 + 0.1 * n)) * (1 - 0.85 * below) * 0.9);
  const floor = 1 - smooth(y - floorHeight(x), 0.04, 0.12),
    inside = 1 - smooth(x, MORAINE_X, MORAINE_X + 0.15);
  c.lerp(TILL, floor * inside * 0.9);
  c.lerp(
    OUTWASH,
    floor * (1 - smooth(Math.abs(z - streamZ(x)), 0.08, 0.32)) * smooth(x, -0.6, 0.2) * 0.8,
  );
  if (moraineHeight(x, z) > 0.012) c.lerp(TILL, 0.75);
  // Snow lasts on gentle high ground and in the hollows and gullies where drifts collect.
  const lodged =
    Math.max(1 - steep, smooth(curvature, 0.5, 3)) * smooth(noise(x * 4 + 4, z * 4), 0.3, 0.55);
  c.lerp(SNOW, smooth(y, SNOWLINE + 0.12 * n, SNOWLINE + 0.2 + 0.12 * n) * lodged);
  c.multiplyScalar(1 - 0.28 * smooth(curvature, 0.5, 4) + 0.1 * smooth(-curvature, 0.5, 4));
  return c.getStyle();
}

function Ice({ length }: { length: number }) {
  const geometry = useMemo(() => glacierIceGeometry(length), [length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <IceMaterial ela={ELA_SHARE} kind="valley" />
    </mesh>
  );
}

/** Markers carried down-glacier by the ice, moved every frame from lab time. */
function FlowMarkers({ length }: { length: number }) {
  const COUNT = 24,
    mesh = useRef<THREE.InstancedMesh>(null),
    m = useMemo(() => new THREE.Matrix4(), []);
  useLabFrame((t) => {
    if (!mesh.current) return;
    for (let i = 0; i < COUNT; i++) {
      const s = (t * 0.6 + i / COUNT) % 1,
        x = ICE_HEAD + 0.25 + s * (length - 0.4),
        // Lanes on both sides of the medial moraine, one for each cirque glacier.
        z = (i % 2 ? 1 : -1) * (0.18 + 0.24 * ((i * 0.618) % 1)),
        y = Math.max(iceSurface(x, z, length), land(x, z));
      m.makeTranslation(x, y + 0.02, z);
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.024, 10, 8]} />
      <meshBasicMaterial color="#c0602a" />
    </instancedMesh>
  );
}

const onGround = (x: number, z: number, lift = 0.012): [number, number, number] => [
  x,
  land(x, z) + lift,
  z,
];

export default function Glaciers() {
  const view = useLabControls((s) => s.params.view ?? 0);
  return view > 1.5 ? <RealYosemite /> : <ModelGlaciers />;
}

function ModelGlaciers() {
  const tr = useT();
  const { params, trueScale } = useLabState("params", "trueScale");
  useLabTick(1 / 50);
  const extent = params.extent ?? 0.5,
    length = iceLength(extent),
    snout = ICE_HEAD + length,
    vertical = trueScale ? 1 : 1.5,
    showIce = params.ice > 0.5,
    cirques = params.view > 0.5;
  const elaX = ICE_HEAD + ELA_SHARE * length;
  const elaLine = useMemo(() => {
    const [lo, hi] = iceMargins(elaX, length);
    return Array.from({ length: 33 }, (_, j) => {
      const z = lo + ((hi - lo) * j) / 32;
      return [elaX, iceSurface(elaX, z, length) + 0.012, z] as [number, number, number];
    });
  }, [elaX, length]);
  // Meltwater leaves the snout, braids across the outwash plain and cuts through the moraines.
  const streams = useMemo(() => {
    const start = showIce ? snout + 0.03 : ICE_HEAD + 0.4,
      main = Array.from({ length: 90 }, (_, i) => {
        const x = start + ((2.98 - start) * i) / 89;
        return onGround(x, streamZ(x));
      }),
      a = Math.max(start + 0.05, -0.3),
      b = MORAINE_X - 0.12,
      braid =
        b - a > 0.4
          ? Array.from({ length: 40 }, (_, i) => {
              const x = a + ((b - a) * i) / 39;
              return onGround(x, streamZ(x) + 0.13 * Math.sin((Math.PI * i) / 39));
            })
          : null;
    return { main, braid };
  }, [snout, showIce]);
  // The tributary stream crosses its hanging valley and falls over the lip into the trough.
  const waterfall = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => {
        const z = -1.9 + (1.32 * i) / 49,
          x = HANGING.x + 0.03 * Math.sin(z * 6);
        return onGround(x, z, 0.014);
      }),
    [],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 90 && i < 4000; i++) {
      const r = (k: number) => {
          const s = Math.sin(k * 71.37 + 23) * 43758.54;
          return s - Math.floor(s);
        },
        x = 0.9 + r(i + 1) * 2.05,
        z = (r(i + 400) - 0.5) * 3.6,
        y = land(x, z),
        trim = iceSurface(x, z, LONGEST) + 0.05;
      // Forest grows on gentle ground below the treeline, outside the ground the ice has left.
      if (y < 1.05 && shape(land, x, z).gradient < 0.6 && (y > trim || x > MORAINE_X + 0.1))
        out.push([x, y * vertical, z]);
    }
    return out;
  }, [vertical]);
  const head = useMemo(() => {
    const at = (x: number) => [x, iceSurface(x, 0.45, length) + 0.32, 0.45] as const;
    return {
      from: [...at(-2.35)] as [number, number, number],
      to: [...at(-1.45)] as [number, number, number],
    };
  }, [length]);
  return (
    <>
      <ScienceStudio
        horizon
        slug="glaciers"
        camera={[5.6, 7, 3.2]}
        scale={
          cirques
            ? tr("6 × 6 km cirque block · relief ×1.5 · ice flows away from the headwalls")
            : tr("6 × 4 km valley · relief ×1.5 · ice always flows down-valley")
        }
        trueScale={tr(
          "1 scene unit = 1 km · equal geometric scales · debris, cracks and vegetation enlarged",
        )}
      >
        <group scale={[1, vertical, 1]}>
          {cirques ? (
            <Cirques ice={showIce} />
          ) : (
            <>
              <GeomorphicTerrain
                height={land}
                color={groundColor}
                resolution={220}
                base={-0.15}
                cliff={0.55}
                mottle={0.09}
                section={{ custom: GNEISS, soil: 0.015, regolith: 0.06, soilTone: "thin" }}
              />
              {showIce && <Ice length={length} />}
              {showIce && <FlowMarkers length={length} />}
              <WaterRibbon path={streams.main} width={0.035} color="#7fb3bd" />
              {streams.braid && <WaterRibbon path={streams.braid} width={0.022} color="#7fb3bd" />}
              <WaterRibbon path={waterfall} width={0.03} color="#8cc0c9" />
              <DebrisField
                points={Array.from({ length: 70 }, (_, i) => {
                  const z = (((i * 0.618) % 1) - 0.5) * 1.5,
                    x = MORAINE_X - 0.38 * (z / 0.9) ** 2 + 0.06 * Math.sin(i * 5);
                  return onGround(x, z, 0.012);
                })}
                size={0.032}
                color="#948c7e"
              />
              {showIce && (
                <>
                  <Arrow from={head.from} to={head.to} color="#e1bc84" width={2.5} />
                  <Line
                    points={elaLine}
                    color="#1d5a8c"
                    lineWidth={2.5}
                    dashed
                    dashSize={0.06}
                    gapSize={0.04}
                  />
                  <Tag
                    pos={[elaX, iceSurface(elaX, 0.5, length) + 0.25, 0.75]}
                    text={tr("Equilibrium line")}
                    note={tr(
                      "Above this line more snow falls each year than melts, so snow builds up and turns to ice (the accumulation zone); below it, melting removes more than falls (the ablation zone). The balance between the two decides whether the snout advances or retreats.",
                    )}
                    occlude={false}
                  />
                  <Tag
                    pos={[snout - 0.1, floorHeight(snout) + 0.18, 0.55]}
                    text={tr("Snout")}
                    note={tr(
                      "The lower end of the glacier, also called the terminus. Ice keeps arriving here from up-valley; the snout retreats when melting removes ice faster than it arrives. Meltwater streams out from under it.",
                    )}
                    occlude={false}
                  />
                  <Tag
                    pos={[
                      Math.min(snout - 0.5, 0.9),
                      iceSurface(Math.min(snout - 0.5, 0.9), 0, length) + 0.06,
                      0,
                    ]}
                    text={tr("Medial moraine")}
                    priority={-1}
                    note={tr(
                      "Where two glaciers meet, the rock debris along their touching edges joins into one dark stripe down the middle of the ice. Here the two cirque glaciers at the head merge below the ridge between them.",
                    )}
                    occlude={false}
                  />
                </>
              )}
              <Tag
                pos={[-2.55, 1.75, -0.5]}
                text={tr("Accumulation")}
                note={tr(
                  "Snow that survives from year to year compacts into firn and then glacier ice, which flows down-valley from these two cirque basins.",
                )}
                occlude={false}
              />
              <Tag
                pos={[0.2, 1.55, 1.25]}
                text={tr("U-shaped trough")}
                note={tr(
                  "Abrasion and plucking by debris-laden ice widen and deepen the valley, leaving a flat floor and steep walls. The paler rock below the trimline was scraped bare by the ice at its largest. Switch off Ice to see the bed.",
                )}
                occlude={false}
              />
              <Tag
                pos={[HANGING.x, land(HANGING.x, -1.45) + 0.12, -1.45]}
                text={tr("Hanging valley")}
                note={tr(
                  "A smaller glacier cut this side valley less deeply than the main glacier cut the trough, so when the ice melted its floor was left hanging high above the trough floor. Its stream now falls over the lip as a waterfall.",
                )}
                occlude={false}
              />
              <Tag
                pos={[MORAINE_X + 0.12, 0.42, -0.85]}
                text={tr("Terminal moraine")}
                note={tr(
                  "A ridge of unsorted debris piled up at the snout when the glacier was at its longest. The smaller ridge up-valley is a recessional moraine, where the snout paused as it retreated. Even while a glacier retreats, its ice still flows down-valley.",
                )}
                occlude={false}
              />
            </>
          )}
        </group>
        {!cirques && <PlantStand kind="conifer" scale={0.055} seed={3} positions={trees} />}
      </ScienceStudio>
      <ScienceReadout>
        {cirques ? (
          <>
            {tr(
              "Three neighboring cirques leave arêtes between them and a horn in the center. Switch off Ice to see the bare rock and the tarns in the cirque floors.",
            )}{" "}
            <br />
            {tr(
              "Relief is exaggerated ×1.5; Physical scale removes this. Ice and flow tracers are schematic, and Ice extent applies only to Valley glacier.",
            )}
          </>
        ) : (
          <>
            {tr("Glacier length {length} km. Play always moves ice down-valley.", {
              length: length.toFixed(2),
            })}{" "}
            <br />
            {tr(
              "Ice extent compares margin positions; it does not reverse the flow or model mass balance. Switch off Ice to see the trough and debris.",
            )}
          </>
        )}
      </ScienceReadout>
    </>
  );
}
