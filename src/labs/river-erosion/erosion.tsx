import { useMemo, useEffect, useRef } from "react";
import RealGrandCanyon from "./real-grand-canyon";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { useLabFrame, useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { PlantStand } from "../shared/natural-world";
import { SectionMaterial } from "../shared/section-material";
import { withSurfaceY } from "../shared/section-utils";
import { cliffFaceGlsl, landSectionGlsl } from "../shared/land-section";
import { POTHOLE_ROCK } from "./rocks";
import { Waterfall, WaterfallTrees } from "./waterfall";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import { Tag } from "../shared/kit";

const POT_R = 0.62,
  POT_D = 0.85,
  POT_CX = 0,
  SLAB_W = 3.2,
  SLAB_D = 1.5;

/** Bowl profile: near-vertical walls, rounded floor. */
const potDepth = (r: number) => (r < POT_R ? POT_D * Math.sqrt(1 - (r / POT_R) ** 5) : 0);
const slabTop = (x: number, z: number) => {
  const r = Math.hypot(x - POT_CX, z),
    worn = 0.018 * (noise(x * 4 + 3, z * 4) - 0.5) + 0.01 * Math.sin(x * 9 + z * 3);
  // A smooth rim where flow has rounded the lip of the hollow.
  const rim = r > POT_R ? -0.04 * Math.exp(-(((r - POT_R) / 0.07) ** 2)) : -0.04;
  return worn + rim - potDepth(r);
};

/** Stones swirling round the back half of the hollow, moved every frame from lab time. */
function PotholeStones() {
  const stones = useRef<(THREE.Mesh | null)[]>([]);
  useLabFrame((t) => {
    stones.current.forEach((mesh, i) => {
      if (!mesh) return;
      // Stones circle one way round the back half of the bowl; on reaching the cut face they
      // re-enter at the other side, as if continuing through the removed front half.
      const a = Math.PI + THREE.MathUtils.euclideanModulo(-t * 4 * Math.PI + i * 0.524, Math.PI),
        r = 0.36 + 0.12 * Math.sin(i * 4),
        y = -POT_D + 0.07 + 0.05 * (i % 3);
      mesh.position.set(POT_CX + r * Math.cos(a), y + 0.02 * Math.sin(a * 2), r * Math.sin(a));
      mesh.rotation.set(a, i, a / 2);
    });
  });
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            stones.current[i] = m;
          }}
          castShadow
        >
          <dodecahedronGeometry args={[0.06 + 0.02 * (i % 2), 1]} />
          <meshStandardMaterial color={i % 2 ? "#7b6b5a" : "#9a8a72"} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

