import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { waveExperiment } from "@/lib/seismic-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { WaterRibbon } from "../shared/geomorphic-terrain";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
import { PlantStand } from "../shared/natural-world";

/** 1 scene unit = 50 km. The block is cut through the hypocentre along z = 0. */
const KM = 1 / 50,
  WIDTH = 7.2,
  DEPTH = 2.6,
  BASE = -1.7,
  Z0 = -DEPTH / 2,
  TAN_DIP = Math.tan(Math.PI / 3),
  STATION: [number, number] = [Math.cos(0.42), -Math.sin(0.42)];

const river = (z: number) => -2.35 + 0.22 * Math.sin(z * 1.9 + 0.6);

/** Static surface relief, exaggerated ×10 beside the 50 km grid; the hanging wall stands up. */
function surface(x: number, z: number, faultX: number, relief: number) {
  const hills = 0.07 * (fbm(x * 0.7 + 3, z * 0.7) - 0.5) + 0.025 * (fbm(x * 2.4, z * 2.4) - 0.5),
    scarp = 0.035 * THREE.MathUtils.smoothstep(x - faultX - 0.015 * Math.sin(z * 4), -0.03, 0.03),
    valley = -0.05 * Math.exp(-(((x - river(z)) / 0.16) ** 2));
  return relief * (0.04 + hills + scarp + valley);
}

/** Exaggerated vertical ground motion: P and S arrivals, then the slower surface-wave ring. */
function shaking(rho: number, w: ReturnType<typeof waveExperiment>) {
  const p = w.pSurfaceRadius * KM,
    s = w.sSurfaceRadius * KM,
    r = w.surfaceRadius * KM,
    decay = 1 / Math.sqrt(0.6 + rho);
  let y = 0;
  if (p > rho) y += 0.006 * Math.exp(-(p - rho) * 2.5) * Math.sin((p - rho) * 34);
  if (s > rho) y += 0.016 * Math.exp(-(s - rho) * 1.6) * Math.sin((s - rho) * 24);
  if (r > 0) y += 0.05 * Math.exp(-(((rho - r) / 0.24) ** 2)) * Math.sin((rho - r) * 15);
  return y * decay;
}

const crustVertex = (s: THREE.WebGLProgramParametersWithUniforms) => {
  s.vertexShader =
    "varying vec3 crustWorld;\n" +
    s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ncrustWorld = (modelMatrix * vec4(transformed, 1.)).xyz;",
    );
};

/** Cut faces: sediment, granitic upper crust, mafic lower crust and mantle, offset across the
 * fault, with the P (amber) and S (blue) fronts drawn where their spheres meet each face. */
