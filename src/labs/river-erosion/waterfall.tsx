import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLabFrame } from "@/labs/tick";
import { waterfallLip } from "@/lib/fluvial-science";
import {
  CAP_BASE,
  OVERHANG,
  channelZ,
  gorgeDistance,
  gorgeFloor,
  gorgeHalfWidth,
  waterfallTerrain,
} from "@/lib/waterfall-science";
import { Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { SectionMaterial } from "../shared/section-material";
import { cliffFaceGlsl } from "../shared/land-section";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { Tag } from "../shared/kit";
import { PlantStand } from "../shared/natural-world";
import { CAP_ROCK } from "./rocks";
import { useT } from "@/lib/i18n";

const smooth = THREE.MathUtils.smoothstep;
const GRASS = new THREE.Color("#6f8c4a"),
  MOOR = new THREE.Color("#8a8a55"),
  SANDSTONE = new THREE.Color("#b49c78"),
  TALUS = new THREE.Color("#a39683"),
  GRAVEL = new THREE.Color("#7d7365"),
  POOL_BED = new THREE.Color("#4f4a42");

/** Ground colors: grass on the plateau, bare sandstone along the river, talus and gravel below. */
function groundColor(x: number, y: number, z: number, progress: number) {
  const lip = waterfallLip(progress),
    inside = -gorgeDistance(x, z, progress),
    c = GRASS.clone().lerp(MOOR, 0.5 * noise(x * 1.2, z * 1.2 + 3));
  // The river has stripped the soil from its channel and from the rock near the lip.
  if (x < lip + 0.2) c.lerp(SANDSTONE, 1 - smooth(Math.abs(z), 0.3, 0.42));
  c.lerp(SANDSTONE, smooth(inside, -0.1, -0.02) * 0.8);
  if (inside > 0.24) {
    c.copy(TALUS).multiplyScalar(0.85 + 0.3 * noise(x * 9, z * 9));
    const floor = gorgeFloor(x, z, progress);
    c.lerp(GRAVEL, 1 - smooth(y - floor, 0.02, 0.08));
    c.lerp(POOL_BED, smooth(floor, 0.36, 0.26) * (1 - smooth(y - floor, 0.01, 0.05)));
  }
  return c.getStyle();
}

/**
 * The resistant cap overhanging the undercut mudstone at the head of the gorge: a ledge of jointed
 * blocks between the rim and the lip, which collapses block by block as the fall retreats.
 */
function CapLedge({ progress }: { progress: number }) {
  const lip = waterfallLip(progress),
    head = gorgeHalfWidth(lip, progress),
    center = lip + head;
  const geometry = useMemo(() => {
    const na = 72,
      position: number[] = [],
      color: number[] = [],
      index: number[] = [],
      top = new THREE.Color("#b8a27e"),
      under = new THREE.Color("#8f7d62");
    // Jointed blocks: the ledge's inner edge steps in and out from one block to the next.
    const inner = (a: number) => head - OVERHANG * (0.55 + 0.45 * random(Math.floor(a * 9) + 3));
    const ring = (a: number, r: number, y: number, col: THREE.Color) => {
      position.push(center + r * Math.cos(a), y, r * Math.sin(a));
      color.push(col.r, col.g, col.b);
    };
    for (let i = 0; i <= na; i++) {
      const a = Math.PI * 0.55 + (Math.PI * 0.9 * i) / na,
        r1 = inner(a),
        // The ledge's top follows the ground just outside the rim: the river bed in the middle.
        surface = waterfallTerrain(
          center + (head + 0.03) * Math.cos(a),
          (head + 0.03) * Math.sin(a),
          progress,
        );
      ring(a, head + 0.01, surface + 0.002, top);
      ring(a, r1, surface + 0.002, top);
      ring(a, r1, CAP_BASE, under);
      ring(a, head + 0.01, CAP_BASE, under);
    }
    for (let i = 0; i < na; i++) {
      const k = i * 4,
        n = k + 4;
      // Top, inner face and underside of each step around the head.
      index.push(k, n, k + 1, k + 1, n, n + 1);
      index.push(k + 1, n + 1, k + 2, k + 2, n + 1, n + 2);
      index.push(k + 2, n + 2, k + 3, k + 3, n + 2, n + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [center, head, progress]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const glsl = useMemo(() => cliffFaceGlsl(CAP_ROCK), []);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <SectionMaterial
        glsl={glsl}
        cliff={0.6}
        cacheKey="waterfall-ledge"
        vertexColors
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** A curtain of falling water, streaked and moving downward as the lab plays. */
function FallingWater({
  edge,
  top,
  bottom,
  width,
}: {
  edge: number;
  top: number;
  bottom: number;
  width: number;
}) {
  const geometry = useMemo(() => {
    const rows = 40,
      cols = 16,
      position: number[] = [],
      uv: number[] = [],
      index: number[] = [];
    for (let i = 0; i <= rows; i++)
      for (let j = 0; j <= cols; j++) {
        const s = i / rows,
          u = j / cols - 0.5;
        // Thrown out a little from the lip, then falling almost straight down; spreading as it falls.
        position.push(
          edge + 0.02 + 0.2 * Math.sqrt(s),
          top - (top - bottom) * s,
          u * width * (1 + 0.5 * s),
        );
        uv.push(j / cols, s);
      }
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const k = i * (cols + 1) + j;
        index.push(k, k + 1, k + cols + 1, k + 1, k + cols + 2, k + cols + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [edge, top, bottom, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useLabFrame((t) => {
    uniforms.uTime.value = t;
  });
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        vertexShader="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }"
        fragmentShader={`varying vec2 vUv; uniform float uTime;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
void main(){
  // Streaks run down the fall and move with lab time; the curtain frays at its edges and foot.
  float streak = n(vec2(vUv.x * 26., vUv.y * 3. - uTime * 30.)) * .6 + n(vec2(vUv.x * 61., vUv.y * 7. - uTime * 45.)) * .4;
  float edge = smoothstep(0., .12, vUv.x) * smoothstep(1., .88, vUv.x);
  vec3 color = mix(vec3(.62, .78, .82), vec3(.97, .99, 1.), smoothstep(.35, .8, streak) * .8 + vUv.y * .3);
  gl_FragColor = vec4(color, (.55 + .35 * streak) * edge * (1. - .45 * smoothstep(.75, 1., vUv.y)));
}`}
      />
    </mesh>
  );
}

/** Parcels of water carried along the river and over the fall, moved every frame from lab time. */
function FlowMarkers({ path }: { path: [number, number, number][] }) {
  const COUNT = 24,
    mesh = useRef<THREE.InstancedMesh>(null),
    m = useMemo(() => new THREE.Matrix4(), []);
  useLabFrame((t) => {
    if (!mesh.current) return;
    for (let i = 0; i < COUNT; i++) {
      const p = path[Math.floor(((t + i / COUNT) % 1) * (path.length - 1))];
      m.makeTranslation(p[0], p[1] + 0.016, p[2] + 0.1 * Math.sin(i * 3));
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.016, 8, 6]} />
      <meshBasicMaterial color="#e3f1ee" />
    </instancedMesh>
  );
}

/** The waterfall, its retreating lip and the gorge it has left behind. */
export function Waterfall({ progress }: { progress: number }) {
  const tr = useT();
  const lip = waterfallLip(progress),
    head = gorgeHalfWidth(lip, progress),
    edge = lip + OVERHANG * 0.75,
    top = waterfallTerrain(lip - 0.01, 0, progress) + 0.04,
    // The pool fills its hollow up to the level of the gorge floor just downstream.
    pool = gorgeFloor(lip + 1.15, 0, progress) + 0.02;
  const height = useMemo(
    () => (x: number, z: number) => waterfallTerrain(x, z, progress),
    [progress],
  );
  const color = useMemo(
    () => (x: number, y: number, z: number) => groundColor(x, y, z, progress),
    [progress],
  );
  const upstream = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const x = -3 + ((edge + 3) * i) / 69,
          z = channelZ(Math.min(x, lip - 0.01), progress);
        return [x, waterfallTerrain(Math.min(x, lip - 0.01), z, progress) + 0.04, z] as [
          number,
          number,
          number,
        ];
      }),
    [edge, lip, progress],
  );
  const downstream = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const x = lip + 1.0 + ((2.95 - lip - 1.0) * i) / 59,
          z = 0.08 * Math.sin(x * 2.1);
        return [x, gorgeFloor(x, z, progress) + 0.03, z] as [number, number, number];
      }),
    [lip, progress],
  );
  const markers = useMemo(() => {
    const fall = Array.from({ length: 12 }, (_, i) => {
      const s = (i + 1) / 13;
      return [edge + 0.02 + 0.2 * Math.sqrt(s), top - (top - pool) * s, 0] as [
        number,
        number,
        number,
      ];
    });
    return [...upstream, ...fall, ...downstream];
  }, [upstream, downstream, edge, top, pool]);
  const blocks = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        // Collapsed blocks of the cap, piled in and around the pool and strewn down the gorge.
        const x = lip + 0.35 + 1.6 * random(i + 9) ** 1.8,
          z = (random(i + 19) - 0.5) * 2 * (0.42 - 0.1 * random(i + 5)),
          y = Math.max(height(x, z), x < lip + 1.1 ? pool - 0.03 : 0);
        return [x, y + 0.02, z] as [number, number, number];
      }),
    [lip, pool, height],
  );
  // Boulders on the bed of the river above the fall.
  const stones = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const x = -2.8 + (lip + 2.6) * random(i + 61),
          z = channelZ(x, progress) + (random(i + 71) - 0.5) * 0.3;
        return [x, height(x, z) + 0.012, z] as [number, number, number];
      }),
    [lip, progress, height],
  );
  return (
    <>
      <GeomorphicTerrain
        height={height}
        color={color}
        resolution={240}
        base={0.08}
        cliff={0.6}
        section={CAP_ROCK}
      />
      <CapLedge progress={progress} />
      <WaterRibbon path={upstream} width={0.34} color="#4c90a8" />
      <FallingWater edge={edge} top={top} bottom={pool} width={0.4} />
      <mesh position={[lip + 0.68, pool, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.46, 48]} />
        <FlowWaterMaterial color="#2f6f7f" opacity={0.88} flow={[0.6, 0.3]} speed={0.9} />
      </mesh>
      <WaterRibbon path={downstream} width={0.3} color="#4c90a8" />
      <CloudVolume
        position={[edge + 0.32, pool + 0.2, 0]}
        scale={[0.22, 0.2, 0.26]}
        density={20}
        opacity={0.4}
        seed={5}
      />
      <DebrisField points={blocks} size={0.05} color="#b7a683" />
      <DebrisField points={stones} size={0.025} color="#9c8c74" />
      <FlowMarkers path={markers} />
      <Tag
        pos={[lip - 0.1, top + 0.45, -head - 0.3]}
        text={tr("Lip and resistant cap")}
        note={tr(
          "In this example harder sandstone lies on top of weaker mudstone. The plunge pool and spray wear back the weaker rock, the cap is left overhanging, and it eventually collapses, so the waterfall retreats upstream. Not every waterfall forms this way.",
        )}
        occlude={false}
      />
      <Tag
        pos={[lip + 0.7, pool + 0.6, 0.2]}
        text={tr("Plunge pool")}
        note={tr(
          "Falling water, turbulence and swirling stones deepen a pool at the foot of the fall. The fallen blocks come from the collapsed cap. The pool depth and retreat distance are chosen, not calculated.",
        )}
        occlude={false}
      />
      <Tag
        pos={[2.6, 0.75, 0]}
        text={tr("Gorge")}
        note={tr(
          "As the waterfall retreats it leaves a steep-sided gorge downstream. Its walls expose the cap rock above the weaker beds, and fallen blocks pile up as talus at their foot.",
        )}
        occlude={false}
      />
      {/* Flow (blue) and retreat (orange) point in opposite directions. */}
      <Arrow from={[-2.8, 1.95, 0]} to={[-1.8, 1.95, 0]} color="#7fd4ff" width={2} />
      <Arrow from={[2.6, 2.1, -1.3]} to={[lip + 0.1, 2.1, -1.3]} color="#e4bd82" width={2} />
      <Tag
        pos={[2.6, 2.3, -1.3]}
        text={tr("Retreat upstream")}
        note={tr(
          "The lip moves upstream, against the flow, as the cap collapses block by block. The gorge it leaves behind lengthens downstream of the new lip.",
        )}
        occlude={false}
      />
    </>
  );
}

/** Woodland on the plateau, set back from the gorge rim and the river banks. Placed outside the
 * vertically exaggerated group, so the trees keep their shape. */
export function WaterfallTrees({ progress, vertical }: { progress: number; vertical: number }) {
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 60 && i < 1500; i++) {
      const x = -2.85 + random(i + 3) * 5.7,
        z = -1.85 + random(i + 91) * 3.7;
      if (
        gorgeDistance(x, z, progress) > 0.3 &&
        Math.abs(z - channelZ(x, progress)) > 0.85 &&
        noise(x * 1.6, z * 1.6) > 0.45
      )
        out.push([x, waterfallTerrain(x, z, progress) * vertical - 0.01, z]);
    }
    return out;
  }, [progress, vertical]);
  return <PlantStand kind="broadleaf" positions={trees} scale={0.09} seed={13} />;
}
