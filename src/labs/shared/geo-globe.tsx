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
/**
 * Reconstructed coastlines arrive as a flat two-colour map. The shader keeps those shapes exactly
 * and adds a continental shelf, relief shading and land tones. Relief is illustrative noise, not
 * reconstructed palaeotopography.
 */
const PALAEO_SHADER = (s: THREE.WebGLProgramParametersWithUniforms) => {
  s.vertexShader =
    "varying vec3 palaeoPos;\n" +
    s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\npalaeoPos=normalize(position);",
    );
  s.fragmentShader = "varying vec3 palaeoPos;\n" + s.fragmentShader;
  s.fragmentShader = s.fragmentShader
    .replace(
      "#include <map_pars_fragment>",
      `#include <map_pars_fragment>
float pHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float pNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(pHash(i),pHash(i+vec3(1,0,0)),f.x),mix(pHash(i+vec3(0,1,0)),pHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(pHash(i+vec3(0,0,1)),pHash(i+vec3(1,0,1)),f.x),mix(pHash(i+vec3(0,1,1)),pHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float pFbm(vec3 p){return .5*pNoise(p)+.27*pNoise(p*2.1)+.15*pNoise(p*4.3)+.08*pNoise(p*8.7);}
float landAt(vec2 uv){return smoothstep(.1,.2,texture2D(map,uv).g);}
float palaeoHeight;
`,
    )
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
  float land=landAt(vMapUv);
  float near=0.;
  for(int i=0;i<8;i++){float a=float(i)*.785398;near+=landAt(vMapUv+vec2(cos(a)*.006,sin(a)*.012));}
  near/=8.;
  float coast=smoothstep(.85,1.,texture2D(map,vMapUv).r);
  float h=pFbm(palaeoPos*5.);
  palaeoHeight=land*h;
  vec3 deep=pow(vec3(.07,.19,.30),vec3(2.2)),shelf=pow(vec3(.22,.47,.54),vec3(2.2));
  vec3 low=pow(vec3(.42,.53,.31),vec3(2.2)),up=pow(vec3(.60,.53,.36),vec3(2.2)),high=pow(vec3(.70,.66,.60),vec3(2.2));
  vec3 sea=mix(deep,shelf,smoothstep(.05,.6,near)*.85);
  vec3 ground=mix(low,up,smoothstep(.45,.62,h));
  ground=mix(ground,high,smoothstep(.72,.82,h)*.8);
  ground*=.9+.2*pFbm(palaeoPos*16.+7.);
  diffuseColor.rgb=mix(sea,ground,land);
  diffuseColor.rgb=mix(diffuseColor.rgb,pow(vec3(.86,.82,.66),vec3(2.2)),coast*.25);`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
  {
    vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
    float hx=dFdx(palaeoHeight)*.9,hy=dFdy(palaeoHeight)*.9;
    vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);
    float det=dot(dpdx,r1);
    vec3 grad=sign(det)*(hx*r1+hy*r2);
    normal=normalize(abs(det)*normal-grad);
  }`,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      "#include <roughnessmap_fragment>\n  roughnessFactor=mix(.42,.9,land);",
    );
};
function ReconstructedSnapshot({ snapshot, radius }: { snapshot: number; radius: number }) {
  const texture = useTexture(`/geo/reconstruction/coastlines-${snapshot}-4k.webp`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 12;
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[radius, 160, 96]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.84}
        onBeforeCompile={PALAEO_SHADER}
        customProgramCacheKey={() => "palaeo-globe-v1"}
      />
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
