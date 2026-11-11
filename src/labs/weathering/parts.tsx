import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { usePreferences } from "@/lib/preferences";
import { useLabControls } from "@/lib/store/lab-controls";
import { Tag } from "../shared/kit";
import { SectionMaterial } from "../shared/section-material";
import { GrassPatch } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { NaturalTree } from "../shared/natural-world";
import { landscapeRandom } from "../shared/landscape-noise";
import {
  AIR_STONE,
  BLOCK,
  BLOCK_GLSL,
  BLOCK_Y,
  ION_COLORS,
  JOINT_RELIEF_GLSL,
  TANK,
  combine,
  jointBlockGeometry,
  jointRelief,
  jointRootGeometry,
  pittedSphereGeometry,
  rootCollarGeometry,
  surfaceRootGeometry,
  taperedTube,
} from "./outcrop";

const smooth = (x: number) => THREE.MathUtils.smoothstep(x, 0, 1);

type V3 = [number, number, number];

/** A label set beside a narrow feature, with a leader line to it, so it does not hide it. */
export function Callout({
  anchor,
  at,
  ...tag
}: {
  anchor: V3;
  at: V3;
  text: string;
  title?: string;
  note: string;
  tone?: "ice" | "glacier" | "moss";
}) {
  const labels = useLabControls((s) => s.labels),
    light = usePreferences((s) => s.resolvedTheme) === "light";
  return (
    <>
      {labels && (
        <Line points={[anchor, at]} color={light ? "#3c5a62" : "#d6e4e6"} lineWidth={1.5} />
      )}
      <Tag pos={at} occlude={false} {...tag} />
    </>
  );
}

/** One sandstone block of the outcrop, built around its center. */
export function OutcropBlock({
  side,
  half,
  frost,
  moss,
}: {
  side: 1 | -1;
  /** Half the joint width, scene units. */
  half: number;
  frost: number;
  moss: number;
}) {
  const geometry = useMemo(() => jointBlockGeometry(side), [side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({ uFrost: { value: 0 }, uMoss: { value: 0 }, uHalf: { value: 0 } }),
    [],
  );
  uniforms.uFrost.value = frost;
  uniforms.uMoss.value = moss;
  uniforms.uHalf.value = half;
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <SectionMaterial
        glsl={BLOCK_GLSL}
        uniforms={uniforms}
        cacheKey="weathering-outcrop"
        roughness={0.95}
        bump={1}
      />
    </mesh>
  );
}

/** Grass tufts and angular fallen fragments around the foot of a block, in block coordinates. */
export function BlockFoot({ side, frost }: { side: 1 | -1; frost: number }) {
  const { grass, scree } = useMemo(() => {
    const ground = -BLOCK_Y - 0.008,
      hx = BLOCK.width / 2,
      hz = BLOCK.depth / 2,
      grass: [number, number, number][] = [],
      scree: [number, number, number, number][] = [];
    const r = (i: number) => landscapeRandom(i * 7.31 + side * 3.7);
    for (let i = 0; i < 34; i++) {
      const out = 0.05 + 0.13 * r(i) ** 1.6,
        along = r(i + 50) * 2 - 1,
        face = i % 3;
      // Front, back and the outer side; the joint side stays clear.
      grass.push(
        face === 2
          ? [side * (hx + out), ground, along * (hz + 0.05)]
          : [side * (-0.34 + 0.395 * (along + 1)), ground, (face ? 1 : -1) * (hz + out)],
      );
    }
    for (let i = 0; i < 9; i++) {
      const out = 0.07 + 0.2 * r(i + 120),
        along = r(i + 160) * 2 - 1,
        size = 0.024 + 0.034 * r(i + 200);
      scree.push(
        i % 3 === 2
          ? [side * (-0.25 + 0.35 * (along + 1)), ground + size * 0.35, hz + out, size]
          : [side * (hx + out), ground + size * 0.35, along * 0.45, size],
      );
    }
    return { grass, scree };
  }, [side]);
  const grassColor = useMemo(
    () =>
      "#" +
      new THREE.Color("#6b8151").lerp(new THREE.Color("#cbd6d3"), frost * 0.75).getHexString(),
    [frost],
  );
  return (
    <>
      <GrassPatch positions={grass} height={0.13} color={grassColor} />
      <Scree points={scree} frost={frost} />
    </>
  );
}