function Pothole() {
  // Only the half-block behind z = 0 is built, so the front face is a section through the hollow.
  const geometry = useMemo(() => {
    const h = (x: number, z: number) => slabTop(x, z - SLAB_D / 2);
    const g = withSurfaceY(terrainBlockGeometry(h, SLAB_W, SLAB_D, 260, -1.15), h);
    g.translate(0, 0, -SLAB_D / 2);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        y = p.getY(i),
        r = Math.hypot(x - POT_CX, z);
      col.set(r < POT_R ? "#8d7c66" : "#a8916f");
      // Darker, smoother rock below the waterline; green algae on the upstream side.
      if (r < POT_R) col.lerp(new THREE.Color("#5f574b"), THREE.MathUtils.smoothstep(-y, 0.1, 0.8));
      else col.lerp(new THREE.Color("#7e7f58"), 0.35 * noise(x * 5, z * 5));
      col.multiplyScalar(0.9 + 0.2 * noise(x * 12 + 4, z * 12));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  // Water filling the hollow, cut in half like the rock so its section is visible.
  const water = useMemo(() => {
    // Invert the bowl profile numerically: the radius at which the floor reaches each height.
    const profile = Array.from({ length: 41 }, (_, i) => {
      const y = -POT_D + 0.004 + ((POT_D - 0.054) * i) / 40;
      let lo = 0,
        hi = POT_R;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (-potDepth(mid) < y) hi = mid;
        else lo = mid;
      }
      return new THREE.Vector2(Math.max(0.002, lo - 0.004), y);
    });
    const g = new THREE.LatheGeometry(profile, 64, Math.PI / 2, Math.PI);
    const face = new THREE.Shape([
      ...profile.map((v) => new THREE.Vector2(v.x, v.y)),
      ...profile
        .slice()
        .reverse()
        .map((v) => new THREE.Vector2(-v.x, v.y)),
    ]);
    return { body: g, face: new THREE.ShapeGeometry(face) };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      water.body.dispose();
      water.face.dispose();
    },
    [geometry, water],
  );
  const glsl = useMemo(() => landSectionGlsl(POTHOLE_ROCK), []),
    face = useMemo(() => cliffFaceGlsl(POTHOLE_ROCK), []);
  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow>
        <SectionMaterial
          attach="material-0"
          glsl={face}
          cliff={0.5}
          cacheKey="pothole-face"
          vertexColors
          roughness={0.7}
        />
        <SectionMaterial
          attach="material-1"
          glsl={glsl}
          surface
          cacheKey="pothole-section"
          roughness={0.9}
        />
      </mesh>
      <group position={[POT_CX, 0, 0]}>
        <mesh geometry={water.body} renderOrder={2}>
          <meshPhysicalMaterial
            color="#4f8f95"
            transparent
            opacity={0.38}
            roughness={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh geometry={water.face} position={[0, 0, 0.002]} renderOrder={2}>
          <meshPhysicalMaterial
            color="#5d9da2"
            transparent
            opacity={0.3}
            roughness={0.1}
            depthWrite={false}
          />
        </mesh>
      </group>
      {/* A thin sheet of stream water across the bedrock, flowing toward +x. */}
      <mesh position={[0, 0.012, -SLAB_D / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[SLAB_W, SLAB_D]} />
        <meshPhysicalMaterial
          color="#3e7f88"
          transparent
          opacity={0.2}
          roughness={0.05}
          depthWrite={false}
        />
      </mesh>
      <PotholeStones />
      <Line
        points={Array.from({ length: 121 }, (_, i) => {
          const a = Math.PI + (i / 120) * Math.PI * 0.95;
          return [POT_CX + 0.42 * Math.cos(a), -0.45, 0.42 * Math.sin(a)] as [
            number,
            number,
            number,
          ];
        })}
        color="#cfe6e4"
        lineWidth={1.4}
      />
      <Arrow from={[POT_CX + 0.42, -0.45, -0.02]} to={[POT_CX + 0.34, -0.45, -0.24]} width={0.8} />
      <Arrow from={[-1.45, 0.16, -0.75]} to={[-0.85, 0.16, -0.75]} width={0.8} color="#a7d0d3" />
      <Tag
        pos={[POT_CX, 0.45, -1.1]}
        text="Abrasion in a pothole"
        note="Turbulent flow swirls stones around a hollow in the river bed and grinds it deeper. The block is cut through the middle of the pothole so you can see its profile. The stones are enlarged; fine sediment carried in suspension also abrades the walls."
        occlude={false}
      />
      <Tag
        pos={[1.1, -0.5, 0.05]}
        text="Cut face"
        note="A vertical slice through the pothole and the bedrock around it, as if the rock had been sawn in half."
        occlude={false}
      />
    </>
  );
}

const SLOPE_GRASS = new THREE.Color("#6f8c4a"),
  WOOD = new THREE.Color("#4f6b38"),
  OUTCROP = new THREE.Color("#7c776d"),
  BED = new THREE.Color("#7a7062");

/** Where the river runs down the V-shaped valley: it winds between interlocking spurs. */
const valleyZ = (x: number) => 0.5 * Math.sin(x * 1.25 + 0.5);
/** The valley floor falls steeply downstream, as an upland river's does. */
const valleyFloor = (x: number) => 0.32 - 0.07 * x;

/**
 * A V-shaped valley: the river cuts down while weathering, creep and small slides lower the
 * sides, which rise steeply from a channel with almost no floodplain. Side gullies notch the
 * slopes, and the spurs between the bends overlap from either side.
 */
function vValley(x: number, z: number) {
  const d = Math.abs(z - valleyZ(x)),
    side = 0.82 * Math.max(0, d - 0.06) - 0.09 * Math.max(0, d - 1.2) ** 2,
    gullies =
      0.07 *
      Math.max(0, Math.sin(x * 4.2 + Math.sign(z - valleyZ(x)) * 1.7 + 1.3 * noise(x, z))) ** 3 *
      Math.min(1, d / 0.4),
    rough = 0.05 * (noise(x * 3 + 7, z * 3) - 0.5) * Math.min(1, d * 2);
  return valleyFloor(x) + side - gullies + rough;
}

function vValleyColor(x: number, y: number, z: number) {
  const d = Math.abs(z - valleyZ(x));
  if (d < 0.07) return BED.getStyle();
  const n = noise(x * 2.4 + 3, z * 2.4),
    c = SLOPE_GRASS.clone().lerp(WOOD, smooth(n, 0.35, 0.6) * (1 - smooth(y, 1.1, 1.35)));
  // Bare rock where the river has undercut the foot of a spur.
  c.lerp(OUTCROP, (1 - smooth(d, 0.08, 0.2)) * 0.8 + smooth(noise(x * 7, z * 7), 0.72, 0.8) * 0.5);
  return c.getStyle();
}

const smooth = THREE.MathUtils.smoothstep;

/** Parcels of water carried down a path, moved every frame from lab time. */
function FlowMarkers({ path }: { path: [number, number, number][] }) {
  const COUNT = 24,
    mesh = useRef<THREE.InstancedMesh>(null),
    m = useMemo(() => new THREE.Matrix4(), []);
  useLabFrame((t) => {
    if (!mesh.current) return;
    for (let i = 0; i < COUNT; i++) {
      const p = path[Math.floor(((t + i / COUNT) % 1) * (path.length - 1))];
      m.makeTranslation(p[0], p[1] + 0.016, p[2] + 0.03 * Math.sin(i * 3));
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[0.014, 8, 6]} />
      <meshBasicMaterial color="#e3f1ee" />
    </instancedMesh>
  );
}

function VValley({ vertical }: { vertical: number }) {
  const path = useMemo(
    () =>
      Array.from({ length: 161 }, (_, i) => {
        const x = -3 + (i / 160) * 6,
          z = valleyZ(x);
        return [x, vValley(x, z) + 0.03, z] as [number, number, number];
      }),
    [],
  );
  // Trees stand outside the vertically exaggerated group so they keep their shape.
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 150 && i < 2000; i++) {
      const x = -2.85 + random(i + 3) * 5.7,
        z = -1.85 + random(i + 91) * 3.7,
        y = vValley(x, z);
      if (Math.abs(z - valleyZ(x)) > 0.16 && y < 1.2 && noise(x * 2.4 + 3, z * 2.4) > 0.42)
        out.push([x, y * vertical - 0.01, z]);
    }
    return out;
  }, [vertical]);
  const boulders = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const x = -2.8 + random(i + 40) * 5.6,
          z = valleyZ(x) + (random(i + 50) - 0.5) * 0.12;
        return [x, vValley(x, z) + 0.02, z] as [number, number, number];
      }),
    [],
  );
  return (
    <>
      <group scale={[1, vertical, 1]}>
        <GeomorphicTerrain
          height={vValley}
          color={vValleyColor}
          resolution={220}
          base={-0.3}
          cliff={0.62}
          section={{ rock: "shale", soil: 0.05, regolith: 0.1 }}
        />
        <WaterRibbon path={path} width={0.07} color="#4c90a8" />
        <DebrisField points={boulders} size={0.03} color="#8b8478" />
        <FlowMarkers path={path} />
        <Tag
          pos={[0.4, 1.45, 1.7]}
          text="V-shaped valley"
          priority={1}
          note="The river cuts down into its bed while weathering, soil creep and small slides lower the valley sides. Together they give a V-shaped cross-section. The river alone does not cut the whole valley side, and not every river valley is V-shaped."
          occlude={false}
        />
        <Tag
          pos={[-1.2, vValley(-1.2, valleyZ(-1.2) - 0.55) + 0.12, valleyZ(-1.2) - 0.55]}
          text="Interlocking spurs"
          note="The winding stream erodes the outsides of its bends, leaving ridges of higher ground that jut out alternately from each side of the valley and overlap when you look up it."
          occlude={false}
        />
      </group>
      <PlantStand kind="conifer" positions={trees} scale={0.08} seed={13} />
    </>
  );
}

