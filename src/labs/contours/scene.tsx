import { useEffect, useMemo, useState } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { TerrainMaterial } from "../shared/natural-world";
import { SectionMaterial } from "../shared/section-material";
import { withSurfaceY } from "../shared/section-utils";
import { landSectionGlsl } from "../shared/land-section";
import { REAL_TERRAIN_CREDIT, siteFrame, useRealHeights } from "../shared/real-terrain";

const SIDES = landSectionGlsl({ rock: "sandstone", soil: 0.03, regolith: 0.05, beds: 12 });
import { terrainBlockGeometry } from "../shared/science-geometry";
import { contours, hillHeight } from "./geometry";
/** A height field in meters on the 6 × 4 block, with its scale and highest point. */
interface Field {
  h: (x: number, z: number) => number;
  lo: number;
  hi: number;
  /** Meters per scene unit, horizontally. */
  unitM: number;
  summit: [number, number];
}
function highest(h: (x: number, z: number) => number) {
  let best: [number, number] = [0, 0],
    top = -Infinity,
    low = Infinity;
  for (let i = 0; i <= 120; i++)
    for (let j = 0; j <= 80; j++) {
      const x = -3 + (6 * i) / 120,
        z = -2 + (4 * j) / 80,
        v = h(x, z);
      if (v > top) {
        top = v;
        best = [x, z];
      }
      low = Math.min(low, v);
    }
  return { summit: best, top, low };
}
const MODEL: Field = (() => {
  const { summit, top } = highest(hillHeight);
  return { h: hillHeight, lo: 0, hi: top, unitM: 100, summit };
})();
const REAL_ID = "sugarloaf-md" as const;