function Scree({ points, frost }: { points: [number, number, number, number][]; frost: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    points.forEach(([x, y, z, size], i) => {
      o.position.set(x, y, z);
      o.rotation.set(i * 1.37, i * 2.399, i * 0.73);
      o.scale.set(size * 1.3, size * 0.75, size);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points]);
  const color = useMemo(
    () => new THREE.Color("#9c8569").lerp(new THREE.Color("#dfe8ea"), frost * 0.55),
    [frost],
  );
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </instancedMesh>
  );
}

const FILL_VERTEX = `uniform float uW,uY0,uH; varying vec3 fillPos;
${JOINT_RELIEF_GLSL}
`;
const FILL_FRAGMENT = `uniform float uW,uY0,uH; varying vec3 fillPos;
${JOINT_RELIEF_GLSL}
`;
const ICE = /* glsl */ `
float across=(fillPos.x-jointRelief(fillPos.y,fillPos.z))/uW+.5,along=fillPos.y+fillPos.z;
// Air is pushed ahead of the growing crystals, so the middle of the joint freezes milky.
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.97,.99,1.),(1.-smoothstep(.12,.34,abs(across-.5)))*.4);
vec2 bc=vec2(across*3.,along*52.),bi=floor(bc),bf=fract(bc)-.5;
float bh=fract(sin(dot(bi,vec2(12.9898,78.233)))*43758.5453);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),step(.84,bh)*(1.-smoothstep(.14,.3,length(bf*vec2(1.,.55))))*.75);
diffuseColor.rgb*=.94+.06*sin(along*140.+across*9.);`;
const WATER = /* glsl */ `
diffuseColor.rgb*=mix(.72,1.06,smoothstep(uY0,uY0+uH,fillPos.y));`;

/**
 * Water or ice filling the joint between two heights, as thick as the joint is wide. It follows
 * the joint's relief, so it fits between the walls however far apart they are.
 */
export function JointFill({
  kind,
  width,
  from,
  to,
}: {
  kind: "water" | "ice";
  width: number;
  from: number;
  to: number;
}) {
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 0.96, 1, 28, 18), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uW: { value: 0 }, uY0: { value: 0 }, uH: { value: 1 } }), []);
  uniforms.uW.value = width;
  uniforms.uY0.value = from;
  uniforms.uH.value = Math.max(1e-4, to - from);
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        FILL_VERTEX +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
float fillY=uY0+(transformed.y+.5)*uH;
transformed.x=transformed.x*uW+jointRelief(fillY,transformed.z);
transformed.y=fillY;
fillPos=transformed;`,
        );
      s.fragmentShader =
        FILL_FRAGMENT +
        s.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>\n${kind === "ice" ? ICE : WATER}`,
        );
    },
    [kind, uniforms],
  );
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      {kind === "ice" ? (
        <meshPhysicalMaterial
          color="#d3e7ee"
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transparent
          opacity={0.94}
          onBeforeCompile={compile}
          customProgramCacheKey={() => "weathering-fill-ice"}
        />
      ) : (
        <meshPhysicalMaterial
          color="#3b7d95"
          roughness={0.05}
          clearcoat={0.6}
          transparent
          opacity={0.84}
          onBeforeCompile={compile}
          customProgramCacheKey={() => "weathering-fill-water"}
        />
      )}
    </mesh>
  );
}

/** Patchy hoarfrost on the ground that spreads as `frost` rises from 0 to 1. */
export function GroundFrost({
  frost,
  height,
  width,
  depth,
}: {
  frost: number;
  height: (x: number, z: number) => number;
  width: number;
  depth: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, depth, 104, 80);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)) + 0.003);
    g.computeVertexNormals();
    return g;
  }, [height, width, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uFrost: { value: 0 } }), []);
  uniforms.uFrost.value = frost;
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "varying vec2 frostXZ;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfrostXZ=position.xz;",
        );
      s.fragmentShader =
        `uniform float uFrost; varying vec2 frostXZ;
float fHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(fHash(i),fHash(i+vec2(1.,0.)),f.x),mix(fHash(i+vec2(0.,1.)),fHash(i+vec2(1.,1.)),f.x),f.y);}
` +
        s.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float fn=fNoise(frostXZ*13.)*.6+fNoise(frostXZ*41.)*.4;