export default function RiverErosion() {
  const real = useLabControls((s) => Math.round(s.params.feature ?? 0) === 3);
  return real ? <RealGrandCanyon /> : <ModelRiverErosion />;
}

function ModelRiverErosion() {
  const { params, trueScale } = useLabState("params", "trueScale");
  useLabTick(1 / 45);
  const mode = Math.round(params.feature ?? 0),
    progress = params.retreat ?? 0.35,
    vertical = trueScale ? 1 : 1.5;
  return (
    <>
      <ScienceStudio
        horizon
        slug="river-erosion"
        camera={mode === 1 ? [1.6, 2.6, 4.2] : mode === 0 ? [5.6, 5.0, 2.6] : [5.4, 4.2, 1.6]}
        scale={
          mode === 1
            ? "Pothole close-up · 1 unit = 1 m · block cut through the hollow · stones enlarged"
            : mode === 0
              ? "60 × 40 m terrain · vertical ×1.5 · retreat stages not dated"
              : "60 × 40 m terrain · vertical ×1.5 · fixed valley shape"
        }
        trueScale={
          mode === 1
            ? "Pothole geometry at common meter scale · stones enlarged"
            : "1 scene unit = 10 m · equal horizontal and vertical scale"
        }
      >
        {mode === 1 ? (
          <Pothole />
        ) : mode === 0 ? (
          <>
            <group scale={[1, vertical, 1]}>
              <Waterfall progress={progress} />
            </group>
            <WaterfallTrees progress={progress} vertical={vertical} />
          </>
        ) : (
          <VValley vertical={vertical} />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? `Water flows downstream; the waterfall retreats upstream by ${(25 * progress).toFixed(1)} m in this chosen sequence. Change Retreat to expose a longer gorge.`
          : mode === 1
            ? "Flow swirls stones around a hollow in the bedrock. The block is cut through the center of a 1.24 m wide, 0.85 m deep example."
            : "A narrow channel cuts the valley floor while weathering and slope processes lower both sides. The water flows downstream; the valley shape does not change."}{" "}
        <br />
        {
          "Play animates the flow only; the model gives no erosion rate or landform age. Choose a feature, rotate the model and compare it with the photograph."
        }
      </ScienceReadout>
    </>
  );
}
