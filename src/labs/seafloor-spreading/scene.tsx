import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { EXPERIMENT_REVERSALS, spreadingCrust } from "@/lib/spreading-science";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { TerrainMaterial } from "../shared/natural-world";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { Tag } from "../shared/kit";

/** 1 scene unit = 20 km horizontally. Two ridge segments are offset by a transform fault. */
const W = 5,
  D = 2.8,
  BASE = -1.95,
  TRANSFORM_Z = 0.25,
  OFFSET = 0.45;
const axisAt = (z: number) => (z > TRANSFORM_Z ? OFFSET : 0);
const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Seafloor height: √age subsidence, an axial valley (slow) or high (fast), abyssal hills and a
 * fracture-zone trough. Mirrored exactly in SURFACE_GLSL so cut-face layers follow the floor. */
function floorHeight(x: number, z: number, rate: number, exaggeration: number) {
  const half = rate / 2,
    k = exaggeration / 12,
    d = x - axisAt(z),
    a = Math.abs(d),
    slow = 1 - smooth(rate, 30, 50);
  const subsidence = ((350 * Math.sqrt((a * 20) / half)) / 20000) * exaggeration;
  const valley =
    slow * (-0.4 * Math.exp(-((d / 0.2) ** 2)) + 0.12 * Math.exp(-(((a - 0.45) / 0.15) ** 2)));
  const high = (1 - slow) * 0.1 * Math.exp(-((d / 0.2) ** 2));
  const hills = 0.018 * Math.sin(a * 55 + 0.6 * Math.sin(z * 3)) * smooth(a, 0.3, 0.6);
  const fracture = -0.045 * Math.exp(-(((z - TRANSFORM_Z) / 0.05) ** 2));
  return -subsidence + k * (valley + high + hills + fracture);
}

const SURFACE_GLSL = `uniform float uRate,uExag,uTime,uRev[${EXPERIMENT_REVERSALS.length}];
float axisAt(float z){return z>${TRANSFORM_Z.toFixed(2)}?${OFFSET.toFixed(2)}:0.;}
float floorTop(float x,float z){
  float half_=uRate*.5,k=uExag/12.,d=x-axisAt(z),a=abs(d),slow=1.-smoothstep(30.,50.,uRate);
  float subs=350.*sqrt(a*20./half_)/20000.*uExag;
  float valley=slow*(-.4*exp(-sq(d/.2))+.12*exp(-sq((a-.45)/.15)));
  float high=(1.-slow)*.1*exp(-sq(d/.2));
  float hills=.018*sin(a*55.+.6*sin(z*3.))*smoothstep(.3,.6,a);
  float fracture=-.045*exp(-sq((z-${TRANSFORM_Z.toFixed(2)})/.05));
  return -subs+k*(valley+high+hills+fracture);
}
float polarity(float a){
  float formed=uTime-a*20./(uRate*.5),n=0.;
  for(int i=0;i<${EXPERIMENT_REVERSALS.length};i++)n+=step(uRev[i],formed);
  return mod(n,2.);
}
float sediment(float a){return min(.1,a*20./(uRate*.5)/28.)*max(uExag/12.,.25);}
`;

/** Ocean crust in section: sediment, pillow basalt (striped by polarity), sheeted dykes, gabbro,
 * then mantle; a melt lens and partial-melt zone lie beneath the axis. Thicknesses schematic. */
const CRUST_GLSL =
  SURFACE_GLSL +
  `
vec3 sectionColour(vec3 p,vec3 w){
  float d=w.x-axisAt(w.z),a=abs(d),top=floorTop(w.x,w.z),below=top-w.y,sed=sediment(a);
  vec2 q=vec2(w.x+w.z,w.y); float g=grain(q);
  vec3 c;
  if(below<sed){c=mix(vec3(.80,.72,.56),vec3(.70,.62,.47),step(.5,fract(below*160.)))*(.92+.16*g);}
  else if(below<sed+.14){
    vec2 cell=fract(vec2(q.x*26.,(below-sed)*30.))-.5;
    float pillow=smoothstep(.5,.3,length(cell*vec2(1.,1.4)));
    vec3 tint=polarity(a)>.5?vec3(.42,.56,.58):vec3(.62,.52,.40);
    c=mix(vec3(.18,.18,.19),tint,.55)*mix(.55,1.05,pillow)*(.9+.2*g);
  }
  else if(below<sed+.44){float dyke=step(.5,fract(q.x*34.+.3*sNoise(q*9.)));c=mix(vec3(.36,.37,.38),vec3(.27,.28,.30),dyke)*(.9+.2*g);}
  else if(below<sed+.99){c=mix(vec3(.46,.49,.44),vec3(.30,.33,.30),g);}
  else{c=mix(vec3(.37,.43,.29),vec3(.28,.33,.21),g);}
  float b=min(min(abs(below-sed),abs(below-sed-.14)),min(abs(below-sed-.44),abs(below-sed-.99)));
  return c*mix(.7,1.,smoothstep(0.,.008,b));
}
vec3 sectionGlow(vec3 p,vec3 w){
  float d=w.x-axisAt(w.z),top=floorTop(w.x,w.z),below=top-w.y;
  float lens=1.-smoothstep(.8,1.,length(vec2(d/.2,(below-.2)/.028)));
  float mush=(1.-smoothstep(.0,.16+(below-.2)*.25,abs(d)))*step(.2,below)*(1.-smoothstep(.6,1.,below))*.35;
  float melt=(1.-smoothstep(.0,(below-.95)*.9,abs(d)))*step(1.05,below)*.3*sNoise(vec2(w.x*12.,w.y*12.));
  return vec3(1.,.38,.07)*(lens*1.3+mush+melt);
}`;