// Patches spread as it gets colder; within them the grass shows through the crystals.
float fine=fNoise(frostXZ*170.);
diffuseColor.a*=smoothstep(.95-uFrost*.75,1.12-uFrost*.75,fn)*(.5+.4*fine);
diffuseColor.rgb*=.92+.14*fine;`,
        );
    },
    [uniforms],
  );
  if (frost <= 0.001) return null;
  return (
    <mesh geometry={geometry} receiveShadow renderOrder={1}>
      <meshStandardMaterial
        color="#eef5f7"
        roughness={0.7}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "weathering-ground-frost"}
      />
    </mesh>
  );
}

function compileBark(s: THREE.WebGLProgramParametersWithUniforms) {
  s.vertexShader =
    "varying vec2 barkUv;\n" +
    s.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nbarkUv=uv;");
  s.fragmentShader =
    "varying vec2 barkUv;\n" +
    s.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
float ridge=sin(barkUv.y*37.7+sin(barkUv.x*28.)*.9);
float bn=fract(sin(dot(floor(vec2(barkUv.x*70.,barkUv.y*26.)),vec2(12.9898,78.233)))*43758.5453);
diffuseColor.rgb*=.84+.1*ridge+.12*bn;`,
    );
}
function BarkMaterial({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.93}
      onBeforeCompile={compileBark}
      customProgramCacheKey={() => "weathering-bark"}
    />
  );
}

