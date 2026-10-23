import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { waterfallLip, waterfallBed, waterfallLand } from "@/lib/fluvial-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { PlantStand } from "../shared/natural-world";
import { SectionMaterial } from "../shared/section-material";
import { withSurfaceY } from "../shared/section-utils";
import { cliffFaceGlsl, landSectionGlsl, type LandSection } from "../shared/land-section";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import { Tag } from "../shared/kit";

/** Massive, jointed sandstone cap over thinly bedded mudstone with occasional sandstone beds. */
const CAP_ROCK: LandSection = {
  soil: 0.05,
  regolith: 0.04,
  custom: `
  if(p.y>1.42){
    vec3 c=mix(vec3(.80,.73,.58),vec3(.70,.63,.49),g);
    float jc=(p.x+p.z)*1.3+.2*sNoise(vec2(p.y*3.,1.));
    float jf=fract(jc);
    if(sHash(vec2(floor(jc),2.))>.4)c*=mix(.62,1.,smoothstep(0.,.02,min(jf,1.-jf)));
    c*=mix(.55,1.,smoothstep(0.,.02,p.y-1.42));
    return c;
  }
  float y=p.y*16.+.3*sNoise(vec2((p.x+p.z)*2.,0.));
  vec3 c=mix(vec3(.43,.41,.40),vec3(.35,.34,.33),sHash(vec2(floor(y),4.)))*mix(.9,1.1,g);
  c*=mix(.82,1.,smoothstep(0.,.2,fract(y)));
  if(fract(p.y*2.7+.1)<.09)c=mix(vec3(.62,.55,.45),vec3(.55,.49,.40),g);
  return c;`,
};

/** Water-worn sandstone for the pothole slab. */
const POTHOLE_ROCK: LandSection = { rock: "sandstone", soil: 0, regolith: 0, beds: 3.2 };

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

