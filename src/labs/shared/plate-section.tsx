import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { Arrow } from "./science-kit";
import { Tag } from "./kit";
import { FlowWaterMaterial } from "./flow-water";
import { PlantStand, TerrainMaterial } from "./natural-world";
import { terrainBlockGeometry } from "./science-geometry";
import { SectionMaterial } from "./section-material";
import { useSectionUniforms } from "./section-utils";
import { fbm } from "./hazard-utils";

const W = 5.6,
  D = 1.6,
  BASE = -1.5,
  TRENCH = -0.6,
  SLOPE = 0.72;
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Surface heights for each boundary type; schematic, no measured length scale. */
function surface(kind: number) {
  return (x: number, z: number) => {
    const n = 0.016 * (fbm(x * 2.2 + 1, z * 2.2) - 0.5);
    if (kind === 0) {
      const a = Math.abs(x);
      return -0.28 + 0.2 * Math.exp(-a * 0.9) - 0.07 * Math.exp(-((x / 0.09) ** 2)) + n * 0.6;
    }
    if (kind === 1) {
      if (x < TRENCH) return -0.26 + 0.03 * (x - TRENCH) * 0.1 + n * 0.4;
      const trench = -0.2 * Math.exp(-(((x - TRENCH) / 0.12) ** 2)),
        coast = ss(x, TRENCH + 0.1, TRENCH + 0.75),
        arc = [-0.3, 0.45].reduce(
          (h, vz) => h + 0.24 * Math.exp(-(((x - 0.75) / 0.13) ** 2) - ((z - vz) / 0.2) ** 2),
          0.08 * Math.exp(-(((x - 0.75) / 0.45) ** 2)),
        );
      return -0.26 + trench * (1 - coast) + coast * (0.28 + n) + arc;
    }
    // Transform: one continental landscape, cut by a straight fault valley along x = 0.
    return (
      0.03 +
      n +
      0.03 * (fbm(x * 0.8, z * 0.8) - 0.5) -
      0.025 * Math.exp(-((x / 0.05) ** 2)) -
      0.035 * Math.exp(-((z / 0.06) ** 2))
    );
  };
}

const SECTION_GLSL = `uniform float uKind;
vec3 sectionColour(vec3 p,vec3 w){
  float x=p.x,y=p.y,g=grain(p.xy+p.zy);
  vec3 oceanic=mix(vec3(.30,.31,.34),vec3(.22,.23,.26),g);
  vec3 upper=mix(vec3(.80,.66,.56),vec3(.66,.54,.47),g);
  vec3 lower=mix(vec3(.56,.55,.58),vec3(.45,.45,.49),g);
  vec3 lith=mix(vec3(.44,.49,.37),vec3(.35,.40,.29),g);
  vec3 asth=mix(vec3(.60,.43,.34),vec3(.50,.35,.27),sFbm(p.xy*3.));
  if(uKind<.5){
    float a=abs(x),top=-.28+.2*exp(-a*.9);
    if(a>.3&&y>top-.045*min(a,2.5)/2.5)return mix(vec3(.80,.72,.56),vec3(.70,.62,.47),step(.5,fract(y*120.)));
    if(y>top-.14)return oceanic;
    if(y>top-.14-.5*sqrt(min(a,2.5)/2.5))return lith;
    return asth;
  }
  if(uKind<1.5){
    float slab=-.26-max(0.,x-(${TRENCH.toFixed(2)}))*${SLOPE.toFixed(2)};
    if(x<${TRENCH.toFixed(2)}){
      if(y>-.4)return oceanic;
      if(y>-.75)return lith;
      return asth;
    }
    if(y<=slab&&y>slab-.14)return oceanic;
    if(y<=slab-.14&&y>slab-.46)return lith*.85;
    if(y>slab){
      if(x<${(TRENCH + 0.35).toFixed(2)}&&y>-.45)return mix(vec3(.66,.58,.46),vec3(.54,.47,.37),step(.5,fract((y+x*.6)*40.)));
      if(y>-.32)return upper;
      if(y>-.72)return lower;
      return asth*1.06;
    }
    return y>-1.1?lith:asth;
  }
  float gouge=1.-smoothstep(.012,.03,abs(x));
  vec3 c=y>-.3?upper:y>-.7?lower:y>-1.1?lith:asth;
  return mix(c,vec3(.32,.20,.16),gouge);
}
vec3 sectionGlow(vec3 p,vec3 w){
  float x=p.x,y=p.y,melt=0.;
  if(uKind<.5)melt=(1.-smoothstep(.0,.05+(-.4-y)*.45,abs(x)))*step(y,-.42)*step(-1.2,y)*.9;
  else if(uKind<1.5){
    melt=1.-smoothstep(.7,1.,length(vec2((x-.75)/.13,(y+.78)/.3)));
    melt=max(melt,(1.-smoothstep(.015,.03,abs(x-.75)))*step(-.5,y)*step(y,.3));
  }
  return vec3(1.,.36,.06)*melt*(.8+.4*sNoise(p.xy*20.));
}`;