/** Roots across one block's top, over its edge and down its faces into the soil. */
export function SurfaceRoots({ side, growth }: { side: 1 | -1; growth: number }) {
  const geometry = useMemo(() => surfaceRootGeometry(side, growth), [side, growth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <BarkMaterial color="#77695a" />
    </mesh>
  );
}

/** Roots in the joint: a main root squeezed flat between the walls, two branches toward the
 * open faces, and fine rootlets exploring further down. */
export function JointRoots({ gap }: { gap: number }) {
  const geometry = useMemo(() => {
    const half = gap / 2,
      parts = [
        jointRootGeometry(
          [
            [1.45, 0],
            [1.2, 0.03],
            [0.9, -0.02],
            [0.55, -0.09],
            [0.22, -0.14],
            [0.06, -0.16],
          ],
          (u) => 0.025 + 0.41 * (1 - u) ** 1.3,
          (u) => half * (0.95 - 0.35 * u),
        ),
        jointRootGeometry(
          [
            [1.12, 0.2],
            [0.9, 0.34],
            [0.62, 0.43],
            [0.34, 0.46],
          ],
          (u) => 0.012 + 0.05 * (1 - u),
          (u) => half * (0.82 - 0.3 * u),
        ),
        jointRootGeometry(
          [
            [1.02, -0.22],
            [0.75, -0.35],
            [0.45, -0.42],
            [0.25, -0.44],
          ],
          (u) => 0.012 + 0.045 * (1 - u),
          (u) => half * (0.8 - 0.3 * u),
        ),
      ];
    for (const [z0, phase] of [
      [-0.1, 0.3],
      [-0.2, 1.9],
      [0.04, 3.1],
      [0.28, 4.4],
    ]) {
      const points = Array.from({ length: 7 }, (_, k) => {
        const y = 0.46 - k * 0.07,
          z = z0 + 0.06 * Math.sin(k * 0.9 + phase);
        return new THREE.Vector3(jointRelief(y, z), y, z);
      });
      parts.push(taperedTube(points, (u) => 0.007 * (1 - u) + 0.0025, 24, 5));
    }
    return combine(parts);
  }, [gap]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <BarkMaterial color="#7b6b57" />
    </mesh>
  );
}

/** Each tree instance is scaled by this factor in PlantStand (seed 8, first instance). */
const TREE_FACTOR = 0.88 + 0.24 * Math.sin(8) ** 2;

/** A young tree rooted in the joint, with a lobed root flare that bridges it. */
export function JointTree({ gap, growth }: { gap: number; growth: number }) {
  const scale = 0.45 + 0.2 * growth,
    trunk = 0.12 * scale * TREE_FACTOR;
  const collar = useMemo(
    () => rootCollarGeometry(gap / 2 + 0.1, 0.17 + trunk * 0.6, trunk * 0.97, 0.22),
    [gap, trunk],
  );
  useEffect(() => () => collar.dispose(), [collar]);
  return (
    <>
      <mesh geometry={collar} position={[0, 1.36, 0]} castShadow receiveShadow>
        <BarkMaterial color="#6a5d4a" />
      </mesh>
      <NaturalTree position={[0, 1.46, 0]} kind="broadleaf" scale={scale} seed={8} />
      {/* The fully grown tree, so the framing leaves room for it from the start. */}
      <mesh visible={false} userData={{ fitProxy: true }} position={[0, 2.35, 0]}>
        <boxGeometry args={[1.5, 1.9, 1.5]} />
      </mesh>
    </>
  );
}

const WOOD_GLSL = /* glsl */ `
vec3 sectionColour(vec3 p,vec3 w){
  float ring=fract(p.z*9.+p.y*30.+sNoise(vec2(p.x*1.2,p.z*2.5))*2.4);
  vec3 c=mix(vec3(.66,.5,.33),vec3(.55,.4,.26),smoothstep(.15,.75,ring)*(1.-smoothstep(.8,1.,ring)));
  return c*mix(.93,1.05,sNoise(vec2(p.x*30.,p.z*260.)));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/** The wooden lab bench the tank stands on. */
export function LabBench() {
  return (
    <mesh position={[0, -0.07, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.9, 0.14, 2.3]} />
      <SectionMaterial glsl={WOOD_GLSL} cacheKey="weathering-bench" roughness={0.88} />
    </mesh>
  );
}

/** The glass tank and the water in it. */
export function GlassTank() {
  const light = usePreferences((s) => s.resolvedTheme) === "light";
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)),
    [],
  );
  useEffect(() => () => edges.dispose(), [edges]);
  const g = TANK.glass,
    panes: [[number, number, number], [number, number, number]][] = [
      [
        [0, g / 2, 0],
        [TANK.w, g, TANK.d],
      ],
      [
        [0, TANK.h / 2, TANK.d / 2 - g / 2],
        [TANK.w, TANK.h, g],
      ],
      [
        [0, TANK.h / 2, -TANK.d / 2 + g / 2],
        [TANK.w, TANK.h, g],
      ],
      [
        [TANK.w / 2 - g / 2, TANK.h / 2, 0],
        [g, TANK.h, TANK.d - 2 * g],
      ],
      [
        [-TANK.w / 2 + g / 2, TANK.h / 2, 0],
        [g, TANK.h, TANK.d - 2 * g],
      ],
    ];
  return (
    <group>
      {panes.map(([position, size], i) => (
        <mesh key={i} position={position} renderOrder={3}>
          <boxGeometry args={size} />
          <meshPhysicalMaterial
            color="#cfe3e8"
            transparent
            opacity={0.06}
            roughness={0.05}
            depthWrite={false}
          />
        </mesh>
      ))}
      <lineSegments geometry={edges} position={[0, TANK.h / 2, 0]}>
        <lineBasicMaterial
          color={light ? "#46656d" : "#d3e8eb"}
          transparent
          opacity={light ? 0.75 : 0.6}
        />
      </lineSegments>
      <mesh position={[0, (g + TANK.water - 0.006) / 2, 0]} renderOrder={1}>
        <boxGeometry args={[TANK.w - 2 * g, TANK.water - g - 0.006, TANK.d - 2 * g]} />
        <meshPhysicalMaterial
          color="#4f98ab"
          transparent
          opacity={0.15}
          roughness={0.1}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, TANK.water, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[TANK.w - 2 * g, TANK.d - 2 * g]} />
        <FlowWaterMaterial color="#5aa2b4" opacity={0.2} speed={0.04} />
      </mesh>
    </group>
  );
}

const LIMESTONE_GLSL = /* glsl */ `
uniform float uEtch;
vec3 sectionColour(vec3 p,vec3 w){
  float g=grain(p.xy+p.zy),b=fract(p.y*5.+.1*sNoise(vec2(p.x*2.,p.z*2.)));
  vec3 c=mix(vec3(.86,.83,.75),vec3(.78,.75,.67),sNoise(vec2(p.x+p.z,p.y)*6.));
  // Faint bedding that fades in and out around the clast.
  c*=mix(1.-.07*sNoise(vec2(p.x+p.z,p.y)*3.),1.,smoothstep(0.,.06,b))*mix(.94,1.05,g);
  c=mix(c,vec3(.95,.93,.88),smoothstep(.8,.86,sNoise(vec2(p.x*40.+p.z*30.,p.y*40.)))*.6);
  // Etched calcite turns chalky; the pit floors are freshest and palest.
  float pit=1.-length(p);
  c=mix(c,vec3(.94,.92,.87),uEtch*.25+smoothstep(.02,.05,pit)*.45);
  return c*(1.-.2*smoothstep(.05,.12,pit));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}
// Etching roughens the surface into a sugary texture of grains.
float sectionBump(vec3 p,vec3 w){
  // Three projections, so no direction on the sphere is left smooth.
  vec2 q1=vec2(p.x+p.y*.6,p.z-p.y*.4),q2=vec2(p.y+p.z*.5,p.x-p.z*.7),q3=vec2(p.z+p.x*.4,p.y-p.x*.6);
  float fine=(sNoise(q1*30.)+sNoise(q2*30.+4.)+sNoise(q3*30.+9.))/3.;
  float coarse=(sNoise(q1*9.+2.)+sNoise(q2*9.+6.))/2.;
  return (.0012+.0035*uEtch)*fine+.0015*coarse;
}`;

/** A limestone (calcite) sphere etched into solution pits as dissolution goes on. */
export function PittedLimestone({ radius, pitting }: { radius: number; pitting: number }) {
  const geometry = useMemo(() => pittedSphereGeometry(pitting), [pitting]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uEtch: { value: 0 } }), []);
  uniforms.uEtch.value = pitting;
  return (
    <mesh
      geometry={geometry}
      position={[0, TANK.glass + radius * 0.97, 0]}
      scale={radius}
      castShadow
      receiveShadow
    >
      <SectionMaterial
        glsl={LIMESTONE_GLSL}
        uniforms={uniforms}
        cacheKey="weathering-limestone-pits"
        roughness={0.9}
        bump={1}
      />
    </mesh>
  );
}

/** Dissolved fraction of the sphere's mass is 1 − (1 − 0.65t)³; each dot appears in turn. */
const IONS = Array.from({ length: 72 }, (_, i) => {
  const f = (i + 0.5) / 72,
    born = (1 - Math.cbrt(1 - f)) / 0.65,
    y = 1 - 2 * landscapeRandom(i + 11),
    a = landscapeRandom(i + 23) * Math.PI * 2,
    dir = new THREE.Vector3(
      Math.cos(a) * Math.sqrt(1 - y * y),
      y,
      Math.sin(a) * Math.sqrt(1 - y * y),
    ),
    center = new THREE.Vector3(0, TANK.glass + 0.6, 0),
    home = new THREE.Vector3(
      (landscapeRandom(i + 37) * 2 - 1) * 1.0,
      0.1 + landscapeRandom(i + 41) * 1.14,
      (landscapeRandom(i + 53) * 2 - 1) * 0.78,
    );
  // Keep each dot's final place outside the starting sphere.
  if (home.distanceTo(center) < 0.72) home.sub(center).setLength(0.72).add(center);
  home.y = THREE.MathUtils.clamp(home.y, 0.08, TANK.water - 0.06);
  return { born, dir, home, phase: landscapeRandom(i + 67) * Math.PI * 2, calcium: i % 3 === 0 };
});

/**
 * Dissolved ions as symbols: one calcium for every two bicarbonate dots. They appear at the
 * sphere's surface as its mass goes into solution and then spread through the water.
 */
export function IonCloud({ t }: { t: number }) {
  const ref = useRef<THREE.InstancedMesh>(null),
    tmp = useMemo(
      () => ({
        m: new THREE.Matrix4(),
        p: new THREE.Vector3(),
        s: new THREE.Vector3(),
        q: new THREE.Quaternion(),
      }),
      [],
    );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const ca = new THREE.Color(ION_COLORS.calcium),
      hco = new THREE.Color(ION_COLORS.bicarbonate);
    IONS.forEach((ion, i) => mesh.setColorAt(i, ion.calcium ? ca : hco));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = clock.elapsedTime,
      { m, p, s, q } = tmp;
    IONS.forEach((ion, i) => {
      const age = t - ion.born;
      if (age < 0) s.setScalar(0);
      else {
        const r = 0.6 * (1 - 0.65 * ion.born),
          k = smooth(age / 0.14);
        p.copy(ion.dir).multiplyScalar(r + 0.03);
        p.y += TANK.glass + r;
        p.lerp(ion.home, k);
        p.x += 0.03 * k * Math.sin(time * 0.6 + ion.phase);
        p.y += 0.02 * k * Math.sin(time * 0.45 + ion.phase * 1.7);
        p.z += 0.03 * k * Math.cos(time * 0.5 + ion.phase * 0.6);
        s.setScalar(1);
      }
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, IONS.length]} frustumCulled={false}>
      <sphereGeometry args={[0.026, 12, 10]} />
      <meshStandardMaterial roughness={0.45} />
    </instancedMesh>
  );
}

/** An air stone fed by a tube over the rim, releasing carbon dioxide bubbles. */
export function CarbonDioxideBubbler() {
  const tube = useMemo(() => {
    const s = AIR_STONE,
      path = [
        [s.x, s.y + 0.06, s.z],
        [s.x - 0.12, s.y + 0.16, s.z - 0.14],
        [-1.06, 0.5, -0.82],
        [-1.08, 1.45, -0.84],
        [-1.1, 1.66, -0.84],
        [-1.2, 1.73, -0.84],
        [-1.29, 1.62, -0.84],
        [-1.32, 1.2, -0.84],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 80, 0.012, 8, false);
  }, []);
  useEffect(() => () => tube.dispose(), [tube]);
  const ref = useRef<THREE.InstancedMesh>(null),
    count = 22,
    tmp = useMemo(
      () => ({
        m: new THREE.Matrix4(),
        p: new THREE.Vector3(),
        s: new THREE.Vector3(),
        q: new THREE.Quaternion(),
      }),
      [],
    );
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = clock.elapsedTime,
      rise = TANK.water - AIR_STONE.y - 0.1;
    for (let i = 0; i < count; i++) {
      const h = (time * 0.32 + (i / count) * rise * 1.1) % (rise * 1.1),
        y = AIR_STONE.y + 0.08 + h,
        size = (0.011 + 0.012 * ((i * 7) % 5) * 0.25) * (0.75 + 0.35 * (h / rise));
      tmp.p.set(
        AIR_STONE.x + 0.03 * Math.sin(time * 2.6 + i * 1.7) * (h / rise),
        y,
        AIR_STONE.z + 0.03 * Math.cos(time * 2.2 + i * 2.3) * (h / rise),
      );
      tmp.s.setScalar(h < rise ? size : 0);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh position={[AIR_STONE.x, AIR_STONE.y + 0.03, AIR_STONE.z]} castShadow>
        <cylinderGeometry args={[0.07, 0.075, 0.06, 20]} />
        <meshStandardMaterial color="#8d8a83" roughness={1} />
      </mesh>
      <mesh geometry={tube}>
        <meshPhysicalMaterial color="#e5ece7" transparent opacity={0.7} roughness={0.35} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshPhysicalMaterial
          color="#f2fbff"
          transparent
          opacity={0.55}
          roughness={0.05}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
