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

const SIDES = landSectionGlsl({ rock: "sandstone", soil: 0.03, regolith: 0.05, beds: 12 });
/** The summit: a survey trig pillar marks the highest point. */
const SUMMIT: [number, number] = (() => {
  let best: [number, number] = [0, 0],
    top = -1;
  for (let i = 0; i <= 120; i++)
    for (let j = 0; j <= 80; j++) {
      const x = -3 + (6 * i) / 120,
        z = -2 + (4 * j) / 80,
        h = hillHeight(x, z);
      if (h > top) {
        top = h;
        best = [x, z];
      }
    }
  return best;
})();
import { terrainBlockGeometry } from "../shared/science-geometry";
import { contours, hillHeight } from "./geometry";
export default function Contours() {
  const { params, trueScale } = useLabControls();
  const interval = params.interval ?? 10,
    mode = (params.mode3d ?? 1) > 0.5,
    factor = mode ? (trueScale ? 1 : 2.5) : 0;
  const [spot, setSpot] = useState<[number, number]>([0, 0]);
  const g = useMemo(() => {
    const surface = (x: number, z: number) => (hillHeight(x, z) / 100) * factor;
    const geometry = withSurfaceY(terrainBlockGeometry(surface, 6, 4, 128, -0.16), surface);
    // Hypsometric tint: the colour depends only on true height, as on a printed map.
    const p = geometry.attributes.position,
      colours = new Float32Array(p.count * 3),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      tint(hillHeight(p.getX(i), p.getZ(i)), c);
      colours.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return geometry;
  }, [factor]);
  useEffect(() => () => g.dispose(), [g]);
  const lines = useMemo(() => contours(interval), [interval]);
  // Index contours: every contour that is a multiple of the label step is drawn bold and labelled,
  // as on a printed map, so students can tell uphill from downhill.
  const labelStep = Math.ceil(20 / interval) * interval;
  const labelled = useMemo(
    () =>
      lines
        .filter((l) => l.height % labelStep === 0 && l.height < hillHeight(...SUMMIT))
        .map((l, i) => ({ height: l.height, at: alongLabelRay(l.height, LABEL_RAYS[i % 2]) }))
        // Leave room for the clicked-height tag.
        .filter((l) => Math.hypot(l.at[0] - spot[0], l.at[1] - spot[1]) > 0.8),
    [lines, labelStep, spot],
  );
  const sampled = hillHeight(...spot);
  const profile = useMemo(
    () =>
      Array.from({ length: 121 }, (_, i) => {
        const x = -3 + (i / 120) * 6;
        return [x, hillHeight(x, spot[1])] as [number, number];
      }),
    [spot],
  );
  return (
    <>
      <ScienceStudio
        slug="contours"
        scale="Height exaggerated ×2.5 · Compare physical scale shows equal horizontal and vertical scales"
        trueScale="1 scene unit = 100 m in all directions"
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
              points={l.points.map((p) => [p[0], (l.height / 100) * factor + 0.008, p[1]])}
              color={l.height % labelStep === 0 ? "#6b3f1d" : "#8c5a33"}
              lineWidth={l.height % labelStep === 0 ? 2 : 1}
            />
          ))}
          {labelled.map((l) => (
            <Tag
              key={`h${l.height}`}
              pos={[l.at[0], (l.height / 100) * factor + 0.03, l.at[1]]}
              text={`${l.height} m`}
              note="Index contours are drawn bold and labelled with their height, so you can tell which way is uphill."
              tone="sandstone"
            />
          ))}
          <Tag
            pos={[VALLEY[0], (hillHeight(...VALLEY) / 100) * factor + 0.12, VALLEY[1]]}
            text="Valley"
            note="Low ground between two slopes. Where contours cross it, their V points uphill (upstream)."
            tone="glacier"
          />
          <Tag
            pos={[SPUR[0], (hillHeight(...SPUR) / 100) * factor + 0.12, SPUR[1]]}
            text="Spur"
            note="A ridge of high ground sticking out from the hill. Its contours bend into a V or U that points downhill."
            tone="moss"
          />
          {mode && (
            <Line
              points={[
                [spot[0], 0.005, spot[1]],
                [spot[0], (sampled / 100) * factor + 0.015, spot[1]],
              ]}
              color="#f0b58b"
              lineWidth={1.2}
              dashed
              dashSize={0.04}
              gapSize={0.025}
            />
          )}
          <Line
            points={profile.map(
              ([x, h]) => [x, (h / 100) * factor + 0.02, spot[1]] as [number, number, number],
            )}
            color="#e8613a"
            lineWidth={2.5}
          />
          <Tag pos={[-3.05, 0.25, spot[1]]} text="A" occlude={false} />
          <Tag pos={[3.05, 0.25, spot[1]]} text="B" occlude={false} />
          <mesh position={[spot[0], (sampled / 100) * factor + 0.025, spot[1]]}>
            <sphereGeometry args={[0.04, 20, 20]} />
            <meshStandardMaterial color="#ff9974" />
          </mesh>
          <Tag
            pos={[spot[0], (sampled / 100) * factor + 0.22, spot[1]]}
            text={`${sampled.toFixed(1)} m`}
            note="Click any point on the surface to measure its elevation above this model's datum."
            occlude={false}
          />
          {mode && (
            <group
              position={[SUMMIT[0], (hillHeight(...SUMMIT) / 100) * factor, SUMMIT[1]]}
              scale={0.6}
            >
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
              [-2, 0.01, 2.2],
            ]}
            color="#f4efe6"
            lineWidth={3}
          />
          <Tag pos={[-1.55, 0.01, 2.2]} text="100 m" occlude={false} />
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
            points={`12,56 ${profile.map(([x, h]) => `${12 + ((x + 3) / 6) * 220},${56 - h * 0.48}`).join(" ")} 232,56`}
            fill="#c9b07a"
            fillOpacity="0.35"
            stroke="#e8613a"
            strokeWidth="1.5"
          />
          <text x="2" y="60" fontSize="9" fill="currentColor">
            A
          </text>
          <text x="232" y="9" fontSize="8" fill="currentColor" fillOpacity="0.7" textAnchor="end">
            Height exaggerated ×1.3
          </text>
          <text x="234" y="60" fontSize="9" fill="currentColor">
            B
          </text>
        </svg>
        {"Contour interval "}
        {interval} {"m · clicked point "}
        {sampled.toFixed(1)}{" "}
        {
          "m. Click the hill to check a height and draw the A–B cross-section through that point. Turn off “3D hill” and look from above for its contour map; the elevations stay the same."
        }
      </ScienceReadout>
    </>
  );
}

/** Feature labels, placed on the carved valley axis and the spur ridge in geometry.ts. */
const VALLEY: [number, number] = [-0.2, 1.25];
const SPUR: [number, number] = [1.4, -0.8];
/**
 * Contour labels alternate between two smooth slopes east and west of the summit where height
 * falls steadily, so neighbouring labels do not sit on top of each other.
 */
const LABEL_RAYS: [number, number][] = [
  [-0.82, 0.56],
  [0.95, 0.3],
];
function alongLabelRay(level: number, dir: [number, number]): [number, number] {
  const len = Math.hypot(dir[0], dir[1]),
    at = (t: number): [number, number] => [
      SUMMIT[0] + (dir[0] / len) * t,
      SUMMIT[1] + (dir[1] / len) * t,
    ];
  let lo = 0,
    hi = 2.5;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (hillHeight(...at(mid)) > level) lo = mid;
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
