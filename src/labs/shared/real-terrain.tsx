import { Suspense, useEffect, useMemo, useState } from "react";
import { useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import SITES from "./real-terrain-sites.json";
import { terrainBlockGeometry } from "./science-geometry";
import { withSurfaceY } from "./section-utils";
import { SectionMaterial } from "./section-material";
import { landSectionGlsl, type LandSection } from "./land-section";

/**
 * Real landscapes baked from public-domain USGS data by scripts/fetch-real-terrain.py:
 * 3DEP elevation (uint16, row 0 = north) and orthoimagery covering the same square.
 */
export type RealSiteId = keyof typeof SITES;
export type RealSite = (typeof SITES)[RealSiteId];
export const REAL_SITES = SITES as Record<RealSiteId, RealSite>;
export const REAL_TERRAIN_CREDIT =
  "Elevation: USGS 3D Elevation Program · imagery: USGS The National Map (public domain)";

const cache = new Map<RealSiteId, Promise<Float32Array>>();
function loadHeights(id: RealSiteId) {
  let p = cache.get(id);
  if (!p) {
    const site = REAL_SITES[id];
    p = fetch(`/terrain/${id}.bin`)
      .then((r) => {
        if (!r.ok) throw new Error(`terrain ${id}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const raw = new Uint16Array(buf),
          out = new Float32Array(raw.length),
          span = site.maxM - site.minM;
        for (let i = 0; i < raw.length; i++) out[i] = site.minM + (raw[i] / 65535) * span;
        return out;
      });
    cache.set(id, p);
  }
  return p;
}

/** Elevation in meters above sea level for a point on the site, given as fractions 0–1 (u east, v south). */
export type MetersAt = (u: number, v: number) => number;

/** Loads a site's heights; null until they arrive. */
export function useRealHeights(id: RealSiteId | null): MetersAt | null {
  const [state, setState] = useState<{ id: RealSiteId; data: Float32Array } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadHeights(id).then((data) => live && setState({ id, data }));
    return () => {
      live = false;
    };
  }, [id]);
  return useMemo(() => {
    if (!id || !state || state.id !== id) return null;
    const n = REAL_SITES[id].size,
      d = state.data;
    return (u, v) => {
      const x = THREE.MathUtils.clamp(u, 0, 1) * (n - 1),
        y = THREE.MathUtils.clamp(v, 0, 1) * (n - 1),
        i = Math.min(n - 2, Math.floor(x)),
        j = Math.min(n - 2, Math.floor(y)),
        fx = x - i,
        fy = y - j,
        a = d[j * n + i],
        b = d[j * n + i + 1],
        c = d[(j + 1) * n + i],
        e = d[(j + 1) * n + i + 1];
      return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
    };
  }, [id, state]);
}

/**
 * Maps a site onto a block `width` scene units wide and `depth` deep (centered, north = −z).
 * The block shows the full site width and the matching central strip north–south.
 */
export function siteFrame(id: RealSiteId, width: number, depth: number) {
  const site = REAL_SITES[id],
    metersPerUnit = (site.widthKm * 1000) / width,
    vSpan = Math.min(1, depth / width);
  return {
    site,
    metersPerUnit,
    /** u, v (0–1 across the whole site) for a scene point. */
    uv: (x: number, z: number): [number, number] => [x / width + 0.5, 0.5 + (z / depth) * vSpan],
    vSpan,
  };
}

/**
 * A block of real terrain draped with its aerial photograph. Heights are measured from `datum`
 * (default: the site's lowest point) and multiplied by `exaggeration`; horizontal and vertical
 * scene units otherwise share the same scale.
 */
export function RealTerrainBlock(props: RealTerrainProps) {
  const frame = siteFrame(props.id, props.width, props.depth),
    top =
      ((frame.site.maxM - (props.datum ?? frame.site.minM)) * props.exaggeration) /
      frame.metersPerUnit,
    base = props.base ?? -0.25;
  // While the photograph loads, an invisible box of the same size keeps the camera fit right.
  return (
    <Suspense
      fallback={
        <mesh position={[0, (top + base) / 2, 0]}>
          <boxGeometry args={[props.width, top - base, props.depth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      }
    >
      <DrapedTerrain {...props} />
    </Suspense>
  );
}

interface RealTerrainProps {
  id: RealSiteId;
  meters: MetersAt;
  width: number;
  depth: number;
  exaggeration: number;
  base?: number;
  section?: LandSection;
  n?: number;
  /** Elevation in meters drawn at y = 0. */
  datum?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

function DrapedTerrain({
  id,
  meters,
  width,
  depth,
  exaggeration,
  base = -0.25,
  section = { rock: "granite", soil: 0.02, regolith: 0.04, beds: 6 },
  n = 192,
  datum,
  onClick,
}: RealTerrainProps) {
  const frame = siteFrame(id, width, depth);
  const photo = useTexture(`/terrain/${id}.jpg`);
  const map = useMemo(() => {
    const t = photo.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // Show only the strip of the square photo that the block covers.
    t.repeat.set(1, frame.vSpan);
    t.offset.set(0, (1 - frame.vSpan) / 2);
    t.needsUpdate = true;
    return t;
  }, [photo, frame.vSpan]);
  const glsl = useMemo(() => landSectionGlsl(section), [section]);
  const geometry = useMemo(() => {
    const k = exaggeration / frame.metersPerUnit,
      lo = datum ?? frame.site.minM,
      h = (x: number, z: number) => (meters(...frame.uv(x, z)) - lo) * k;
    return withSurfaceY(terrainBlockGeometry(h, width, depth, n, base), h);
    // frame is derived from id, width and depth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, meters, width, depth, exaggeration, base, n, datum]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh geometry={geometry} receiveShadow castShadow onClick={onClick}>
      <meshStandardMaterial attach="material-0" map={map} roughness={0.95} metalness={0} />
      <SectionMaterial attach="material-1" glsl={glsl} surface cacheKey={`real-${id}`} />
    </mesh>
  );
}

/** Scene x, z for a latitude and longitude on a site block (north = −z). */
export function siteXZ(
  id: RealSiteId,
  width: number,
  depth: number,
  lat: number,
  lon: number,
): [number, number] {
  const { site, vSpan } = siteFrame(id, width, depth),
    [w, s, e, n] = site.bbox,
    u = (lon - w) / (e - w),
    v = (n - lat) / (n - s);
  return [(u - 0.5) * width, ((v - 0.5) * depth) / vSpan];
}
