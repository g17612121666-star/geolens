import { useMemo } from "react";
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
function ModernGlobe({ radius }: { radius: number }) {
  const [day, bump] = useTexture(["/textures/earth-day.jpg", "/textures/earth-bump.jpg"]);
  day.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = 12;
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[radius, 160, 96]} />
      <meshStandardMaterial map={day} bumpMap={bump} bumpScale={0.004} roughness={0.84} />
    </mesh>
  );
}
function ReconstructedSnapshot({ snapshot, radius }: { snapshot: number; radius: number }) {
  const texture = useTexture(`/geo/reconstruction/coastlines-${snapshot}-4k.webp`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[radius, 160, 96]} />
      <meshStandardMaterial map={texture} roughness={0.84} />
    </mesh>
  );
}
export function ReconstructionGlobe({ age, radius = 1.25 }: { age: number; radius?: number }) {
  const snapshot = Math.max(0, Math.min(250, Math.round(age / 10) * 10));
  // Ancient snapshots need neither modern relief nor on-device GeoJSON rasterisation.
  return snapshot === 0 ? (
    <ModernGlobe radius={radius} />
  ) : (
    <ReconstructedSnapshot snapshot={snapshot} radius={radius} />
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