function Pothole({ t }: { t: number }) {
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
      {/* A thin sheet of stream water across the bedrock, flowing towards +x. */}
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
      {Array.from({ length: 6 }, (_, i) => {
        // Stones circle one way round the back half of the bowl; on reaching the cut face they
        // re-enter at the other side, as if continuing through the removed front half.
        const a = Math.PI + THREE.MathUtils.euclideanModulo(-t * 4 * Math.PI + i * 0.524, Math.PI),
          r = 0.36 + 0.12 * Math.sin(i * 4),
          y = -POT_D + 0.07 + 0.05 * (i % 3);
        return (
          <mesh
            key={i}
            position={[POT_CX + r * Math.cos(a), y + 0.02 * Math.sin(a * 2), r * Math.sin(a)]}
            rotation={[a, i, a / 2]}
            castShadow
          >
            <dodecahedronGeometry args={[0.06 + 0.02 * (i % 2), 1]} />
            <meshStandardMaterial color={i % 2 ? "#7b6b5a" : "#9a8a72"} roughness={0.8} />
          </mesh>
        );
      })}
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

/** Widens the scene's gorge relative to the science model's cross-section. */
const GORGE = 0.72;

const GORGE_GRASS = new THREE.Color("#6f8c4a"),
  GORGE_MOOR = new THREE.Color("#8a8a55"),
  GORGE_BED = new THREE.Color("#7a7062"),
  POOL_BED = new THREE.Color("#4f4a42");

export default function RiverErosion() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const mode = Math.round(params.feature ?? 0),
    progress = params.retreat ?? 0.35,
    lip = waterfallLip(progress),
    vertical = trueScale ? 1 : mode === 0 ? 2.2 : 1.5;
  /** Valley axis for the V-shaped valley: the river winds between interlocking spurs. */
  const valleyZ = (x: number) => 0.38 * Math.sin(x * 1.5 + 0.4);
  const height = useMemo(
    () =>
      mode === 2
        ? (x: number, z: number) => {
            const d = Math.abs(z - valleyZ(x)),
              gully = 0.06 * Math.sin(x * 5.5 + Math.sign(z) * 1.3) * Math.min(1, d);
            return (
              0.2 -
              0.05 * x +
              0.62 * Math.min(1.9, Math.max(0, d - 0.05)) * (0.86 + 0.14 * noise(x * 2, z * 2)) -
              Math.max(0, gully) +
              0.06 * (noise(x * 3 + 7, z * 3) - 0.5) * Math.min(1, d * 2)
            );
          }
        : (x: number, z: number) => {
            const wobble = 0.03 * (noise(x * 3, z * 2 + 5) - 0.5),
              base = waterfallLand(x, (z + wobble * Math.sign(z)) * GORGE, progress),
              top = Math.abs(z) > 0.5 ? 0.04 * (noise(x * 1.6 + 2, z * 1.6) - 0.5) : 0;
            return base + top;
          },
    [mode, progress],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const c = new THREE.Color();
      if (mode === 2) {
        const d = Math.abs(z - valleyZ(x));
        if (d < 0.07) return "#7a7062";
        c.copy(GORGE_GRASS).lerp(GORGE_MOOR, THREE.MathUtils.smoothstep(y, 0.7, 1.3));
        return c.getStyle();
      }
      const bank = 1.8 - 0.015 * (x + 3);
      if (Math.abs(z * GORGE) < 0.45 && y < bank - 0.06)
        c.copy(x > lip ? POOL_BED : GORGE_BED).lerp(GORGE_BED, x > lip + 0.6 ? 1 : 0);
      else c.copy(GORGE_GRASS).lerp(GORGE_MOOR, 0.5 * noise(x * 1.2, z * 1.2 + 3));
      return c.getStyle();
    },
    [mode, lip],
  );
  const path = useMemo(
    () =>
      mode === 2
        ? Array.from({ length: 161 }, (_, i) => {
            const x = -3 + (i / 160) * 6,
              z = valleyZ(x);
            return [x, height(x, z) + 0.035, z] as [number, number, number];
          })
        : [
            ...Array.from({ length: 71 }, (_, i) => {
              const x = -3 + ((lip + 3) * i) / 70;
              return [
                x,
                i === 70
                  ? waterfallBed(lip - 0.001, progress) + 0.04
                  : waterfallBed(x, progress) + 0.04,
                0,
              ] as [number, number, number];
            }),
            ...Array.from(
              { length: 31 },
              (_, i) =>
                [
                  lip + 0.11 * Math.sin((i / 30) * Math.PI * 0.5),
                  THREE.MathUtils.lerp(
                    waterfallBed(lip - 0.001, progress) + 0.04,
                    waterfallBed(lip, progress) + 0.04,
                    i / 30,
                  ),
                  0,
                ] as [number, number, number],
            ),
            ...Array.from({ length: 71 }, (_, i) => {
              const x = lip + 0.11 + ((2.89 - lip) * i) / 70;
              return [x, waterfallBed(x, progress) + 0.04, 0] as [number, number, number];
            }),
          ],
    [mode, lip, progress, height],
  );
  // Trees stand outside the vertically exaggerated group so they keep their shape.
  const trees = useMemo(() => {
    if (mode === 1) return [];
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 70 && i < 600; i++) {
      const x = -2.85 + random(i + 3) * 5.7,
        z = -1.85 + random(i + 91) * 3.7;
      const ok =
        mode === 2
          ? Math.abs(z - valleyZ(x)) > 0.18 && height(x, z) < 1.05 && noise(x * 2, z * 2) > 0.35
          : Math.abs(z * GORGE) > 0.55 && (Math.abs(z) < 1.3 || noise(x * 2, z * 2) > 0.62);
      if (ok) out.push([x, height(x, z) * vertical - 0.01, z]);
    }
    return out;
  }, [mode, height, vertical]);
  const boulders = useMemo(
    () =>
      mode === 1
        ? []
        : Array.from({ length: 34 }, (_, i) => {
            if (mode === 2) {
              const x = -2.8 + random(i + 40) * 5.6,
                z = valleyZ(x) + (random(i + 50) - 0.5) * 0.12;
              return [x, height(x, z) + 0.02, z] as [number, number, number];
            }
            const x = lip + 0.12 + 1.2 * random(i + 9) ** 1.6,
              z = ((random(i + 19) - 0.5) * 0.66) / GORGE;
            return [x, waterfallBed(x, progress) + 0.025, z] as [number, number, number];
          }),
    [mode, lip, progress, height],
  );
  const glsl = useMemo(() => cliffFaceGlsl(CAP_ROCK), []);
  const poolY = waterfallBed(lip + 0.27, progress);
  return (
    <>
      <ScienceStudio
        horizon
        slug="river-erosion"
        camera={mode === 1 ? [1.6, 2.6, 4.2] : mode === 0 ? [6.2, 4.6, 1.4] : [2.5, 6.2, 5.4]}
        scale={
          mode === 1
            ? "Pothole close-up · 1 unit = 1 m · block cut through the hollow · stones enlarged"
            : mode === 0
              ? "60 × 40 m terrain · vertical ×2.2 · retreat stages not dated"
              : "60 × 40 m terrain · vertical ×1.5 · fixed valley shape"
        }
        trueScale={
          mode === 1
            ? "Pothole geometry at common metre scale · stones enlarged"
            : "1 scene unit = 10 m · equal horizontal and vertical scale"
        }
      >
        {mode === 1 ? (
          <Pothole t={t} />
        ) : (
          <>
            <group scale={[1, vertical, 1]}>
              <GeomorphicTerrain
                height={height}
                colour={colour}
                resolution={220}
                base={mode === 0 ? 0.08 : -0.3}
                cliff={0.6}
                section={mode === 0 ? CAP_ROCK : { rock: "shale", soil: 0.05, regolith: 0.1 }}
              />
              {mode === 0 && (
                // The resistant cap overhangs the weaker rock that the plunge pool undercuts.
                <mesh position={[lip + 0.06, 1.52, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.16, 0.18, 0.86 / GORGE]} />
                  <SectionMaterial glsl={glsl} cacheKey="waterfall-cap" roughness={0.9} />
                </mesh>
              )}
              <WaterRibbon path={path} width={mode === 2 ? 0.07 : 0.25} color="#4c90a8" />
              {mode === 0 && (
                <mesh position={[lip + 0.3, poolY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.42, 48]} />
                  <FlowWaterMaterial color="#3d7f92" opacity={0.85} flow={[0.6, 0.3]} speed={0.9} />
                </mesh>
              )}
              {mode === 0 &&
                Array.from({ length: 36 }, (_, i) => {
                  const u = (t * 4 + i / 36) % 1,
                    x = lip + 0.16 + 0.32 * u * (0.6 + 0.4 * random(i)),
                    z = 0.4 * Math.sin(i * 2.399) * u;
                  return (
                    <mesh
                      key={`spray-${i}`}
                      position={[x, poolY + 0.08 + 0.22 * Math.sin(u * Math.PI), z]}
                    >
                      <sphereGeometry args={[0.022 * (1 - u * 0.6), 6, 5]} />
                      <meshBasicMaterial
                        color="#eef6f6"
                        transparent
                        opacity={0.55 * (1 - u)}
                        depthWrite={false}
                      />
                    </mesh>
                  );
                })}
              <DebrisField
                points={boulders}
                size={mode === 0 ? 0.045 : 0.03}
                color={mode === 0 ? "#b7a683" : "#8b8478"}
              />
              {Array.from({ length: 24 }, (_, i) => {
                const p = path[Math.floor(((t + i / 24) % 1) * (path.length - 1))];
                return (
                  <mesh key={i} position={[p[0], p[1] + 0.016, p[2] + 0.1 * Math.sin(i * 3)]}>
                    <sphereGeometry args={[0.016, 8, 6]} />
                    <meshBasicMaterial color="#e3f1ee" />
                  </mesh>
                );
              })}
              {mode === 0 ? (
                <>
                  <Tag
                    pos={[lip - 0.35, 2.2, -1.15]}
                    text="Lip and resistant cap"
                    note="In this example harder sandstone lies on top of weaker mudstone. The plunge pool and spray wear back the weaker rock, the cap is left overhanging, and it eventually collapses, so the waterfall retreats upstream. Not every waterfall forms this way."
                    occlude={false}
                  />
                  <Tag
                    pos={[lip + 0.35, poolY + 0.62, 0.62]}
                    text="Plunge pool"
                    note="Falling water, turbulence and swirling stones deepen a pool at the foot of the fall. The fallen blocks come from the collapsed cap. The pool depth and retreat distance are chosen, not calculated."
                    occlude={false}
                  />
                  <Tag
                    pos={[Math.min(2.6, lip + 1.9), 1.2, 0]}
                    text="Gorge"
                    note="As the waterfall retreats it leaves a steep-sided gorge downstream. Its walls expose the cap rock above the weaker beds."
                    occlude={false}
                  />
                  {/* Flow and retreat point in opposite directions: label both. */}
                  <Arrow
                    from={[lip - 1.3, 1.72, 0]}
                    to={[lip - 0.55, 1.72, 0]}
                    color="#7fd4ff"
                    width={2}
                  />
                  <Tag
                    pos={[lip - 1.1, 1.95, 0]}
                    text="Flow downstream"
                    note="Water always flows downstream, from the upland reach, over the lip and down the gorge."
                    occlude={false}
                  />
                  <Arrow
                    from={[Math.min(2.6, lip + 1.4), 2.0, -0.8]}
                    to={[lip + 0.1, 2.0, -0.8]}
                    color="#e4bd82"
                    width={2}
                  />
                  <Tag
                    pos={[lip + 0.8, 2.25, -0.8]}
                    text="Retreat upstream"
                    note="The lip moves upstream, against the flow, as the cap collapses block by block. The gorge it leaves behind lengthens downstream of the new lip."
                    occlude={false}
                  />
                </>
              ) : (
                <>
                  <Tag
                    pos={[0, 1.6, 1.8]}
                    text="V-shaped valley"
                    note="The river cuts down into its bed while weathering, soil creep and small slides lower the valley sides. Together they give a V-shaped cross-section. The river alone does not cut the whole valley side, and not every river valley is V-shaped."
                    occlude={false}
                  />
                  <Tag
                    pos={[-1.6, 0.9, valleyZ(-1.6) + 0.6]}
                    text="Interlocking spurs"
                    note="The winding stream erodes the outsides of its bends, leaving ridges of higher ground that overlap from each side of the valley."
                    occlude={false}
                  />
                </>
              )}
            </group>
            <PlantStand kind="broadleaf" positions={trees} scale={0.09} seed={13} />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? `Water flows downstream; the waterfall retreats upstream by ${(25 * progress).toFixed(1)} m in this chosen sequence. Change Retreat to expose a longer gorge.`
          : mode === 1
            ? "Flow swirls stones around a hollow in the bedrock. The block is cut through the centre of a 1.24 m wide, 0.85 m deep example."
            : "A narrow channel cuts the valley floor while weathering and slope processes lower both sides. The water flows downstream; the valley shape does not change."}
        <br />
        {
          "Play animates the flow only; the model gives no erosion rate or landform age. Choose a feature, rotate the model and compare it with the photograph."
        }
      </ScienceReadout>
    </>
  );
}