function CrustMaterial({
  depth,
  p,
  s,
  faultX,
}: {
  depth: number;
  p: number;
  s: number;
  faultX: number;
}) {
  const uniforms = useMemo(
    () => ({
      uDepth: { value: depth },
      uP: { value: p },
      uS: { value: s },
      uFault: { value: faultX },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the uniforms object must stay stable for the compiled shader; its values are updated below on every render
    [],
  );
  uniforms.uDepth.value = depth;
  uniforms.uP.value = p;
  uniforms.uS.value = s;
  uniforms.uFault.value = faultX;
  const compile = useMemo(
    () => (sh: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(sh.uniforms, uniforms);
      crustVertex(sh);
      sh.fragmentShader =
        `varying vec3 crustWorld; uniform float uDepth, uP, uS, uFault;
float cHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(cHash(i),cHash(i+vec2(1.,0.)),f.x),mix(cHash(i+vec2(0.,1.)),cHash(i+vec2(1.,1.)),f.x),f.y);}
float faultDistance(vec3 w){return abs(w.x-(uFault-w.y/1.7320508))*.8660254;}
vec3 crustColour(vec3 w){
  float xf=uFault-w.y/1.7320508, hanging=step(xf,w.x);
  float d=-(w.y-hanging*.05)+.02*sin(w.x*1.7+w.z*1.3)+.012*sin(w.x*4.3-w.z*2.);
  vec2 q=vec2(w.x+w.z,w.y);
  float grain=.6*cNoise(q*70.)+.4*cNoise(q*16.);
  vec3 c;
  if(d<.07){c=mix(vec3(.72,.56,.36),vec3(.55,.40,.27),step(.5,fract(d*95.)))*(.9+.2*grain);}
  else if(d<.36){c=mix(vec3(.66,.52,.47),vec3(.45,.38,.38),grain);}
  else if(d<.70){c=mix(vec3(.33,.36,.41),vec3(.23,.26,.31),grain);}
  else{c=mix(vec3(.34,.42,.25),vec3(.24,.31,.18),grain);}
  float boundary=min(min(abs(d-.07),abs(d-.36)),abs(d-.70));
  c*=mix(.62,1.,smoothstep(0.,.01,boundary));
  float gouge=(1.-smoothstep(.005,.016,faultDistance(w)))*step(-1.6,w.y);
  c=mix(c,vec3(.28,.13,.10),gouge);
  return c;
}
vec3 waveGlow(vec3 w){
  float r=length(w-vec3(0.,-uDepth,0.));
  vec3 col=vec3(0.);
  if(uP>0.){
    col+=vec3(1.,.6,.22)*(1.3*exp(-((r-uP)*(r-uP))/.000196)+(r<uP?.28*exp(-(uP-r)*3.5)*(.5+.5*cos((uP-r)*70.)):0.));
  }
  if(uS>0.){
    col+=vec3(.3,.72,1.)*(1.3*exp(-((r-uS)*(r-uS))/.000256)+(r<uS?.32*exp(-(uS-r)*3.)*(.5+.5*cos((uS-r)*42.)):0.));
  }
  float slipPatch=(1.-smoothstep(.2,.32,r))*(1.-smoothstep(.01,.03,faultDistance(w)));
  col+=vec3(1.,.3,.12)*slipPatch*.9;
  return col;
}
` + sh.fragmentShader;
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\ndiffuseColor.rgb *= crustColour(crustWorld);",
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += waveGlow(crustWorld);",
        );
    },
    [uniforms],
  );
  return (
    <meshStandardMaterial
      attach="material-1"
      color="white"
      roughness={0.92}
      onBeforeCompile={compile}
      customProgramCacheKey={() => "earthquake-crust-v1"}
    />
  );
}

function Wavefront({ radius, depth, color }: { radius: number; depth: number; color: string }) {
  if (radius < 0.001) return null;
  const start = radius > depth ? Math.acos(depth / radius) : 0;
  // Faint shells show the same fronts in the cut-away half (z > 0) of the block.
  return (
    <mesh position={[0, -depth, 0]}>
      <sphereGeometry args={[radius, 96, 48, 0, Math.PI, start, Math.PI - start]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.07}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Circle where a front meets the ground, drawn over the half that remains (z ≤ 0). */
function SurfaceRing({
  radius,
  color,
  height,
  width = 2,
}: {
  radius: number;
  color: string;
  height: (x: number, z: number) => number;
  width?: number;
}) {
  if (radius < 0.01) return null;
  const points = Array.from({ length: 121 }, (_, i): [number, number, number] => {
    const a = Math.PI + (i / 120) * Math.PI,
      x = THREE.MathUtils.clamp(radius * Math.cos(a), -WIDTH / 2, WIDTH / 2),
      z = Math.max(-DEPTH, radius * Math.sin(a));
    return [x, height(x, z) + 0.02, z];
  });
  return <Line points={points} color={color} lineWidth={width} />;
}

export default function Earthquakes() {
  const { t, params, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const seconds = t * 25,
    depth = params.depth ?? 20,
    d = depth * KM,
    w = waveExperiment(seconds, depth),
    faultX = -d / TAN_DIP,
    relief = trueScale ? 0.1 : 1,
    motionScale = trueScale ? 0 : 1;
  const ground = useMemo(
    () => (x: number, z: number) => surface(x, z, faultX, relief),
    [faultX, relief],
  );
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry((x, z) => ground(x, z + Z0), WIDTH, DEPTH, 180, BASE);
    g.translate(0, 0, Z0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        col = farmland(x, z),
        wood = fbm(x * 1.3 + 9, z * 1.3);
      if (wood > 0.66) col.lerp(new THREE.Color("#4c6a3a"), 0.85);
      if (Math.abs(x - river(z)) < 0.1) col.lerp(new THREE.Color("#5f7d48"), 0.8);
      if (Math.abs(x - faultX - 0.015 * Math.sin(z * 4)) < 0.035)
        col.lerp(new THREE.Color("#8d7253"), 0.75);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    g.userData.rest = Float32Array.from(p.array as Float32Array);
    return g;
  }, [ground, faultX]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const p = geometry.attributes.position,
      rest = geometry.userData.rest as Float32Array;
    for (let i = 0; i < p.count; i++) {
      const y = rest[i * 3 + 1];
      if (y <= BASE + 1e-4) continue;
      const x = rest[i * 3],
        z = rest[i * 3 + 2];
      p.setY(i, y + motionScale * shaking(Math.hypot(x, z), w));
    }
    p.needsUpdate = true;
    geometry.computeVertexNormals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- w is a new object each render from waveExperiment(seconds, depth), both of which are listed
  }, [geometry, seconds, depth, motionScale]);

  const towns = useMemo(
    () => [
      ...settlement(STATION[0] + 0.2, STATION[1] - 0.35, 26, 0.42, 0.06, 3, (x, z) => z < -0.06),
      ...settlement(-1.25, -1.35, 14, 0.32, 0.055, 9),
      ...settlement(2.55, -1.75, 10, 0.28, 0.05, 5),
    ],
    [],
  );
  const motion = useMemo(
    () =>
      (x: number, z: number): [number, number, number] => {
        const rho = Math.hypot(x, z),
          e = 0.02,
          k = motionScale,
          lift = k * shaking(rho, w),
          slope = (k * (shaking(rho + e, w) - shaking(rho - e, w))) / (2 * e),
          a = Math.atan2(z, x);
        return [lift, slope * Math.sin(a) * 0.9, -slope * Math.cos(a) * 0.9];
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- w is a new object each render from waveExperiment(seconds, depth), both of which are listed
    [seconds, depth, motionScale],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 120 && i < 900; i++) {
      const x = -3.4 + 6.8 * ((i * 0.618034) % 1),
        z = -0.1 - 2.4 * ((i * 0.7548777) % 1);
      if (fbm(x * 1.3 + 9, z * 1.3) > 0.68 && Math.abs(x - river(z)) > 0.08)
        out.push([x, ground(x, z) - 0.005, z]);
    }
    return out;
  }, [ground]);
  const riverPath = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i): [number, number, number] => {
        const z = -0.02 - (i / 59) * (DEPTH - 0.04),
          x = river(z);
        return [x, ground(x, z) + 0.006, z];
      }),
    [ground],
  );
  const station: [number, number, number] = [
    STATION[0],
    ground(STATION[0], STATION[1]),
    STATION[1],
  ];
  const trace = Array.from({ length: 161 }, (_, i): [number, number, number] => {
    const time = seconds - 8 + (i / 160) * 8,
      pt = time - w.pArrival,
      st = time - w.sArrival,
      amp =
        (pt > 0 ? 0.05 * Math.exp(-pt / 4) * Math.sin(pt * 10) : 0) +
        (st > 0 ? 0.11 * Math.exp(-st / 5) * Math.sin(st * 6) : 0);
    return [-0.56 + (i / 160) * 1.12, amp, 0.02];
  });
  return (
    <>
      <ScienceStudio
        slug="earthquakes"
        camera={[2.2, 4.4, 6.2]}
        ground={false}
        scale="1 scene unit = 50 km · surface relief ×10 · ground motion hugely exaggerated · buildings not to scale"
        trueScale="Relief at true scale and ground motion hidden · P = 6 km/s · S = 3.5 km/s in a uniform solid"
      >
        <mesh geometry={geometry} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
          <CrustMaterial depth={d} p={w.pRadius * KM} s={w.sRadius * KM} faultX={faultX} />
        </mesh>
        <WaterRibbon path={riverPath} width={0.07} color="#4f93ad" />
        <PlantStand kind="broadleaf" positions={trees} scale={0.07} seed={4} />
        <Buildings items={towns} ground={ground} motion={motion} revision={seconds} />
        <Wavefront radius={w.pRadius * KM} depth={d} color="#edb56f" />
        <Wavefront radius={w.sRadius * KM} depth={d} color="#79c2e0" />
        <SurfaceRing radius={w.pSurfaceRadius * KM} color="#e7a352" height={ground} width={1.6} />
        <SurfaceRing radius={w.sSurfaceRadius * KM} color="#4fa6d6" height={ground} width={1.8} />
        <SurfaceRing radius={w.surfaceRadius * KM} color="#b07cc2" height={ground} width={3} />
        <Line
          points={[
            [0, -d, 0.004],
            [0, ground(0, 0) + 0.01, 0.004],
          ]}
          color="#f3efe2"
          dashed
          dashSize={0.05}
          gapSize={0.035}
        />
        <Line
          points={[
            [0, -d, 0],
            [station[0], station[1] + 0.03, station[2]],
          ]}
          color="#f3efe2"
          lineWidth={0.8}
          dashed
          dashSize={0.04}
          gapSize={0.05}
        />
        <mesh position={[0, -d, 0.01]}>
          <sphereGeometry args={[0.06, 24, 16]} />
          <meshBasicMaterial color="#ffd27a" />
        </mesh>
        <mesh position={[0, ground(0, 0) + 0.025, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.1, 32, 1, Math.PI, Math.PI]} />
          <meshBasicMaterial color="#fff3d6" side={THREE.DoubleSide} />
        </mesh>
        <group position={station}>
          <mesh position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[0.16, 0.06, 0.16]} />
            <meshStandardMaterial color="#c9c4b4" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 10]} />
            <meshStandardMaterial color="#9ea3a6" metalness={0.5} roughness={0.4} />
          </mesh>
          <group position={[0, 0.62, 0]}>
            <mesh position={[0, 0, -0.02]}>
              <boxGeometry args={[1.24, 0.5, 0.03]} />
              <meshStandardMaterial color="#f4efe2" roughness={0.9} />
            </mesh>
            {[-0.15, 0, 0.15].map((y) => (
              <Line
                key={y}
                points={[
                  [-0.58, y, 0.0],
                  [0.58, y, 0.0],
                ]}
                color="#d5cbb5"
                lineWidth={0.6}
              />
            ))}
            <Line points={trace} color="#24333a" lineWidth={1.6} />
          </group>
        </group>
        <Tag
          pos={[-0.75, ground(0, 0) + 0.35, 0.25]}
          text="Epicentre"
          note="The epicentre is the point on the surface vertically above the hypocentre. It is not necessarily where the inclined fault reaches the surface."
          occlude={false}
        />
        <Tag
          pos={[-0.55, -d - 0.12, 0.05]}
          text={`Hypocentre · ${depth.toFixed(0)} km`}
          tone="magma"
          note="Rupture starts at the focus (hypocentre); the red patch shows part of the fault slipping. Here the waves spread as spheres from one point through uniform rock; real ruptures spread across a whole fault surface."
          occlude={false}
        />
        <Tag
          pos={[station[0] + 0.85, station[1] + 0.95, station[2]]}
          text="Seismometer · 50 km"
          note="The station is 50 km horizontally from the epicentre, so the straight-line distance from the focus is √(depth² + 50²) km. Its drum record shows the P-wave arrival, then the larger S-wave."
          occlude={false}
        />
        <Tag
          pos={[faultX - 0.1, ground(faultX, -2.3) + 0.12, -2.3]}
          text="Fault scarp"
          tone="fault"
          note="The fault dips at 60°. Repeated earthquakes have lifted the hanging wall, offsetting the rock layers in the cut face and leaving a small step at the surface. Offsets are schematic."
          occlude={false}
        />
        <Tag
          pos={[-3.0, -0.7, 0.05]}
          text="Moho · 35 km"
          note="Layers: sedimentary cover, granitic upper crust, denser lower crust, then the olive-green mantle below the Moho. Thicknesses are typical continental values, drawn at the scene's scale of 1 unit = 50 km."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {seconds.toFixed(1)} {"s · "}
        <span className="text-sandstone">
          {"P: "}
          {w.pRadius.toFixed(1)} {"km"}
        </span>{" "}
        ·{" "}
        <span className="text-glacier">
          {"S: "}
          {w.sRadius.toFixed(1)} {"km"}
        </span>
        {". Station arrivals: P "}
        {w.pArrival.toFixed(2)} {"s; S "}
        {w.sArrival.toFixed(2)} {"s."}
        <br />
        {
          "The cut face shows each wave front where it crosses the rock; faint shells show the cut-away half. The violet ring is the slower surface wave, which causes most of the shaking that sways the buildings."
        }
      </ScienceReadout>
    </>
  );
}