export default function Contours() {
  const { params, trueScale } = useLabControls();
  const interval = params.interval ?? 10,
    real = (params.place ?? 0) > 0.5,
    mode = (params.mode3d ?? 1) > 0.5,
    factor = mode ? (trueScale ? 1 : 2.5) : 0;
  const meters = useRealHeights(real ? REAL_ID : null);
  const field: Field | null = useMemo(() => {
    if (!real) return MODEL;
    if (!meters) return null;
    const frame = siteFrame(REAL_ID, 6, 4),
      h = (x: number, z: number) => meters(...frame.uv(x, z)),
      { summit, top, low } = highest(h);
    return { h, lo: low, hi: top, unitM: frame.metersPerUnit, summit };
  }, [real, meters]);
  const [spot, setSpot] = useState<[number, number]>([0, 0]);
  // Start the measuring point on a flank, clear of the summit labels.
  useEffect(() => setSpot(real ? [-1.9, 0.9] : [0, 0]), [real]);
  const g = useMemo(() => {
    if (!field) return null;
    const surface = (x: number, z: number) => ((field.h(x, z) - field.lo) / field.unitM) * factor;
    const geometry = withSurfaceY(terrainBlockGeometry(surface, 6, 4, 128, -0.16), surface);
    // Hypsometric tint: the color depends only on true height, as on a printed map.
    const p = geometry.attributes.position,
      colors = new Float32Array(p.count * 3),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      tint(((field.h(p.getX(i), p.getZ(i)) - field.lo) / (field.hi - field.lo)) * 100, c);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [field, factor]);
  useEffect(() => () => g?.dispose(), [g]);
  const lines = useMemo(
    () => (field ? contours(interval, field.h, field.lo, field.hi) : []),
    [interval, field],
  );
  // Index contours: every contour that is a multiple of the label step is drawn bold and labeled,
  // as on a printed map, so students can tell uphill from downhill.
  const labelStep = Math.ceil((real ? 50 : 20) / interval) * interval;
  const labeled = useMemo(() => {
    if (!field) return [];
    return (
      lines
        .filter((l) => l.height % labelStep === 0 && l.height < field.hi)
        .map((l, i) => ({
          height: l.height,
          at: alongLabelRay(field, l.height, LABEL_RAYS[i % LABEL_RAYS.length]),
        }))
        // A ray can miss a level on real, uneven ground; label only true crossings.
        .filter((l) => Math.abs(field.h(...l.at) - l.height) < interval / 4)
        // Leave room for the clicked-height tag and the summit, and keep labels apart.
        .filter((l) => Math.hypot(l.at[0] - spot[0], l.at[1] - spot[1]) > 0.8)
        .filter((l) => Math.hypot(l.at[0] - field.summit[0], l.at[1] - field.summit[1]) > 0.45)
        .reduce<{ height: number; at: [number, number] }[]>(
          (kept, l) =>
            kept.every((k) => Math.hypot(k.at[0] - l.at[0], k.at[1] - l.at[1]) > 0.55)
              ? [...kept, l]
              : kept,
          [],
        )
    );
  }, [field, lines, labelStep, spot, interval]);
  if (!field || !g)
    return (
      <ScienceStudio slug="contours" scale="Loading USGS elevation…" camera={[4.8, 5.8, 7]}>
        <Tag pos={[0, 0.4, 0]} text="Loading Sugarloaf Mountain…" occlude={false} />
      </ScienceStudio>
    );
  const y = (h: number) => ((h - field.lo) / field.unitM) * factor;
  const sampled = field.h(...spot);
  const profile = Array.from({ length: 121 }, (_, i) => {
    const x = -3 + (i / 120) * 6;
    return [x, field.h(x, spot[1])] as [number, number];
  });
  // Cross-section: 220 px wide for 6 units, 48 px tall for the full relief.
  const pxPerM = 48 / (field.hi - field.lo),
    profileExaggeration = pxPerM / (220 / (6 * field.unitM));
  const barUnits = real ? 1000 / field.unitM : 1;
  return (
    <>
      <ScienceStudio
        slug="contours"
        fitKey={real ? "real" : "model"}
        scale={
          real
            ? `Real terrain, Sugarloaf Mountain, Maryland · height exaggerated ×2.5 · ${REAL_TERRAIN_CREDIT}`
            : "Height exaggerated ×2.5 · Compare physical scale shows equal horizontal and vertical scales"
        }
        trueScale={
          real
            ? `1 scene unit = ${Math.round(field.unitM)} m in all directions · ${REAL_TERRAIN_CREDIT}`
            : "1 scene unit = 100 m in all directions"
        }
        camera={[4.8, 5.8, 7]}
      >
        <group position={[0, -0.7, 0]}>
          <mesh
            geometry={g}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              setSpot([e.point.x, e.point.z]);
            }}
          >
            <TerrainMaterial
              attach="material-0"
              kind="grass"
              color="#ffffff"
              map={null}
              vertexColors
              normalScale={new THREE.Vector2(0.12, 0.12)}
              roughness={0.95}
            />
            <SectionMaterial attach="material-1" glsl={SIDES} surface cacheKey="contour-sides" />
          </mesh>
          {lines.map((l) => (
            <Line
              key={l.height}
              segments
              points={l.points.map((p) => [p[0], y(l.height) + 0.008, p[1]])}
              color={l.height % labelStep === 0 ? "#6b3f1d" : "#8c5a33"}
              lineWidth={l.height % labelStep === 0 ? 2 : 1}
            />
          ))}
          {labeled.map((l) => (
            <Tag
              key={`h${l.height}`}
              pos={[l.at[0], y(l.height) + 0.03, l.at[1]]}
              text={`${l.height} m`}
              note={
                real
                  ? "Index contours are drawn bold and labeled with their height above sea level, so you can tell which way is uphill."
                  : "Index contours are drawn bold and labeled with their height, so you can tell which way is uphill."
              }
              tone="sandstone"
            />
          ))}
          {!real && (
            <>
              <Tag
                pos={[VALLEY[0], y(hillHeight(...VALLEY)) + 0.12, VALLEY[1]]}
                text="Valley"
                note="Low ground between two slopes. Where contours cross it, their V points uphill (upstream)."
                tone="glacier"
              />
              <Tag
                pos={[SPUR[0], y(hillHeight(...SPUR)) + 0.12, SPUR[1]]}
                text="Spur"
                note="A ridge of high ground sticking out from the hill. Its contours bend into a V or U that points downhill."
                tone="moss"
              />
            </>
          )}
          {real && (
            <Tag
              pos={[field.summit[0], y(field.hi) + 0.32, field.summit[1]]}
              text={`Summit · ${Math.round(field.hi)} m`}
              note="The highest point in this block of USGS elevation data. Look for spurs (contour Vs pointing downhill) and valleys (Vs pointing uphill) on its flanks."
              occlude={false}
            />
          )}
          {mode && (
            <Line
              points={[
                [spot[0], 0.005, spot[1]],
                [spot[0], y(sampled) + 0.015, spot[1]],
              ]}
              color="#f0b58b"
              lineWidth={1.2}
              dashed
              dashSize={0.04}
              gapSize={0.025}
            />
          )}
          <Line
            points={profile.map(([x, h]) => [x, y(h) + 0.02, spot[1]] as [number, number, number])}
            color="#e8613a"
            lineWidth={2.5}
          />
          <Tag pos={[-3.05, 0.25, spot[1]]} text="A" occlude={false} />
          <Tag pos={[3.05, 0.25, spot[1]]} text="B" occlude={false} />
          <mesh position={[spot[0], y(sampled) + 0.025, spot[1]]}>
            <sphereGeometry args={[0.04, 20, 20]} />
            <meshStandardMaterial color="#ff9974" />
          </mesh>
          <Tag
            pos={[spot[0], y(sampled) + 0.22, spot[1]]}
            text={`${sampled.toFixed(1)} m`}
            note={
              real
                ? "Click any point on the surface to measure its elevation above sea level."
                : "Click any point on the surface to measure its elevation above this model's datum."
            }
            occlude={false}
          />
          {mode && (
            <group position={[field.summit[0], y(field.hi), field.summit[1]]} scale={0.6}>
              <mesh position={[0, 0.09, 0]} castShadow>
                <boxGeometry args={[0.07, 0.18, 0.07]} />
                <meshStandardMaterial color="#efeee8" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.185, 0]}>
                <cylinderGeometry args={[0.02, 0.025, 0.012, 16]} />
                <meshStandardMaterial color="#9a958a" metalness={0.5} roughness={0.4} />
              </mesh>
            </group>
          )}
          <Line
            points={[
              [-3, 0.01, 2.2],
              [-3 + barUnits, 0.01, 2.2],
            ]}
            color="#f4efe6"
            lineWidth={3}
          />
          <Tag pos={[-2.55 + barUnits, 0.01, 2.2]} text={real ? "1 km" : "100 m"} occlude={false} />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 240 64"
          className="mx-auto mb-1 block h-16 w-full max-w-md"
          role="img"
          aria-label="Cross-section from A to B through the clicked point"
        >
          <line x1="12" y1="56" x2="232" y2="56" stroke="currentColor" strokeOpacity="0.3" />
          <polygon
            points={`12,56 ${profile.map(([x, h]) => `${12 + ((x + 3) / 6) * 220},${56 - (h - field.lo) * pxPerM}`).join(" ")} 232,56`}
            fill="#c9b07a"
            fillOpacity="0.35"
            stroke="#e8613a"
            strokeWidth="1.5"
          />
          <text x="2" y="60" fontSize="9" fill="currentColor">
            A
          </text>
          <text x="232" y="9" fontSize="8" fill="currentColor" fillOpacity="0.7" textAnchor="end">
            {`Height exaggerated ×${profileExaggeration.toFixed(1)}`}
          </text>
          <text x="234" y="60" fontSize="9" fill="currentColor">
            B
          </text>
        </svg>
        {"Contour interval "}
        {interval} {"m · clicked point "}
        {sampled.toFixed(1)}{" "}
        {real
          ? "m above sea level. This is real USGS elevation for Sugarloaf Mountain, Maryland. Click the mountain to check a height and draw the A–B cross-section; turn off “3D hill” for the contour map."
          : "m. Click the hill to check a height and draw the A–B cross-section through that point. Turn off “3D hill” and look from above for its contour map; the elevations stay the same."}
      </ScienceReadout>
    </>
  );
}