function Block({
  kind,
  from,
  to,
  offset = [0, 0, 0],
}: {
  kind: number;
  from: number;
  to: number;
  offset?: [number, number, number];
}) {
  const height = useMemo(() => surface(kind), [kind]);
  const geometry = useMemo(() => {
    const width = to - from,
      center = (from + to) / 2,
      g = terrainBlockGeometry((x, z) => height(x + center, z), width, D, 180, BASE);
    g.translate(center, 0, 0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        n = fbm(x * 4, z * 4);
      if (y < -0.02) col.set("#4f555a").lerp(tone.set("#8a8070"), ss(y, -0.2, -0.04));
      else if (y < 0.18) col.set("#6f8a4c").lerp(tone.set("#97955f"), n);
      else if (y < 0.3) col.set("#6a6a50").lerp(tone.set("#8a7f6c"), ss(y, 0.2, 0.3));
      else col.set("#4a423d");
      if (kind === 2 && Math.abs(x) < 0.05) col.set("#8d7a5c");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [height, from, to, kind]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useSectionUniforms({ uKind: kind });
  return (
    <mesh geometry={geometry} position={offset} castShadow receiveShadow>
      <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
      <SectionMaterial
        attach="material-1"
        glsl={SECTION_GLSL}
        uniforms={uniforms}
        cacheKey="plate-section-v1"
      />
    </mesh>
  );
}

/** Geometry is a section, not a surveyed landscape. Every kinematic tracer uses t. */
export function PlateSection({ kind = 0 }: { kind?: number }) {
  const t = useLabControls((s) => s.t),
    slip = t * 0.8,
    height = useMemo(() => surface(kind), [kind]);
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 60 && i < 1000; i++) {
      const x = -W / 2 + 0.1 + (W - 0.2) * ((i * 0.618034) % 1),
        z = -D / 2 + 0.08 + (D - 0.16) * ((i * 0.7548777) % 1),
        y = height(x, z);
      if (y > 0.0 && y < 0.2 && fbm(x * 3, z * 3) > 0.5 && Math.abs(x) > 0.08 && Math.abs(z) > 0.12)
        out.push([x, y - 0.004, z]);
    }
    return out;
  }, [height]);
  return (
    <group position={[0, 0.1, 0]}>
      {kind === 2 ? (
        <>
          <Block kind={2} from={-W / 2} to={0} />
          <Block kind={2} from={0} to={W / 2} offset={[0, 0, slip]} />
          <PlantStand
            kind="broadleaf"
            positions={trees.filter((p) => p[0] < 0)}
            scale={0.1}
            seed={5}
          />
          <group position={[0, 0, slip]}>
            <PlantStand
              kind="broadleaf"
              positions={trees.filter((p) => p[0] > 0)}
              scale={0.1}
              seed={6}
            />
          </group>
          {/* A stream that once crossed straight over the fault, now offset with the block. */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (W / 4), 0.012, side > 0 ? slip : 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[W / 2 - 0.02, 0.09]} />
              <FlowWaterMaterial color="#3f86a2" opacity={0.92} speed={0.4} />
            </mesh>
          ))}
          {/* Long, wide arrows above each block: they run along the fault, nearly toward the
              camera, so they need extra length to read clearly. */}
          <Arrow from={[-1.2, 0.55, 0.7]} to={[-1.2, 0.55, -0.7]} color="#8ec8d1" width={2.2} />
          <Arrow from={[1.2, 0.55, -0.7]} to={[1.2, 0.55, 0.7]} color="#8ec8d1" width={2.2} />
          <Tag
            pos={[0, 1.15, -0.6]}
            text="Transform · offset stream"
            note="The stream once flowed straight across the fault. The right block slides sideways along the vertical fault, so the stream and every rock layer are offset. Crust is neither created nor consumed."
            occlude={false}
          />
        </>
      ) : (
        <>
          <Block kind={kind} from={-W / 2} to={W / 2} />
          <PlantStand kind="conifer" positions={trees} scale={0.1} seed={9} />
          <mesh position={[kind === 0 ? 0 : (-W / 2 + TRENCH + 0.75) / 2, -0.25, 0]}>
            <boxGeometry args={[kind === 0 ? W : W / 2 + TRENCH + 0.75, 0.5, D]} />
            <meshPhysicalMaterial
              color="#2a7896"
              transparent
              opacity={0.3}
              roughness={0.4}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[kind === 0 ? 0 : (-W / 2 + TRENCH + 0.75) / 2, 0.001, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[kind === 0 ? W : W / 2 + TRENCH + 0.75, D]} />
            <FlowWaterMaterial color="#1f6584" opacity={0.55} speed={0.2} />
          </mesh>
          {kind === 0 &&
            [-1, 1].flatMap((side) =>
              Array.from({ length: 3 }, (_, i) => {
                const x = side * (0.12 + ((t + i / 3) % 1) * 2.4);
                return (
                  <mesh key={`${side}-${i}`} position={[x, height(x, 0.55) + 0.03, 0.55]}>
                    <sphereGeometry args={[0.035, 16, 12]} />
                    <meshBasicMaterial color="#e9c885" />
                  </mesh>
                );
              }),
            )}
          {kind === 1 &&
            Array.from({ length: 4 }, (_, i) => {
              const u = (t + i / 4) % 1,
                x = -2.4 + u * 3.6,
                y = x < TRENCH ? height(x, 0.55) + 0.03 : -0.26 - (x - TRENCH) * SLOPE + 0.02;
              return (
                <mesh key={i} position={[x, y, D / 2 + 0.03]}>
                  <sphereGeometry args={[0.035, 16, 12]} />
                  <meshBasicMaterial color="#e9c885" />
                </mesh>
              );
            })}
          <Arrow
            from={[kind === 0 ? -0.5 : -2, kind === 0 ? 0.75 : 1.05, 0]}
            to={[kind === 0 ? -1.5 : -1.1, kind === 0 ? 0.75 : 1.05, 0]}
            color="#8ec8d1"
            width={1.3}
          />
          <Arrow
            from={[kind === 0 ? 0.5 : 1.9, kind === 0 ? 0.75 : 1.05, 0]}
            to={[kind === 0 ? 1.5 : 1.3, kind === 0 ? 0.75 : 1.05, 0]}
            color="#8ec8d1"
            width={1.3}
          />
          <Tag
            pos={[kind === 0 ? 0 : 0.75, kind === 0 ? 0.5 : 0.75, kind === 0 ? 0 : -0.3]}
            text={kind === 0 ? "Divergent · new basalt" : "Convergent · volcanic arc"}
            note={
              kind === 0
                ? "The plates separate while new basalt fills the ridge's rift valley. Gold markers travel with each flank. Partial melt (glow) is local; the mantle below stays mostly solid."
                : "Oceanic lithosphere descends below the overriding continent at the trench. Water released from the slab helps the mantle above it melt, feeding a chain of volcanoes. Gold markers follow the descending plate."
            }
            occlude={false}
          />
        </>
      )}
      <Tag
        pos={[-2.2, -1.25, D / 2 + 0.05]}
        text="Mantle · mostly solid"
        note="Green: rigid lithospheric mantle, part of the plate. Red-brown: hotter, weaker asthenosphere, still solid rather than a magma ocean. The section has no true length or speed scale."
        occlude={false}
      />
    </group>
  );
}
