import { useDeferredValue, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import RealVolcanoes from "./real-volcanoes";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { RockMaterial } from "../shared/rock-material";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { fbm } from "../shared/hazard-utils";
import { useQuality } from "../shared/perf";
import { useIsCompact } from "@/hooks/use-media";
import { meanSlope } from "./geometry";
import {
  BASE,
  CHAMBER,
  FISSURE_HALF,
  SX,
  SZ,
  TRUE_RELIEF,
  makeLandscape,
  meshSurface,
  STYLE,
  wedgeFaces,
  type Face,
  paintLandscape,
  traceFlow,
} from "./landscape";
import { SectionFaces } from "./section";
import {
  EruptionColumn,
  LavaDome,
  LavaFlow,
  LavaFountain,
  LavaLake,
  PyroclasticFlows,
} from "./eruption";

type V3 = [number, number, number];
const smooth = THREE.MathUtils.smoothstep;
/** Azimuths (radians from +z toward +x) kept clear of the cutaway wedge. */
const FLOW_AZIMUTHS = [1.8, -2.5];
const PDC_AZIMUTHS = [-1.9, 1.95, 2.85];

export default function Volcanoes() {
  const real = useLabControls((s) => (s.params.real ?? 0) > 0.5);
  return real ? <RealVolcanoes /> : <ModelVolcanoes />;
}

function LocalClipping() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const previous = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => {
      gl.localClippingEnabled = previous;
    };
  }, [gl]);
  return null;
}

