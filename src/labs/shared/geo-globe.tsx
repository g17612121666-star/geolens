import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { latLonToXYZ } from "@/lib/geo";
type Geometry = { type: string; coordinates: number[][] | number[][][] | number[][][][] };
type Feature = { geometry: Geometry; properties: Record<string, unknown> };
type Geo = { type: "FeatureCollection"; features: Feature[] };
const geoCache = new Map<string, Geo>();
const pending = new Map<string, Promise<void>>(),
  failures = new Map<string, Error>();
function rings(g: Geometry): number[][][] {
  return g.type === "Polygon"
    ? (g.coordinates as number[][][])
    : g.type === "MultiPolygon"
      ? (g.coordinates as number[][][][]).flat()
      : g.type === "LineString"
        ? [g.coordinates as number[][]]
        : g.type === "MultiLineString"
          ? (g.coordinates as number[][][])
          : [];
}
function useGeo(url: string): { data: Geo; error: undefined; retry: () => void } {
  if (failures.has(url)) throw failures.get(url);
  const data = geoCache.get(url);
  if (data) return { data, error: undefined, retry: () => {} };
  if (!pending.has(url)) {
    THREE.DefaultLoadingManager.itemStart(url);
    const promise = fetch(url, { signal: AbortSignal.timeout(20000) })
      .then((r) => {
        if (!r.ok) throw new Error("Scientific dataset unavailable");
        return r.json();
      })
      .then((data) => {
        if (!data.features?.length) throw new Error("Scientific dataset is empty");
        geoCache.set(url, data);
      })
      .catch((e) => {
        failures.set(url, e);
        THREE.DefaultLoadingManager.itemError(url);
      })
      .finally(() => {
        pending.delete(url);
        THREE.DefaultLoadingManager.itemEnd(url);
      });
    pending.set(url, promise);
  }
  throw pending.get(url);
}
type Fade = {
  material?: React.Ref<THREE.MeshStandardMaterial>;
  onReady?: (snapshot: number) => void;
};
const MODERN = ["/textures/earth-day.jpg", "/textures/earth-bump.jpg"];
const snapshotUrl = (snapshot: number) => `/geo/reconstruction/paleo-${snapshot}.webp`;
function useReady(snapshot: number, onReady?: (snapshot: number) => void) {
  useEffect(() => onReady?.(snapshot), [snapshot, onReady]);
}
function ModernGlobe({ radius, material, onReady }: { radius: number } & Fade) {
  const [day, bump] = useTexture(MODERN);
  day.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = 12;
  useReady(0, onReady);
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[radius, 160, 96]} />
      <meshStandardMaterial
        ref={material}
        map={day}
        bumpMap={bump}
        bumpScale={0.004}
        roughness={0.84}
        transparent={Boolean(material)}
        depthWrite={!material}
      />
    </mesh>
  );
}
/**
 * Reconstructed coastlines come pre-baked by scripts/bake-paleo-globes.py: the coast shapes are
 * EarthByte data, while the shelf, land tones and gentle shading are illustrative.
 */
function ReconstructedSnapshot({
  snapshot,
  radius,
  material,
  onReady,
}: { snapshot: number; radius: number } & Fade) {
  const texture = useTexture(snapshotUrl(snapshot));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  useReady(snapshot, onReady);
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[radius, 160, 96]} />
      <meshStandardMaterial
        ref={material}
        map={texture}
        roughness={0.84}
        transparent={Boolean(material)}
        depthWrite={!material}
      />
    </mesh>
  );
}
function Snapshot({ snapshot, radius, ...fade }: { snapshot: number; radius: number } & Fade) {
  // Ancient snapshots need neither modern relief nor on-device GeoJSON rasterization.
  return snapshot === 0 ? (
    <ModernGlobe radius={radius} {...fade} />
  ) : (
    <ReconstructedSnapshot snapshot={snapshot} radius={radius} {...fade} />
  );
}
/**
 * Shows the nearest 10 Ma snapshot. When the age changes, the previous snapshot stays on top
 * until the next one has loaded, then fades out, so stepping through time never flashes a
 * loading screen. Neighboring snapshots are preloaded.
 */
export function ReconstructionGlobe({ age, radius = 1.25 }: { age: number; radius?: number }) {
  const snapshot = Math.max(0, Math.min(250, Math.round(age / 10) * 10));
  const [current, setCurrent] = useState(snapshot);
  const [leaving, setLeaving] = useState<number | null>(null);
  // The last snapshot that finished loading: only that one may stay on screen while the next
  // loads. Fading out a snapshot that never loaded would suspend and freeze the old globe.
  const shown = useRef<number | null>(null);
  const opacity = useRef(1);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (snapshot === current) return;
    setLeaving(shown.current);
    setCurrent(snapshot);
    opacity.current = 1;
  }, [snapshot, current]);
  useEffect(() => {
    for (const next of [snapshot - 10, snapshot + 10])
      if (next > 0 && next <= 250) useTexture.preload(snapshotUrl(next));
    if (snapshot === 10) useTexture.preload(MODERN);
  }, [snapshot]);
  const onReady = useMemo(
    () => (loaded: number) => {
      shown.current = loaded;
      invalidate();
    },
    [invalidate],
  );
  useFrame((_, dt) => {
    if (leaving === null || shown.current !== current) return;
    opacity.current = Math.max(0, opacity.current - dt * 3.5);
    if (material.current) material.current.opacity = opacity.current;
    if (opacity.current <= 0) setLeaving(null);
    invalidate();
  });
  return (
    <>
      <Suspense fallback={null}>
        <Snapshot key={current} snapshot={current} radius={radius} onReady={onReady} />
      </Suspense>
      {leaving !== null && leaving !== current && (
        <Suspense fallback={null}>
          <Snapshot
            key={`leaving-${leaving}`}
            snapshot={leaving}
            radius={radius * 1.002}
            material={material}
          />
        </Suspense>
      )}
    </>
  );
}
export function PlateLines({ radius = 1.254 }: { radius?: number }) {
  const { data, error, retry } = useGeo("/geo/plate-boundaries.json");
  // Screen-space (fat) line segments: WebGL ignores lineWidth on basic lines,
  // which left the boundaries as one-pixel hairlines.
  const g = useMemo(() => {
    const points: [number, number, number][] = [],
      colors: [number, number, number][] = [];
    for (const f of data?.features ?? []) {
      const label = String(f.properties.type ?? f.properties.boundary ?? f.properties.kind ?? "");
      const c = new THREE.Color(
        label === "convergent" ? "#f39676" : label === "divergent" ? "#69dfce" : "#e5ca85",
      );
      for (const ring of rings(f.geometry))
        for (let i = 1; i < ring.length; i++)
          for (const point of [ring[i - 1], ring[i]]) {
            points.push(latLonToXYZ(point[1], point[0], radius));
            colors.push([c.r, c.g, c.b]);
          }
    }
    return { points, colors };
  }, [data, radius]);
  return (
    <>
      {g.points.length > 1 && (
        <Line points={g.points} vertexColors={g.colors} segments lineWidth={2.4} />
      )}
      {error && (
        <Html center>
          <button onClick={retry} className="bg-basalt p-3 text-chalk">
            {"Boundary data unavailable · retry"}
          </button>
        </Html>
      )}
    </>
  );
}