/** Hydrothermal vents: dark chimneys with shimmering black-smoker plumes. */
function BlackSmokers({ vents }: { vents: [number, number, number][] }) {
  const COUNT = 18;
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = new THREE.Object3D();
    vents.forEach(([x, y, z], v) => {
      for (let i = 0; i < COUNT; i++) {
        const u = (clock.elapsedTime * 0.35 + i / COUNT + v * 0.31) % 1;
        m.position.set(
          x + 0.02 * Math.sin(i * 2.1 + u * 6),
          y + 0.07 + u * 0.38,
          z + 0.02 * Math.cos(i * 1.3),
        );
        m.scale.setScalar(0.012 + u * 0.04);
        m.updateMatrix();
        ref.current!.setMatrixAt(v * COUNT + i, m.matrix);
      }
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {vents.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.035, z]} castShadow>
          <cylinderGeometry args={[0.008, 0.02, 0.08, 8]} />
          <meshStandardMaterial color="#3a2e27" roughness={0.9} />
        </mesh>
      ))}
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, vents.length * COUNT]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#2a2624" transparent opacity={0.35} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

export default function SeafloorSpreading() {
  const { t, params, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const rate = params.rate ?? 25,
    age = 4 + t,
    exaggeration = trueScale ? 1 : 12,
    half = rate / 2,
    slowRidge = rate < 40;
  const height = useMemo(
    () => (x: number, z: number) => floorHeight(x, z, rate, exaggeration),
    [rate, exaggeration],
  );
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(height, W, D, 200, BASE);
    g.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3),
    );
    return g;
  }, [height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const p = geometry.attributes.position,
      c = geometry.attributes.color,
      palette = [new THREE.Color("#b29a72"), new THREE.Color("#6fa3a6")],
      basalt = new THREE.Color("#2e2c2b"),
      sediment = new THREE.Color("#cbbd9b"),
      col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        d = Math.abs(x - axisAt(z)),
        crust = spreadingCrust(d * 20, rate, age);
      col.copy(palette[crust.polarity]);
      col.lerp(basalt, 0.55 * (1 - smooth(d, 0.03, 0.12)));
      col.lerp(sediment, Math.min(0.35, crust.ageMa / 18));
      if (Math.abs(z - TRANSFORM_Z) < 0.03) col.multiplyScalar(0.8);
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  }, [geometry, rate, age]);
  const uniforms = useSectionUniforms({
    uRate: rate,
    uExag: exaggeration,
    uTime: age,
    uRev: EXPERIMENT_REVERSALS,
  });
  const vents = useMemo(
    () =>
      (
        [
          [0.06, -0.85],
          [-0.07, -0.25],
          [OFFSET + 0.06, 0.8],
        ] as [number, number][]
      ).map(([x, z]) => [x, height(x, z), z] as [number, number, number]),
    [height],
  );
  const lift = 0.012;
  return (
    <>
      <ScienceStudio
        slug="seafloor-spreading"
        camera={[2.2, 3.2, 6.2]}
        scale="Relief ×12 · ocean water removed · magnetic colours symbolic · crustal layers schematic"
        trueScale="1 scene unit = 20 km · relief at true scale · crustal layers schematic"
      >
        <mesh geometry={geometry} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="rock" color="#d9d9d9" vertexColors />
          <SectionMaterial
            attach="material-1"
            glsl={CRUST_GLSL}
            uniforms={uniforms}
            cacheKey="spreading-crust-v2"
          />
        </mesh>
        {[
          [-D / 2, TRANSFORM_Z, 0],
          [TRANSFORM_Z, D / 2, OFFSET],
        ].map(([z0, z1, x], i) => (
          <Line
            key={i}
            points={Array.from({ length: 30 }, (_, j) => {
              const z = z0 + ((z1 - z0) * j) / 29;
              return [x, height(x, z) + lift, z] as [number, number, number];
            })}
            color="#ff8a3d"
            lineWidth={3}
          />
        ))}
        <Line
          points={Array.from({ length: 20 }, (_, j) => {
            const x = (OFFSET * j) / 19;
            return [x, height(x, TRANSFORM_Z) + lift, TRANSFORM_Z] as [number, number, number];
          })}
          color="#f0d27a"
          lineWidth={3}
        />
        {[-1, 1].map((side) => (
          <Line
            key={side}
            points={Array.from({ length: 30 }, (_, j) => {
              const x = side > 0 ? OFFSET + (j / 29) * (W / 2 - OFFSET) : -(j / 29) * (W / 2);
              return [x, height(x, TRANSFORM_Z) + lift, TRANSFORM_Z] as [number, number, number];
            })}
            color="#d8cfb8"
            lineWidth={1.2}
            dashed
            dashSize={0.06}
            gapSize={0.05}
          />
        ))}
        <BlackSmokers vents={vents} />
        <Arrow from={[-0.25, 0.4, -0.6]} to={[-1.1, 0.4, -0.6]} color="#96d0cd" width={1.3} />
        <Arrow from={[0.25, 0.4, -0.6]} to={[1.1, 0.4, -0.6]} color="#96d0cd" width={1.3} />
        {[-1, 1].map((side) => {
          const x = (side * (0.2 + t) * half) / 20;
          return (
            <mesh key={side} position={[x, height(x, -0.6) + 0.045, -0.6]}>
              <sphereGeometry args={[0.045, 20, 16]} />
              <meshBasicMaterial color="#e9c885" />
            </mesh>
          );
        })}
        <Tag
          pos={[-0.15, 0.85, -1.25]}
          text={slowRidge ? "Ridge axis · rift valley" : "Ridge axis · axial rise"}
          note={
            slowRidge
              ? "At slow spreading rates the ridge crest is a faulted rift valley. Basalt forms at the axis and moves away on each flank. Decompression makes only a small fraction of the mantle melt."
              : "At faster spreading rates more magma reaches the axis and the crest becomes a smoother rise instead of a rift valley; the broadest axial highs are found at fast ridges such as the East Pacific Rise. Basalt forms at the axis and moves away on each flank."
          }
          occlude={false}
        />
        <Tag
          pos={[OFFSET / 2 - 0.1, 0.22, TRANSFORM_Z + 0.55]}
          text="Transform fault"
          tone="sandstone"
          note="Between the two ridge segments the plates slide past each other; earthquakes occur here. Beyond the segments the same line continues as an inactive fracture zone (dashed), where crust of different ages meets."
          occlude={false}
        />
        <Tag
          pos={[vents[0][0] + 0.45, vents[0][1] + 0.12, vents[0][2]]}
          text="Black smokers"
          note="Seawater circulates through hot new crust and vents as mineral-rich fluid at up to about 400 °C. Chimney size is exaggerated."
          occlude={false}
        />
        <Tag
          pos={[-2.3, 0.15, D / 2 + 0.05]}
          text={`${((50 + OFFSET * 20) / half).toFixed(1)} Ma`}
          note="Age increases with distance from the axis: age = distance / half spreading rate. This ideal experiment has equal rates on both flanks."
          occlude={false}
        />
        <Tag
          pos={[2.3, 0.15, D / 2 + 0.05]}
          text={`${((50 - OFFSET * 20) / half).toFixed(1)} Ma`}
          note="A stripe of the same age is found at the same distance from its own ridge segment on the opposite flank. Stripe width depends on both reversal duration and spreading rate."
          occlude={false}
        />
        <Tag
          pos={[OFFSET + 0.6, height(OFFSET, D / 2) - 0.25, D / 2 + 0.05]}
          text="Melt lens"
          tone="magma"
          note="A thin, partly molten lens sits a few kilometres below many ridge axes and feeds the dykes and pillow lavas above it. At slow ridges such as the Mid-Atlantic Ridge it is usually small or short-lived. Beneath it, a small fraction of the mostly solid mantle melts as it rises."
          occlude={false}
        />
        <Tag
          pos={[-1.6, -1.05, D / 2 + 0.05]}
          text="Pillows · dykes · gabbro"
          note="Ocean crust in section: sediment that thickens with age, pillow basalt (tinted by its magnetic polarity), vertical sheeted dykes, coarse gabbro, then the mantle. Thicknesses are schematic."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Full spreading rate "}
        {rate} {"mm/year · each flank "}
        {half.toFixed(1)}{" "}
        {
          "mm/year. Teal and sand-coloured stripes record opposite magnetic polarities, mirrored on each flank."
        }
        <br />
        {
          "Play runs a made-up reversal record through 1 Ma to show the symmetry; it is not the real reversal timescale. The seafloor deepens with the square root of its age. In this model the rift valley gives way to a smoother axial rise above about 40 mm/year; real ridges change more gradually, and broad axial highs are typical of fast ridges (above about 80 mm/year)."
        }
      </ScienceReadout>
    </>
  );
}