function ModelVolcanoes() {
  const { params, slice, t, trueScale } = useLabControls();
  useLabTick(1 / 9);
  const q = useQuality(),
    compact = useIsCompact();
  const v = params.visc ?? 0.25,
    gas = params.gas ?? 0.45,
    fissure = params.fissure > 0.5,
    k = trueScale ? TRUE_RELIEF : 1,
    time = t * 9;
  // Rebuilding the terrain takes a few frames; while a slider is dragged it may lag behind.
  const shapeV = useDeferredValue(v);
  const L = useMemo(() => makeLandscape(shapeV, fissure, k), [shapeV, fissure, k]);
  const { e } = L,
    composite = v >= 0.5;

  // Gas drives fragmentation; sticky magma traps gas, so less of it is needed to explode.
  const energetic = gas * (0.5 + 0.5 * v),
    style =
      energetic > 0.48
        ? STYLE.explosive
        : composite
          ? STYLE.dome
          : gas > 0.25
            ? STYLE.fountain
            : STYLE.effusive,
    power = smooth(energetic, 0.48, 1),
    collapse = style === STYLE.explosive && composite && energetic > 0.58 && !fissure;

  // Cutaway: a wedge opening toward the viewer for a central vent; for a fissure, a straight
  // cut across the crack, so the dike shows in section.
  const sliced = slice > 0.001,
    opening = (slice * Math.PI) / 2,
    cut = SZ / 2 - slice * (SZ / 2 + 0.9);
  const clip = useMemo(() => [new THREE.Plane(), new THREE.Plane()], []);
  if (!sliced) clip.forEach((p) => p.set(new THREE.Vector3(0, 1, 0), 1000));
  else if (fissure) clip.forEach((p) => p.set(new THREE.Vector3(0, 0, -1), cut));
  else {
    clip[0].set(new THREE.Vector3(Math.cos(opening), 0, -Math.sin(opening)), 0);
    clip[1].set(new THREE.Vector3(-Math.cos(opening), 0, -Math.sin(opening)), 0);
  }
  const removed = (x: number, z: number, margin = 0.04) =>
    sliced &&
    (fissure ? z > cut - margin : Math.abs(x) * Math.cos(opening) < z * Math.sin(opening) + margin);
  const faces: Face[] = !sliced
    ? []
    : fissure
      ? [{ origin: [-SX / 2, cut], dir: [1, 0], length: SX }]
      : wedgeFaces(opening);
  const chamberTop = CHAMBER.y + CHAMBER.b,
    fragmentation = L.vent - (L.vent - chamberTop) * (0.22 + 0.4 * power);

  const grid = Math.min(200, q.terrain);
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(L.h, SX, SZ, grid, BASE);
    paintLandscape(g, L, grid);
    return g;
  }, [L, grid]);
  const drape = useMemo(() => meshSurface(geometry, grid), [geometry, grid]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Active lava flows: long, fast and hot for runny lava; short and crusty for sticky lava.
  const flows = useMemo(() => {
    if (fissure)
      return [
        [-1, -0.75],
        [1, -0.1],
        [-1, 0.75],
        [1, 1.25],
        [1, -1.4],
      ].map(([side, z0], i) => ({
        points: traceFlow(L.h, [side * 0.1, z0], 1.75 - 0.9 * v, 60 + i, [side, 0]),
        width: 0.09 + 0.05 * v,
      }));
    return FLOW_AZIMUTHS.map((a, i) => {
      const r0 = e.craterRadius * 1.02;
      return {
        points: traceFlow(
          L.h,
          [Math.sin(a) * r0, Math.cos(a) * r0],
          e.radius * (1.05 - 0.55 * v),
          40 + i,
          [Math.sin(a), Math.cos(a)],
        ),
        width: 0.08 + 0.08 * v,
      };
    });
  }, [L, e, v, fissure]);
  const showFlows = fissure
    ? style !== STYLE.explosive
    : style === STYLE.effusive || style === STYLE.fountain;

  const pdcPaths = useMemo(
    () =>
      PDC_AZIMUTHS.map((a, i) => {
        const r0 = e.craterRadius * 1.1;
        return traceFlow(L.h, [Math.sin(a) * r0, Math.cos(a) * r0], e.radius * 1.45, 80 + i, [
          Math.sin(a),
          Math.cos(a),
        ]);
      }),
    [L, e],
  );

  const trees = useMemo(() => {
    const out: V3[] = [];
    const nearFlow = (x: number, z: number) =>
      showFlows &&
      flows.some((f) => f.points.some(([px, pz]) => Math.hypot(x - px, z - pz) < f.width * 1.6));
    for (let i = 0; out.length < 170 && i < 2600; i++) {
      const x = -SX / 2 + 0.12 + (SX - 0.24) * ((i * 0.618034) % 1),
        z = -SZ / 2 + 0.12 + (SZ - 0.24) * ((i * 0.7548777) % 1),
        n = fbm(x * 2.2 + 1, z * 2.2),
        u = Math.hypot(x, z) / e.radius,
        y = L.h(x, z);
      if (L.lavaAge(x, z) > 0.45 || removed(x, z, 0.08)) continue;
      const ok = fissure
        ? Math.abs(x) > 1.05 && n > 0.5
        : n > 0.47 &&
          (u > 1.02 || (composite ? y / L.rim < 0.36 && u > 0.42 : u > 0.62 && n > 0.52));
      if (ok && !nearFlow(x, z)) out.push([x, y - 0.01, z]);
    }
    return out;
    // `removed` depends only on the cut values listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, e, composite, fissure, sliced, opening, cut, flows, showFlows]);

  // Eruption geometry (teaching sizes, not to scale).
  const fountainHeight = fissure ? 0.14 + 0.32 * gas : 0.25 + 0.7 * gas,
    columnHeight = 0.8 + 0.75 * power,
    domeRadius = e.craterRadius * (0.62 + 0.5 * t);
  const fissureOrigins = useMemo(
    () =>
      Array.from({ length: 420 }, (_, i): V3 => {
        const z = -FISSURE_HALF + 0.1 + ((i * 0.618034) % 1) * (FISSURE_HALF * 2 - 0.2);
        return [0, L.ground(0, z) - 0.01, z];
      }),
    [L],
  );
  const ventOrigins = useMemo(() => Array.from({ length: 320 }, (): V3 => [0, L.vent, 0]), [L]);
  const glow =
    style === STYLE.fountain
      ? 2.4
      : style === STYLE.effusive
        ? 1.4
        : style === STYLE.dome
          ? 0.7
          : 1.2;

  // Labels.
  const leftFace = (s: number, y: number): V3 =>
    fissure ? [-s, y, cut] : [-Math.sin(opening) * s, y, Math.cos(opening) * s];
  const rightFace = (s: number, y: number): V3 =>
    fissure ? [s, y, cut] : [Math.sin(opening) * s, y, Math.cos(opening) * s];
  const typeName = e.form > 0.5 ? "Composite cone" : "Shield volcano";
  // With pyroclastic flows labeled on the left flank, the volcano's name moves to the right.
  const typeAt = (collapse ? 1 : -1) * e.radius * 0.62,
    pdcMid = pdcPaths[0][Math.floor(pdcPaths[0].length * 0.72)];
  const styleTag: { pos: V3; text: string; note: string } | null = fissure
    ? null
    : style === STYLE.effusive
      ? {
          pos: [0.32, L.rim + 0.22, -0.2] as V3,
          text: "Lava lake",
          note: "Runny basalt with little gas pours out quietly. Molten lava fills a pit in the summit caldera, its dark crust splitting to show the glow beneath, and overflows as lava flows.",
        }
      : style === STYLE.fountain
        ? {
            pos: [0.28, L.vent + fountainHeight * 0.95, 0] as V3,
            text: "Lava fountain",
            note: "In runny basalt, gas bubbles grow and escape easily. Near the vent they burst out together and throw molten spatter upward; fountains at Kīlauea have reached hundreds of meters.",
          }
        : style === STYLE.dome
          ? {
              pos: [0.3, L.vent + domeRadius * 0.7 + 0.16, 0] as V3,
              text: "Lava dome",
              note: "Sticky magma that has lost most of its gas on the way up oozes out slowly and piles up over the vent. A growing dome can collapse and send out pyroclastic flows.",
            }
          : {
              pos: [0.62, L.rim + columnHeight * 0.45, 0] as V3,
              text: "Eruption column",
              note: "Expanding gas shatters the magma into ash and pumice, which rise in a hot jet until the mixture spreads out as an umbrella cloud. Real columns rise 10–40 km, far higher than drawn here.",
            };

  const scale = fissure
    ? "Idealized fissure eruption · relative geometry · fountains, dike width and trees not to scale"
    : "Idealized forms · heights exaggerated about 2.5× · conduit, magma chamber and eruptions not to scale";
  const trueScaleText = fissure
    ? "Teaching view unchanged: the fissure plain is already low relief · fountains and trees not to scale"
    : "Slopes reduced to about real proportions (shields about 4–8°, composite cones about 13–25° on average) · magma chamber, eruptions and trees still schematic";

  type Label = { pos: V3; text: string; note: string; tone?: "magma" };
  const labels: Label[] = [
    fissure
      ? {
          pos: [-0.9, 0.5, -1.4],
          text: "Fissure vents",
          note: "A long crack can erupt basalt as a ‘curtain of fire’, building low spatter ramparts and small cones along its length. A fissure is a vent shape, not a type of magma.",
        }
      : {
          pos: [typeAt, L.h(typeAt, -0.45) + 0.24, -0.45],
          text: typeName,
          note: `A volcano’s shape builds up over many eruptions. ${
            e.form > 0.5
              ? "A composite cone (stratovolcano) is built from alternating layers of explosive ash and pumice and thick, sticky lava flows, so it grows steep and tall; the cutaway shows these layers."
              : "A shield is built from thousands of thin, runny basalt flows that spread far before they set, so it grows broad and gentle; in the cutaway, red rubbly flow tops separate the layers."
          } Viscosity, eruption rate, gas and erosion all play a part; this is a comparison, not a prediction. Dark tongues are older lava flows; snow and forest are illustrative.`,
        },
  ];
  if (styleTag) labels.push(styleTag);
  if (collapse && pdcMid)
    labels.push({
      pos: [pdcMid[0], L.h(pdcMid[0], pdcMid[1]) + 0.36, pdcMid[1]],
      text: "Pyroclastic flow",
      tone: "magma",
      note: "When part of the column collapses, hot ash, rock and gas race down the slopes at 100 km/h or more. Pyroclastic flows and volcanic mudflows have killed far more people than lava flows.",
    });
  if (sliced) {
    if (!fissure || Math.abs(cut) < 2.0)
      labels.push({
        pos: leftFace(fissure ? 1.3 : CHAMBER.a * 1.45, CHAMBER.y - 0.03),
        text: "Magma chamber",
        tone: "magma",
        note: "Molten and partly crystalline rock collects in the crust below the volcano, with gas dissolved in it under pressure. Its size and depth here are schematic: real chambers are often several kilometers down.",
      });
    labels.push(
      style === STYLE.explosive
        ? {
            pos: rightFace(0.85, fragmentation),
            text: "Fragmentation level",
            tone: "magma",
            note: "Magma rises through the conduit and, as the pressure on it falls, its gas comes out as bubbles that keep growing. Here they have grown so much that the froth bursts: the magma shatters into ash and pumice, carried up by fast-expanding gas.",
          }
        : {
            pos: rightFace(0.85, (chamberTop + L.vent) / 2),
            text: fissure ? "Feeder dike · bubbles grow" : "Conduit · bubbles grow",
            tone: "magma",
            note: fissure
              ? "Below a fissure, magma rises through a long, thin, sheet-like crack called a dike. As the pressure on it falls, dissolved gas forms bubbles that grow on the way up. Its width here is exaggerated."
              : "Magma rises from the chamber through this pipe. As the pressure on it falls, dissolved gas comes out as bubbles that grow on the way up. In runny magma they escape easily; in sticky magma they are trapped. Its width here is exaggerated.",
          },
    );
  }

  const slopeReal = meanSlope(e, TRUE_RELIEF),
    slopeDrawn = meanSlope(e, k);
  return (
    <>
      <ScienceStudio
        slug="volcanoes"
        scale={scale}
        trueScale={trueScaleText}
        camera={[1.1, 3.3, 6.5]}
      >
        <LocalClipping />
        <mesh geometry={geometry} castShadow receiveShadow>
          <TerrainMaterial
            attach="material-0"
            kind="grass"
            color="#d0d0d0"
            vertexColors
            clippingPlanes={clip}
            clipIntersection
          />
          <RockMaterial
            attach="material-1"
            color="#a08a72"
            strata
            clippingPlanes={clip}
            clipIntersection
          />
        </mesh>
        {sliced && (
          <SectionFaces
            faces={faces}
            state={{
              L,
              style,
              gas,
              time,
              fragmentation,
              chamberScale: fissure ? Math.sqrt(Math.max(0, 1 - (cut / 2.1) ** 2)) : 1,
            }}
          />
        )}
        <PlantStand
          kind={fissure ? "broadleaf" : composite ? "conifer" : "broadleaf"}
          positions={trees}
          scale={0.07}
          seed={6}
        />
        {showFlows &&
          flows.map((f, i) => (
            <LavaFlow
              key={`${i}-${fissure}`}
              points={f.points}
              surface={drape}
              width={f.width}
              thickness={0.006 + 0.02 * v}
              front={0.18 + 0.82 * t}
              viscosity={v}
              time={time}
              clip={clip}
            />
          ))}
        <pointLight
          position={fissure ? [0, 0.45, 0] : [0, L.vent + 0.45, 0]}
          color="#ff7a30"
          intensity={glow}
          distance={fissure ? 3.2 : 2.2}
        />
        {!fissure && (style === STYLE.effusive || style === STYLE.fountain) && (
          <LavaLake
            position={[0, L.vent + 0.004, 0]}
            radius={e.craterRadius * (style === STYLE.effusive ? 0.55 : 0.32)}
            time={time}
            clip={clip}
          />
        )}
        {!fissure && style === STYLE.dome && (
          <LavaDome
            position={[0, L.vent - domeRadius * 0.15, 0]}
            radius={domeRadius}
            time={time}
            clip={clip}
          />
        )}
        <group userData={{ noFit: true }}>
          {!fissure && style === STYLE.fountain && (
            <LavaFountain origins={ventOrigins} height={fountainHeight} spread={0.45} time={time} />
          )}
          {fissure && style !== STYLE.explosive && (
            <LavaFountain
              origins={fissureOrigins}
              height={fountainHeight * (style === STYLE.effusive || composite ? 0.45 : 1)}
              spread={0.12}
              time={time}
              size={0.026}
            />
          )}
          {style === STYLE.explosive ? (
            <EruptionColumn
              vent={fissure ? [0, 0.12, 0] : [0, L.rim, 0]}
              height={columnHeight}
              power={power}
              wind={-0.55}
              time={time}
              steps={q.shadows ? 44 : 30}
            />
          ) : (
            <EruptionColumn
              vent={fissure ? [0, 0.1, 0] : [0, L.rim, 0]}
              height={0.42}
              power={0.05}
              wind={-0.95}
              time={time}
              gas
              opacity={style === STYLE.effusive ? 0.32 : 0.22}
              steps={q.shadows ? 32 : 24}
            />
          )}
          {collapse && (
            <PyroclasticFlows
              paths={pdcPaths}
              surface={drape}
              reach={0.3 + 0.7 * t}
              time={time}
              perPath={q.shadows ? 46 : 30}
            />
          )}
        </group>
        {style === STYLE.explosive && (
          <mesh
            userData={{ fitProxy: true }}
            visible={false}
            position={[-0.35, (fissure ? 0.12 : L.rim) + columnHeight * 0.55, 0]}
          >
            <boxGeometry args={[1.6, columnHeight * 1.1, 0.8]} />
          </mesh>
        )}

        {labels.map((l, i) => (
          <Tag
            key={l.text}
            pos={l.pos}
            text={compact ? String(i + 1) : l.text}
            title={compact ? `${i + 1} · ${l.text.split(" · ")[0]}` : undefined}
            tone={l.tone}
            note={l.note}
            occlude={false}
          />
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {compact && labels.length > 0 && (
          <div className="mb-2 text-chalk">
            {labels.map((l, i) => `${i + 1} · ${l.text.split(" · ")[0]}`).join(" · ")}
          </div>
        )}
        {"Viscosity "}
        {v.toFixed(2)} {"· Gas drive "}
        {gas.toFixed(2)} ·{" "}
        {fissure ? "fissure vents" : e.form > 0.5 ? "steep composite cone" : "broad shield"}.{" "}
        {!fissure &&
          `Average flank slope about ${Math.round(slopeReal)}° at real proportions${
            trueScale ? "" : ` (${Math.round(slopeDrawn)}° as drawn)`
          }. `}
        {style === STYLE.explosive
          ? collapse
            ? "Sticky, gas-rich magma traps its bubbles until it shatters into ash: the column spreads into an umbrella cloud while parts of it collapse as pyroclastic flows (shown qualitatively)."
            : composite
              ? "Sticky, gas-rich magma traps its bubbles until it shatters into ash, feeding an eruption column (shown qualitatively)."
              : "With this much gas even runny basalt shatters into ash and an eruption column rises (shown qualitatively)."
          : style === STYLE.dome
            ? fissure
              ? "Sticky, gas-poor lava squeezes out along the crack as short, thick flows."
              : "Sticky magma with little gas oozes out slowly and piles up as a lava dome in the crater."
            : style === STYLE.fountain
              ? fissure
                ? "Gas-rich runny basalt erupts as a curtain of fire along the crack, feeding lava flows."
                : "Gas-rich runny basalt throws up a lava fountain that feeds lava flows."
              : fissure
                ? "Runny basalt pours out along the crack and spreads as lava flows."
                : "Runny basalt with little gas fills a lava lake and pours out as long lava flows."}{" "}
        {
          "Use Cutaway to look inside the volcano. Gas, contact with water and ascent conditions also affect how explosive an eruption is; basalt can erupt explosively too."
        }
      </ScienceReadout>
    </>
  );
}
