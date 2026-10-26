import { useMemo, type ReactNode } from "react";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "./science-kit";
import { Tag } from "./kit";
import type { LandSection } from "./land-section";
import {
  REAL_TERRAIN_CREDIT,
  RealTerrainBlock,
  siteFrame,
  siteXZ,
  useRealHeights,
  type RealSiteId,
} from "./real-terrain";

type Tone = "ice" | "chalk" | "glacier" | "magma" | "sandstone" | "moss" | "fault";
/** Where a label goes: a coordinate, a fraction of the block (0–1, u east, v south), or the lowest or highest point. */
type At = { lat: number; lon: number } | { u: number; v: number } | "lowest" | "highest";
export interface RealPlace {
  name: string;
  note: string;
  at: At;
  /** Label height above the ground, in scene units. */
  lift?: number;
  tone?: Tone;
}

/**
 * One real landscape from USGS data with labeled places and a cross-section line, for labs that
 * pair a teaching model with the real thing. North is −z; heights are exaggerated as stated.
 */
export function RealLandscape({
  slug,
  id,
  depth,
  exaggeration = 1.5,
  section,
  places,
  cross,
  camera = [2.2, 4.6, 6.4],
  children,
}: {
  slug: string;
  id: RealSiteId;
  /** Block depth in scene units; the block is always 6 units wide. */
  depth: number;
  exaggeration?: number;
  section?: LandSection;
  places: RealPlace[];
  /** Cross-section: north–south ("ns") at a fraction across, or west–east ("ew") at a fraction down. */
  cross: { axis: "ns" | "ew"; at: number; label: string };
  camera?: [number, number, number];
  /** Readout text; receives the lowest and highest elevation along the cross-section. */
  children: (stats: { lo: number; hi: number }) => ReactNode;
}) {
  const W = 6;
  const { trueScale } = useLabControls();
  const meters = useRealHeights(id);
  const k = trueScale ? 1 : exaggeration;
  const frame = siteFrame(id, W, depth);
  const y = (m: number) => ((m - frame.site.minM) * k) / frame.metersPerUnit;
  const length = cross.axis === "ns" ? depth : W;
  const along = (t: number): [number, number] =>
    cross.axis === "ns"
      ? [(cross.at - 0.5) * W, -depth / 2 + t * depth]
      : [-W / 2 + t * W, (cross.at - 0.5) * depth];
  const profile = useMemo(() => {
    if (!meters) return [];
    return Array.from({ length: 121 }, (_, i) => {
      const [x, z] = along(i / 120);
      return { x, z, m: meters(...frame.uv(x, z)) };
    });
    // along and frame depend only on the constant site, block size and cross-section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meters]);
  const extremes = useMemo(() => {
    if (!meters) return null;
    let lo = { x: 0, z: 0, m: Infinity },
      hi = { x: 0, z: 0, m: -Infinity };
    for (let i = 0; i <= 96; i++)
      for (let j = 0; j <= 96; j++) {
        const x = (i / 96 - 0.5) * W,
          z = (j / 96 - 0.5) * depth,
          m = meters(...frame.uv(x, z));
        if (m < lo.m) lo = { x, z, m };
        if (m > hi.m) hi = { x, z, m };
      }
    return { lo, hi };
    // frame depends only on the constant site and block size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meters]);
  const place = (at: At): [number, number] => {
    if (at === "lowest") return [extremes!.lo.x, extremes!.lo.z];
    if (at === "highest") return [extremes!.hi.x, extremes!.hi.z];
    if ("lat" in at) return siteXZ(id, W, depth, at.lat, at.lon);
    return [(at.u - 0.5) * W, (at.v - 0.5) * depth];
  };
  const lo = Math.min(...profile.map((p) => p.m)),
    hi = Math.max(...profile.map((p) => p.m));
  // SVG cross-section: 220 px for the section length, 46 px for its relief.
  const pxPerM = 46 / Math.max(1, hi - lo),
    svgExaggeration = pxPerM / (220 / (length * frame.metersPerUnit));
  const ends = cross.axis === "ns" ? ["N", "S"] : ["W", "E"];
  const name = frame.site.name;
  return (
    <>
      <ScienceStudio
        slug={slug}
        fitKey={meters ? "ready" : "loading"}
        scale={`Real terrain, ${name} · height exaggerated ×${exaggeration} · ${REAL_TERRAIN_CREDIT}`}
        trueScale={`1 scene unit = ${(frame.metersPerUnit / 1000).toFixed(1)} km in all directions · ${REAL_TERRAIN_CREDIT}`}
        camera={camera}
      >
        {meters && extremes ? (
          <group position={[0, -0.45, 0]}>
            <RealTerrainBlock
              id={id}
              meters={meters}
              width={W}
              depth={depth}
              exaggeration={k}
              section={section}
            />
            {places.map((p) => {
              const [x, z] = place(p.at);
              return (
                <Tag
                  key={p.name}
                  pos={[x, y(meters(...frame.uv(x, z))) + (p.lift ?? 0.18), z]}
                  text={p.name}
                  note={p.note}
                  tone={p.tone}
                  occlude={false}
                />
              );
            })}
            <Line
              points={profile.map((p) => [p.x, y(p.m) + 0.02, p.z] as [number, number, number])}
              color="#e8613a"
              lineWidth={2.5}
            />
          </group>
        ) : (
          <Tag pos={[0, 0.3, 0]} text={`Loading ${name}…`} occlude={false} />
        )}
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 240 64"
          className="mx-auto mb-1 block h-16 w-full max-w-md"
          role="img"
          aria-label={cross.label}
        >
          <line x1="10" y1="56" x2="230" y2="56" stroke="currentColor" strokeOpacity="0.3" />
          {profile.length > 0 && (
            <polygon
              points={`10,56 ${profile.map((p, i) => `${10 + (i / 120) * 220},${56 - (p.m - lo) * pxPerM}`).join(" ")} 230,56`}
              fill="#c9b07a"
              fillOpacity="0.35"
              stroke="#e8613a"
              strokeWidth="1.5"
            />
          )}
          <text x="2" y="62" fontSize="8" fill="currentColor">
            {ends[0]}
          </text>
          <text x="232" y="62" fontSize="8" fill="currentColor">
            {ends[1]}
          </text>
          <text x="230" y="9" fontSize="8" fill="currentColor" fillOpacity="0.7" textAnchor="end">
            {`Height exaggerated ×${svgExaggeration.toFixed(1)}`}
          </text>
        </svg>
        {profile.length ? children({ lo, hi }) : "Loading USGS elevation…"}
      </ScienceReadout>
    </>
  );
}