/** Feature labels, placed on the carved valley axis and the spur ridge in geometry.ts. */
const VALLEY: [number, number] = [-0.2, 1.25];
const SPUR: [number, number] = [1.4, -0.8];
/**
 * Contour labels alternate between two smooth slopes east and west of the summit where height
 * falls steadily, so neighboring labels do not sit on top of each other.
 */
const LABEL_RAYS: [number, number][] = [
  [-0.82, 0.56],
  [0.95, 0.3],
];
function alongLabelRay(field: Field, level: number, dir: [number, number]): [number, number] {
  const len = Math.hypot(dir[0], dir[1]),
    at = (t: number): [number, number] => [
      field.summit[0] + (dir[0] / len) * t,
      field.summit[1] + (dir[1] / len) * t,
    ];
  let lo = 0,
    hi = 2.5;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (field.h(...at(mid)) > level) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2);
}

const TINT = [
  { h: 0, c: new THREE.Color("#6f9a5a") },
  { h: 30, c: new THREE.Color("#a7b56a") },
  { h: 60, c: new THREE.Color("#c9b178") },
  { h: 85, c: new THREE.Color("#a7805a") },
  { h: 100, c: new THREE.Color("#8a6a52") },
];
function tint(height: number, out: THREE.Color) {
  for (let i = 1; i < TINT.length; i++)
    if (height <= TINT[i].h) {
      const f = (height - TINT[i - 1].h) / (TINT[i].h - TINT[i - 1].h);
      return out.copy(TINT[i - 1].c).lerp(TINT[i].c, Math.max(0, f));
    }
  return out.copy(TINT[TINT.length - 1].c);
}
