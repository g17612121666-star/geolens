import { useEffect, useMemo, useState } from "react";
import { Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { useLabTick } from "@/labs/tick";
import { Tag, InspectHotspot } from "../shared/kit";
import { ScienceReadout, ScienceStudio } from "../shared/science-kit";
import { shellSection } from "../shared/science-geometry";
import { useRockNormal } from "../shared/materials";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";

const layers = [
  {
    name: "Crust",
    color: "#8d8065",
    note: "Solid rock. Oceanic crust is commonly 5–10 km thick; continental crust commonly 30–50 km. This reference section uses 35 km.",
    rough: 0.92,
    metal: 0.02,
  },
  {
    name: "Mantle · solid",
    color: "#80704f",
    note: "Mostly solid silicate rock. It deforms and convects over geological time; it is not a global magma ocean. Base: about 2,890 km depth.",
    rough: 0.84,
    metal: 0.03,
  },
  {
    name: "Outer core · liquid",
    color: "#ae875b",
    note: "Liquid iron-rich alloy, from about 2,890 to 5,150 km depth. Transmits P waves but not S (shear) waves. The smooth metallic sheen marks the material; it is not a map of flow.",
    rough: 0.2,
    metal: 0.96,
  },
  {
    name: "Inner core · solid",
    color: "#d4d2bf",
    note: "Solid iron-rich alloy, radius about 1,221 km. High pressure keeps it solid despite its very high temperature. The fine metallic texture marks the material; it does not show real crystal sizes.",
    rough: 0.42,
    metal: 0.9,
  },
];
/** Static micro-normal/roughness fields distinguish material response only.
 * They never displace the closed cut faces or imply kilometre-scale structures. */
function CoreMaterial({ solid, attach }: { solid: boolean; attach: string }) {
  const maps = useMemo(() => {
    const size = 512,
      normals = new Uint8Array(size * size * 4),
      roughness = new Uint8Array(size * size * 4),
      height = new Float32Array(size * size);
    const hash = (x: number, y: number) => {
      const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    // Interpolated multi-scale noise avoids piecewise-constant square normals
    // and low-frequency sinusoidal bands. Neither pattern represents core flow.
    const octaves = [32, 64, 128].map((n, i) => ({
      n,
      weight: [0.52, 0.3, 0.18][i],
      grid: Float32Array.from({ length: n * n }, (_, k) =>
        hash((k % n) + 17 * i, Math.floor(k / n) + 71 * i),
      ),
    }));
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let value = 0;
        for (const { n, weight, grid } of octaves) {
          const gx = (x / size) * n,
            gy = (y / size) * n,
            ix = Math.floor(gx),
            iy = Math.floor(gy),
            fx = gx - ix,
            fy = gy - iy,
            sx = fx * fx * (3 - 2 * fx),
            sy = fy * fy * (3 - 2 * fy);
          const a = grid[iy * n + ix],
            b = grid[iy * n + ((ix + 1) % n)],
            c = grid[((iy + 1) % n) * n + ix],
            d = grid[((iy + 1) % n) * n + ((ix + 1) % n)];
          value += weight * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
        }
        height[y * size + x] = value;
      }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const k = (y * size + x) * 4,
          grain = height[y * size + x],
          strength = solid ? 0.48 : 0.1;
        const dx =
          (height[y * size + ((x + 1) % size)] - height[y * size + ((x + size - 1) % size)]) *
          strength;
        const dy =
          (height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x]) *
          strength;
        const normal = new THREE.Vector3(-dx, -dy, 1).normalize(),
          r = solid ? 0.87 + 0.11 * grain : 0.94 + 0.04 * grain;
        normals[k] = Math.round((normal.x * 0.5 + 0.5) * 255);
        normals[k + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
        normals[k + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
        normals[k + 3] = 255;
        roughness[k] = roughness[k + 1] = roughness[k + 2] = Math.round(r * 255);
        roughness[k + 3] = 255;
      }
    return [normals, roughness].map((data) => {
      const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.setScalar(solid ? 6 : 3);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 8;
      texture.colorSpace = THREE.NoColorSpace;
      texture.needsUpdate = true;
      return texture;
    });
  }, [solid]);
  useEffect(() => () => maps.forEach((texture) => texture.dispose()), [maps]);
  return (
    <meshPhysicalMaterial
      attach={attach}
      color={solid ? "#e2dfce" : "#c1a577"}
      metalness={solid ? 0.76 : 0.82}
      roughness={solid ? 0.39 : 0.27}
      normalMap={maps[0]}
      normalScale={new THREE.Vector2(solid ? 0.45 : 0.2, solid ? 0.45 : 0.2)}
      roughnessMap={maps[1]}
      envMapIntensity={solid ? 3.2 : 4}
      side={THREE.DoubleSide}
    />
  );
}

/** Procedural cut faces: layered crust, convecting mantle, swirling liquid outer core and a
 * crystalline inner core. Patterns are illustrative; they are not mapped mantle structure. */
const INTERIOR_GLSL = `uniform float uTime,uCrustR;
vec3 sectionColour(vec3 p,vec3 w){
  float r=length(p),a=atan(p.y,length(p.xz)),g=grain(p.xy*3.+p.zy*3.);
  if(r>uCrustR){
    float f=(r-uCrustR)/(1.-uCrustR);
    vec3 c=f>.55?mix(vec3(.78,.64,.56),vec3(.64,.52,.47),g):mix(vec3(.55,.55,.58),vec3(.44,.45,.48),g);
    if(f>.9)c=mix(vec3(.80,.70,.52),vec3(.68,.58,.42),step(.5,fract(f*60.)));
    return c;
  }
  if(r>.546){
    float depth=(1.-r)*6371.;
    float flow=sFbm(vec2(a*2.4+.15*sin(uTime*.3+r*6.),r*7.-uTime*.05));
    vec3 upper=vec3(.40,.46,.24),tz=vec3(.50,.43,.24),lower=vec3(.60,.33,.18),dpp=vec3(.42,.15,.08);
    vec3 c=depth<410.?upper:depth<660.?mix(upper,tz,.8):mix(tz,lower,smoothstep(660.,1400.,depth));
    c=mix(c,dpp,smoothstep(2600.,2880.,depth));
    float plume=smoothstep(.62,.8,flow),slab=smoothstep(.38,.22,flow);
    c=mix(c,vec3(.84,.48,.20),plume*.6);
    c=mix(c,vec3(.22,.24,.24),slab*.5);
    return c*(.9+.2*g);
  }
  if(r>.192){
    float swirl=sFbm(vec2(a*5.+uTime*.6+3.*r,r*14.-uTime*.4));
    return mix(vec3(.62,.36,.14),vec3(.92,.66,.30),swirl);
  }
  vec3 cell=floor(p*26.);
  float facet=sHash(cell.xy+cell.z*7.1);
  return mix(vec3(.84,.78,.58),vec3(.96,.92,.76),facet)*(.94+.1*g);
}
vec3 sectionGlow(vec3 p,vec3 w){
  float r=length(p),a=atan(p.y,length(p.xz));
  if(r<=.546&&r>.192){
    float swirl=sFbm(vec2(a*5.+uTime*.6+3.*r,r*14.-uTime*.4));
    return vec3(1.,.48,.12)*(.18+.4*swirl);
  }
  if(r<=.192)return vec3(.35,.32,.22);
  if(r<=uCrustR){
    float flow=sFbm(vec2(a*2.4+.15*sin(uTime*.3+r*6.),r*7.-uTime*.05));
    return vec3(1.,.4,.1)*smoothstep(.7,.9,flow)*.25*smoothstep(.85,.6,r);
  }
  return vec3(0.);
}`;
/** Approximate geotherm (depth km → °C), smoothed from standard textbook profiles. */
const GEOTHERM: [number, number][] = [
  [0, 15],
  [35, 500],
  [100, 1300],
  [410, 1500],
  [660, 1900],
  [2700, 2500],
  [2891, 3800],
  [2892, 3800],
  [5150, 5300],
  [6371, 5400],
];
const HEAT_STOPS = ["#3b2a24", "#7a2412", "#c2401a", "#ec7d1f", "#f9c64a", "#fff4c8"];
const heatVertex = /* glsl */ `
  varying float vRadius;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vRadius = length(position);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const heatFragment = /* glsl */ `
  uniform float depths[10];
  uniform float temps[10];
  uniform vec3 stops[6];
  varying float vRadius;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  vec3 ramp(float x) {
    float s = clamp(x, 0.0, 1.0) * 5.0;
    int i = int(floor(min(s, 4.999)));
    vec3 a = stops[0], b = stops[1];
    for (int k = 0; k < 5; k++) if (k == i) { a = stops[k]; b = stops[k + 1]; }
    return mix(a, b, fract(min(s, 4.999)));
  }
  void main() {
    float depth = (1.0 - clamp(vRadius, 0.0, 1.0)) * 6371.0;
    float t = temps[9];
    for (int k = 0; k < 9; k++) {
      if (depth >= depths[k] && depth <= depths[k + 1]) {
        t = mix(temps[k], temps[k + 1], (depth - depths[k]) / max(depths[k + 1] - depths[k], 0.001));
      }
    }
    vec3 colour = ramp(t / 5400.0);
    vec3 view = normalize(cameraPosition - vPosW);
    float facing = abs(dot(normalize(vNormalW), view));
    gl_FragColor = vec4(colour * (0.72 + 0.28 * facing), 1.0);
    #include <colorspace_fragment>
  }
`;
function HeatMaterial({ attach }: { attach: string }) {
  const uniforms = useMemo(
    () => ({
      depths: { value: GEOTHERM.map((g) => g[0]) },
      temps: { value: GEOTHERM.map((g) => g[1]) },
      stops: { value: HEAT_STOPS.map((c) => new THREE.Color(c)) },
    }),
    [],
  );
  return (
    <shaderMaterial
      attach={attach}
      uniforms={uniforms}
      vertexShader={heatVertex}
      fragmentShader={heatFragment}
      side={THREE.DoubleSide}
    />
  );
}

function Layer({
  index,
  inner,
  outer,
  opening,
  offset,
  heat,
  uniforms,
}: {
  uniforms: Record<string, { value: unknown }>;
  index: number;
  inner: number;
  outer: number;
  opening: number;
  offset: number;
  heat: boolean;
}) {
  const day = useTexture("/textures/earth-day.jpg"),
    bump = useTexture("/textures/earth-bump.jpg"),
    normal = useRockNormal();
  const g = useMemo(() => shellSection(inner, outer, opening), [inner, outer, opening]);
  useEffect(() => () => g.dispose(), [g]);
  const compact = useIsCompact();
  const labels = useLabControls((s) => s.labels);
  // A closed globe shows only the crust, so interior tags would point at the surface.
  const showTag = labels && (index === 0 || opening > 0.15);
  const l = layers[index],
    middle = (inner + outer) / 2,
    theta = [0.7, 1.08, 1.55, 2.05][index];
  day.colorSpace = THREE.SRGBColorSpace;
  day.wrapS = THREE.RepeatWrapping;
  day.anisotropy = 16;
  return (
    <group position={[-offset, 0, 0]}>
      <InspectHotspot name={l.name} note={l.note}>
        <mesh geometry={g} castShadow receiveShadow>
          {index < 2 ? (
            <>
              <meshStandardMaterial
                attach="material-0"
                color={index === 0 ? "#ffffff" : l.color}
                map={index === 0 ? day : null}
                bumpMap={index === 0 ? bump : null}
                bumpScale={0.003}
                normalMap={index === 1 ? normal : null}
                normalScale={new THREE.Vector2(0.2, 0.2)}
                roughness={l.rough}
                metalness={l.metal}
                side={THREE.DoubleSide}
              />
              {heat ? (
                <HeatMaterial attach="material-1" />
              ) : (
                <SectionMaterial
                  attach="material-1"
                  glsl={INTERIOR_GLSL}
                  uniforms={uniforms}
                  cacheKey="earth-interior-v1"
                  roughness={l.rough}
                  side={THREE.DoubleSide}
                />
              )}
            </>
          ) : (
            <>
              <CoreMaterial attach="material-0" solid={index === 3} />
              {heat ? (
                <HeatMaterial attach="material-1" />
              ) : (
                <SectionMaterial
                  attach="material-1"
                  glsl={INTERIOR_GLSL}
                  uniforms={uniforms}
                  cacheKey="earth-interior-v1"
                  roughness={index === 3 ? 0.45 : 0.35}
                  metalness={0.35}
                  side={THREE.DoubleSide}
                />
              )}
            </>
          )}
        </mesh>
      </InspectHotspot>
      {showTag && (
        <>
          <Line
            points={[
              [
                middle * Math.sin(theta) * Math.cos(opening / 2),
                middle * Math.cos(theta),
                -middle * Math.sin(theta) * Math.sin(opening / 2),
              ],
              [1.05, (1.5 - index) * 0.48, -1.2],
            ]}
            color={l.color}
            lineWidth={1}
          />
          <Tag
            pos={[1.05, (1.5 - index) * 0.48, -1.2]}
            text={compact ? String(index + 1) : l.name}
            title={`${index + 1} · ${l.name}`}
            note={l.note}
            occlude={false}
          />
        </>
      )}
    </group>
  );
}
function DepthRuler({ opening }: { opening: number }) {
  // Drawn just in front of the cut face that faces the default camera.
  const phi = -opening / 2 + 0.003,
    theta = 2.52,
    p = (r: number): [number, number, number] => [
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi),
    ];
  return (
    <group>
      {[410, 660].map((depth) => (
        <Line
          key={depth}
          points={Array.from({ length: 81 }, (_, i) => {
            const a = 0.18 + (i / 80) * (Math.PI - 0.36),
              r = 1 - depth / 6371;
            return [
              r * Math.sin(a) * Math.cos(phi),
              r * Math.cos(a),
              r * Math.sin(a) * Math.sin(phi),
            ] as [number, number, number];
          })}
          color="#bfac7f"
          transparent
          opacity={0.6}
          lineWidth={1}
          dashed
          dashSize={0.018}
          gapSize={0.016}
        />
      ))}
      <Line points={[p(0.99), p(0.17)]} color="#e7d9b5" lineWidth={1} />
      {[0, 660, 2891, 5150].map((depth) => {
        const q = p(1 - depth / 6371);
        return (
          <Line
            key={depth}
            points={[
              [q[0] - 0.022, q[1], q[2]],
              [q[0] + 0.022, q[1], q[2]],
            ]}
            color="#f3e3c7"
            lineWidth={1.5}
          />
        );
      })}
    </group>
  );
}
function WavePaths({ opening }: { opening: number }) {
  const t = useLabControls((s) => s.t),
    phi = -opening / 2 + 0.012;
  // Two radial transmission illustrations lie just above the exposed cut face.
  // They show permitted wave types, not refraction, travel times or shadow zones.
  const point = (r: number, theta: number): [number, number, number] => [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.cos(theta),
    r * Math.sin(theta) * Math.sin(phi),
  ];
  const p = [point(0.98, 0.85), point(0.03, 0.85)];
  const shear: [number, number, number][] = Array.from({ length: 65 }, (_, i) =>
    point(
      0.98 - (i / 64) * (0.98 - 0.548),
      1.45 + 0.025 * Math.sin((i / 64) * Math.PI * 8 - t * Math.PI * 8),
    ),
  );
  return (
    <group>
      <Line
        points={p}
        color="#7fd4ff"
        lineWidth={3}
        depthTest={false}
        depthWrite={false}
        renderOrder={10}
      />
      <Line
        points={shear}
        color="#efb474"
        lineWidth={3}
        depthTest={false}
        depthWrite={false}
        renderOrder={10}
      />
      <mesh position={point(0.98 - t * 0.95, 0.85)} renderOrder={10}>
        <sphereGeometry args={[0.023, 16, 16]} />
        <meshBasicMaterial color="#bdeaff" depthTest={false} />
      </mesh>
    </group>
  );
}
export default function EarthInterior() {
  const compact = useIsCompact();
  const { trueScale, explode, slice, params } = useLabControls();
  useLabTick(1 / 10);
  const radii = [1, 1 - (35 / 6371) * (trueScale ? 1 : 4), 3480 / 6371, 1221 / 6371, 0];
  const opening = slice * Math.PI * 0.95,
    waves = params.waves > 0.5;
  const [heat, setHeat] = useState(false);
  const t = useLabControls((st) => st.t);
  const uniforms = useSectionUniforms({ uTime: t * 40, uCrustR: radii[1] });
  return (
    <>
      <ScienceStudio
        slug="earth-interior"
        scale="Crust ×4 thickness · T restores a 35 km reference crust"
        trueScale="Radii to scale · 35 km reference crust · colours identify materials"
        camera={[3.8, 1.5, 3]}
      >
        <directionalLight position={[3, 2, 5]} intensity={2.2} color="#fff1db" />
        <directionalLight position={[-2, -1, 3]} intensity={0.8} color="#d8e8f5" />
        <group rotation={[0, -0.3, 0]}>
          {layers.map((l, i) => (
            <Layer
              key={l.name}
              index={i}
              outer={radii[i]}
              inner={radii[i + 1]}
              opening={opening}
              offset={explode * (3 - i) * 0.55}
              heat={heat}
              uniforms={uniforms}
            />
          ))}
          {slice > 0.05 && explode <= 0.01 && <DepthRuler opening={opening} />}{" "}
          {waves && slice > 0.05 && explode <= 0.01 && <WavePaths opening={opening} />}
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <div className="pointer-events-auto mb-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            aria-pressed={!heat}
            onClick={() => setHeat(false)}
            className={`min-h-11 rounded-lg border px-3 ${!heat ? "border-glacier text-glacier" : "border-white/15"}`}
          >
            {"Materials"}
          </button>
          <button
            type="button"
            aria-pressed={heat}
            onClick={() => setHeat(true)}
            className={`min-h-11 rounded-lg border px-3 ${heat ? "border-glacier text-glacier" : "border-white/15"}`}
          >
            {"Temperature"}
          </button>
          {heat && (
            <span className="flex items-center gap-2 text-xs">
              {"15 °C"}
              <span
                className="inline-block h-2.5 w-36 rounded-full"
                style={{ background: `linear-gradient(90deg, ${HEAT_STOPS.join(",")})` }}
              />
              {"≈5,400 °C"}
            </span>
          )}
        </div>
        {heat &&
          "Cut faces show approximate temperature with depth: it climbs steeply through the crust, slowly through the mantle, then rises sharply again near the core–mantle boundary. "}
        {compact && (
          <div className="mb-2 grid grid-cols-2 gap-1 text-left">
            {layers.map((layer, i) => (
              <span key={layer.name} style={{ borderBottom: `2px solid ${layer.color}` }}>
                {i + 1} · {layer.name}
              </span>
            ))}
          </div>
        )}
        {waves
          ? "Blue P waves pass through solid and liquid layers; amber S waves stop at the liquid outer core. Press Play to follow their motion."
          : "Earth's radius is 6,371 km. The outer-core boundary lies 3,480 km from the centre, and the inner core has a radius of 1,221 km."}
        {explode > 0.01 && " Reset layer spacing to compare depths."}
        <br />
        {waves
          ? "The radial paths illustrate transmission through different materials; they do not calculate the curved paths of seismic rays."
          : "Dashed mantle interfaces mark phase transitions at depths of 410 and 660 km. Colours and textures distinguish materials; the mottled mantle pattern is illustrative, not mapped plumes or slabs."}
      </ScienceReadout>
    </>
  );
}
