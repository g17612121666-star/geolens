import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { RockMaterial } from "../shared/rock-material";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { farmland, fbm } from "../shared/hazard-utils";
import { volcanoHeight } from "./geometry";

const SIZE = 7,
  DEPTH = 4.6,
  BASE = -1.18,
  CHAMBER: [number, number, number] = [0.78, 0.26, 0.78],
  CHAMBER_Y = -0.84;

const OLD_FLOWS = [
  { start: 0.35, reach: 0.92, wiggle: 0.05, color: "#4a3a31", width: 0.07 },
  { start: 2.55, reach: 0.78, wiggle: 0.06, color: "#57463b", width: 0.06 },
  { start: 3.4, reach: 1, wiggle: 0.04, color: "#3f332d", width: 0.08 },
  { start: 4.35, reach: 0.7, wiggle: 0.07, color: "#5e4d40", width: 0.055 },
  { start: 5.3, reach: 0.88, wiggle: 0.05, color: "#4d3d33", width: 0.065 },
];

/** Teaching heights are about 2.5× the real slopes; "Compare physical scale" removes this. */
const TRUE_RELIEF = 0.4;
const dims = (v: number, k = 1) => ({ radius: 2.1 - v * 0.65, height: (0.36 + v * 1.3) * k });

/** Landscape heights: the edifice profile from geometry.ts on a gently rolling plain. */
function landscape(v: number, fissure: boolean, k = 1) {
  const plain = (x: number, z: number) =>
    0.05 * (fbm(x * 0.6 + 4, z * 0.6 - 2) - 0.5) + 0.015 * (fbm(x * 3, z * 3) - 0.5);
  if (fissure)
    return (x: number, z: number) => {
      const along = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 1.55, 1.85);
      return (
        plain(x, z) * 0.6 +
        along *
          (0.045 * Math.exp(-(((Math.abs(z) - 0.1) / 0.045) ** 2)) -
            0.05 * Math.exp(-((z / 0.035) ** 2)))
      );
    };
  return (x: number, z: number) => {
    const r = Math.hypot(x, z);
    let phi = Math.atan2(x, z);
    if (phi < 0) phi += Math.PI * 2;
    const { radius } = dims(v),
      blend = THREE.MathUtils.smoothstep(r, radius * 0.9, radius * 1.15);
    return Math.max(0, volcanoHeight(v, r, phi, 0)) * k + blend * plain(x, z) + 0.004;
  };
}

function flowLine(
  h: (x: number, z: number) => number,
  radius: number,
  start: number,
  reach: number,
  wiggle: number,
  n = 80,
): [number, number, number][] {
  return Array.from({ length: n }, (_, i): [number, number, number] => {
    const r = 0.17 + (i / (n - 1)) * (radius - 0.15) * reach,
      phi = start + Math.sin(r * 7 + start) * wiggle,
      x = Math.sin(phi) * r,
      z = Math.cos(phi) * r;
    return [x, h(x, z) + 0.012, z];
  });
}

/** Vertex colours: fresh dark lava near the vent, older flows, ash, vegetation and snow. */
function paint(
  g: THREE.BufferGeometry,
  h: (x: number, z: number) => number,
  v: number,
  fissure: boolean,
  k: number,
) {
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3),
    { radius, height } = dims(v, k),
    composite = v >= 0.5;
  const flows = fissure
    ? []
    : OLD_FLOWS.map((f) => ({
        ...f,
        line: flowLine(h, radius, f.start, composite ? f.reach * 0.62 : f.reach, f.wiggle, 36),
      }));
  const col = new THREE.Color(),
    tone = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      r = Math.hypot(x, z),
      n = fbm(x * 2.2 + 1, z * 2.2);
    if (fissure) {
      col.set("#3b3633").lerp(tone.set("#56504a"), n);
      const plateau = THREE.MathUtils.smoothstep(Math.abs(z), 0.9, 1.6);
      col.lerp(farmland(x, z), plateau * 0.85);
      if (Math.abs(z) < 0.16 && Math.abs(x) < 1.8) col.lerp(tone.set("#6a3b2a"), 0.55);
    } else {
      const outer = THREE.MathUtils.smoothstep(r / radius, 0.95, 1.2),
        lower = THREE.MathUtils.smoothstep(r / radius, 0.45, 0.95);
      if (composite) {
        col.set("#8b847a").lerp(tone.set("#6c655c"), n * 0.8);
        col.lerp(tone.set("#4f6a3b"), lower * THREE.MathUtils.smoothstep(n, 0.25, 0.6) * 0.9);
      } else {
        col.set("#3c3735").lerp(tone.set("#5a4b40"), n * 0.7);
        col.lerp(tone.set("#5f7a43"), lower * 0.75 * THREE.MathUtils.smoothstep(n, 0.35, 0.65));
      }
      for (const f of flows) {
        let best = 9;
        for (const q of f.line) best = Math.min(best, Math.hypot(x - q[0], z - q[2]));
        if (best < f.width * 1.6)
          col.lerp(
            tone.set(f.color),
            0.85 * (1 - THREE.MathUtils.smoothstep(best, f.width, f.width * 1.6)),
          );
      }
      if (composite && y > height * 0.72)
        col.lerp(
          tone.set("#eef1f2"),
          THREE.MathUtils.smoothstep(y, height * 0.72, height * 0.8) * 0.95,
        );
      if (r < 0.32) col.lerp(tone.set(composite ? "#5c4f45" : "#2b2523"), 0.7);
      col.lerp(farmland(x, z), outer * 0.9);
    }
    if (y < BASE + 1e-3) col.set("#7a6a58");
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
}

/** The exposed cut face: layered edifice, basement, conduit and magma chamber. */
function CutFace({
  h,
  cut,
  composite,
  fissure,
  clip,
}: {
  h: (x: number, z: number) => number;
  cut: number;
  composite: boolean;
  fissure: boolean;
  clip: THREE.Plane[];
}) {
  const profile = useMemo(() => {
    const t = new THREE.DataTexture(
      new Float32Array(512),
      512,
      1,
      THREE.RedFormat,
      THREE.FloatType,
    );
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  }, []);
  useEffect(() => () => profile.dispose(), [profile]);
  const data = profile.image.data as Float32Array;
  for (let i = 0; i < 512; i++) data[i] = h(-SIZE / 2 + (i / 511) * SIZE, cut);
  profile.needsUpdate = true;
  let top = 0;
  for (let i = 0; i < 512; i++) top = Math.max(top, data[i]);
  top += 0.02;
  const zc = cut / CHAMBER[2],
    chamber = Math.sqrt(Math.max(0, 1 - zc * zc)),
    conduit = fissure
      ? Math.abs(cut) < 0.05
        ? 1
        : 0
      : Math.sqrt(Math.max(0, 1 - (cut / 0.05) ** 2));
  const uniforms = useMemo(
    () => ({
      uProfile: { value: profile },
      uComposite: { value: 0 },
      uFissure: { value: 0 },
      uChamber: { value: 0 },
      uConduit: { value: 0 },
    }),
    [profile],
  );
  uniforms.uComposite.value = composite ? 1 : 0;
  uniforms.uFissure.value = fissure ? 1 : 0;
  uniforms.uChamber.value = chamber;
  uniforms.uConduit.value = conduit;
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "varying vec3 cutWorld;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ncutWorld=(modelMatrix*vec4(transformed,1.)).xyz;",
        );
      s.fragmentShader =
        `varying vec3 cutWorld; uniform sampler2D uProfile; uniform float uComposite,uFissure,uChamber,uConduit;
float vHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(vHash(i),vHash(i+vec2(1.,0.)),f.x),mix(vHash(i+vec2(0.,1.)),vHash(i+vec2(1.,1.)),f.x),f.y);}
float magma(vec3 w,float top){
  float e=uChamber>0.?length(vec2(w.x/(${CHAMBER[0]}*uChamber),(w.y-(${CHAMBER_Y}))/(${CHAMBER[1]}*uChamber))):9.;
  float m=1.-smoothstep(.92,1.,e);
  float half_=uFissure>.5?1.8:.045;
  float pipe=uConduit*(1.-smoothstep(half_*uConduit*.8,half_*uConduit,abs(w.x)))*step(${CHAMBER_Y},w.y);
  return max(m,pipe);
}
` + s.fragmentShader;
      s.fragmentShader = s.fragmentShader
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
  float cutTop=texture2D(uProfile,vec2((cutWorld.x+${(SIZE / 2).toFixed(2)})/${SIZE.toFixed(2)},.5)).r;
  if(cutWorld.y>cutTop)discard;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
  float dd=cutTop-cutWorld.y, grain=vNoise(cutWorld.xy*60.)*.5+vNoise(cutWorld.xy*14.)*.5;
  vec3 rock;
  if(cutWorld.y>.02&&uFissure<.5){
    if(uComposite>.5){
      float band=fract(dd*15.+.35*sin(cutWorld.x*5.));
      rock=band<.45?mix(vec3(.58,.48,.36),vec3(.47,.39,.30),grain):mix(vec3(.22,.20,.20),vec3(.15,.14,.14),grain);
    }else{
      float band=fract(dd*30.+.2*sin(cutWorld.x*3.));
      rock=mix(mix(vec3(.20,.18,.18),vec3(.13,.12,.12),grain),vec3(.45,.22,.14),step(.8,band));
    }
  }else{
    float bed=fract(cutWorld.y*9.+.1*sin(cutWorld.x*2.));
    rock=mix(vec3(.47,.37,.28),vec3(.36,.29,.23),step(.5,bed))*(.85+.3*grain);
    if(uFissure>.5&&cutWorld.y>-.35)rock=mix(vec3(.26,.24,.23),vec3(.38,.27,.21),step(.82,fract(dd*22.)));
  }
  float mg=magma(cutWorld,cutTop);
  rock=mix(rock,vec3(.55,.12,.04),mg);
  diffuseColor.rgb*=rock;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
  float glow=magma(cutWorld,cutTop);
  totalEmissiveRadiance+=glow*mix(vec3(1.,.32,.06),vec3(1.,.72,.25),.5+.5*sin(cutWorld.x*9.+cutWorld.y*13.));`,
        );
    },
    [uniforms],
  );
  return (
    <mesh position={[0, (BASE + top) / 2, cut - 0.0008]}>
      <planeGeometry args={[SIZE, top - BASE]} />
      <meshStandardMaterial
        color="white"
        roughness={0.95}
        clippingPlanes={clip}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "volcano-cut-v1"}
      />
    </mesh>
  );
}

function LavaChannel({
  points,
  active = false,
  clip,
}: {
  points: [number, number, number][];
  active?: boolean;
  clip: THREE.Plane[];
}) {
  // Not flattened with g.scale: that would also scale the points and bury the flow in the flank.
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        Math.max(8, points.length * 2),
        active ? 0.032 : 0.024,
        8,
        false,
      ),
    [points, active],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color={active ? "#c4471d" : "#2c2421"}
        emissive={active ? "#ff5a1a" : "#000000"}
        emissiveIntensity={active ? 1.1 : 0}
        roughness={active ? 0.55 : 0.95}
        clippingPlanes={clip}
      />
    </mesh>
  );
}

/** Ballistic spatter: incandescent clots on parabolic paths from the vent or fissure. */
function Fountain({
  origins,
  height,
  count,
  clip,
}: {
  origins: (i: number) => [number, number, number];
  height: number;
  count: number;
  clip: THREE.Plane[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = useLabControls.getState().t,
      m = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const u = (t * 6 + i * 0.618) % 1,
        a = i * 2.399,
        spread = 0.08 + 0.12 * ((i * 0.37) % 1),
        [ox, oy, oz] = origins(i);
      m.position.set(
        ox + Math.cos(a) * spread * u,
        oy + height * (0.6 + 0.4 * ((i * 0.53) % 1)) * 4 * u * (1 - u),
        oz + Math.sin(a) * spread * u,
      );
      m.scale.setScalar(0.014 * (1 - 0.5 * u));
      m.updateMatrix();
      ref.current.setMatrixAt(i, m.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color="#ffb347" clippingPlanes={clip} toneMapped={false} />
    </instancedMesh>
  );
}

function LocalClipping() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const previous = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => {
      gl.localClippingEnabled = previous;
    };
  }, [gl]);
  return null;
}

export default function Volcanoes() {
  const { params, slice, t, trueScale } = useLabControls();
  useLabTick(1 / 9);
  const v = params.visc ?? 0.25,
    gas = params.gas ?? 0.45,
    fissure = params.fissure > 0.5,
    composite = v >= 0.5,
    k = trueScale ? TRUE_RELIEF : 1,
    { radius, height } = dims(v, k);
  const h = useMemo(() => landscape(v, fissure, k), [v, fissure, k]);
  const cut = slice > 0.001 ? (DEPTH / 2 + 0.1) * (1 - slice) ** 1.5 : SIZE;
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), SIZE)], []);
  clip[0].constant = cut;
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(h, SIZE, DEPTH, 176, BASE);
    paint(g, h, v, fissure, k);
    return g;
  }, [h, v, fissure, k]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // Gas alone can fragment even runny basalt; viscosity lowers the gas needed for an ash plume.
  const energetic = gas * (0.5 + 0.5 * v),
    plume = energetic > 0.48,
    fountaining = !plume && gas > 0.25 && v < 0.5;
  // Viscous lava cools and stops closer to the vent.
  const flow = useMemo(() => flowLine(h, radius, 1.6, 1 - 0.5 * v, 0.035), [h, radius, v]);
  const activeFlow = useMemo(
    () => flow.slice(0, Math.max(3, Math.round(3 + t * (flow.length - 3)))),
    [flow, t],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 170 && i < 1600; i++) {
      const x = -3.4 + 6.8 * ((i * 0.618034) % 1),
        z = -2.2 + 4.4 * ((i * 0.7548777) % 1),
        r = Math.hypot(x, z),
        n = fbm(x * 2.2 + 1, z * 2.2);
      const ok = fissure
        ? Math.abs(z) > 1.2 && n > 0.55
        : r > radius * (composite ? 0.5 : 0.6) && r < radius * 1.25 && n > 0.48;
      if (ok && z < cut - 0.05) out.push([x, h(x, z) - 0.01, z]);
    }
    return out;
  }, [h, radius, composite, fissure, cut]);
  const craterY = fissure ? 0 : h(0, 0);
  const sliced = slice > 0.001;
  return (
    <>
      <ScienceStudio
        slug="volcanoes"
        scale={
          fissure
            ? "Idealised linear vents · relative geometry · fountains and trees not to scale"
            : "Idealised forms · heights exaggerated about 2.5× · cut-away exposes the conduit and magma chamber"
        }
        trueScale={
          fissure
            ? "Teaching view unchanged: the fissure plain is already low relief · fountains and trees not to scale"
            : "Slopes reduced to about real proportions (shields about 4–8°, composite cones about 13–25° on average) · magma chamber and trees still schematic"
        }
        camera={[2.4, 2.6, 6.2]}
      >
        <LocalClipping />
        <mesh geometry={geometry} castShadow receiveShadow>
          <TerrainMaterial
            attach="material-0"
            kind="grass"
            color="#d0d0d0"
            vertexColors
            clippingPlanes={clip}
          />
          <RockMaterial attach="material-1" color="#a08a72" strata clippingPlanes={clip} />
        </mesh>
        {sliced && <CutFace h={h} cut={cut} composite={composite} fissure={fissure} clip={clip} />}
        <PlantStand
          kind={fissure ? "broadleaf" : composite ? "conifer" : "broadleaf"}
          positions={trees}
          scale={0.09}
          seed={6}
        />
        {!fissure ? (
          <group key="central-vent">
            <mesh position={[0, craterY + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[composite ? 0.1 : 0.13, 32]} />
              <meshStandardMaterial
                color="#d0461a"
                emissive="#ff6a1f"
                emissiveIntensity={1.4}
                clippingPlanes={clip}
              />
            </mesh>
            <pointLight
              position={[0, craterY + 0.25, 0]}
              color="#ff7a30"
              intensity={1.4}
              distance={1.6}
            />
            <LavaChannel points={activeFlow} active clip={clip} />
            {fountaining && (
              <Fountain
                origins={() => [0, craterY, 0]}
                height={0.25 + gas * 0.4}
                count={60}
                clip={clip}
              />
            )}
            <Tag
              pos={
                sliced && cut < 0.05
                  ? [radius * 0.8, height * 0.6 + 0.3, 0]
                  : [-radius * 0.9, height * 0.25 + 0.25, 0]
              }
              text={composite ? "Composite cone" : "Shield volcano"}
              note="A volcano’s shape builds up over many eruptions. Viscosity, eruption rate, gas, fragmentation and erosion all play a part; this is a comparison, not a prediction. Dark tongues are older lava flows; snow and forest are illustrative."
              occlude={false}
            />
          </group>
        ) : (
          <group key="fissure-vents">
            {Array.from({ length: 9 }, (_, i) => {
              const x = -1.45 + i * 0.36,
                side = i % 2 ? 1 : -1,
                reach = 0.12 + 0.6 * t * (0.7 + 0.3 * Math.sin(i * 2.1));
              return (
                <mesh
                  key={i}
                  position={[x, h(x, side * (0.1 + reach / 2)) + 0.008, side * (0.1 + reach / 2)]}
                  scale={[0.16, 0.012, reach / 2]}
                >
                  <sphereGeometry args={[1, 24, 12]} />
                  <meshStandardMaterial
                    color="#b8441f"
                    emissive="#ff5a1a"
                    emissiveIntensity={0.9}
                    clippingPlanes={clip}
                  />
                </mesh>
              );
            })}
            <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3.2, 0.05]} />
              <meshStandardMaterial
                color="#ff7a2a"
                emissive="#ff6a1f"
                emissiveIntensity={1.6}
                clippingPlanes={clip}
              />
            </mesh>
            <Fountain
              origins={(i) => [-1.5 + ((i * 0.618034) % 1) * 3, 0, 0]}
              height={0.18 + gas * 0.25}
              count={140}
              clip={clip}
            />
            <Tag
              pos={[0, 0.55, 0]}
              text="Fissure vents"
              note="A linear crack can erupt basalt as a 'curtain of fire', building low spatter ramparts. A fissure is a vent shape, not a type of magma."
              occlude={false}
            />
          </group>
        )}
        {sliced && cut < CHAMBER[2] && (
          <Tag
            pos={[CHAMBER[0] + 0.35, CHAMBER_Y, cut]}
            text="Magma chamber"
            tone="magma"
            note="Molten and partly crystalline rock collects in the crust below the volcano. Its size and depth here are schematic."
            occlude={false}
          />
        )}
        {sliced && cut < 0.05 && (
          <Tag
            pos={[fissure ? -1 : -0.5, fissure ? -0.4 : -0.3, cut]}
            text={fissure ? "Feeder dyke" : "Conduit"}
            tone="magma"
            note={
              fissure
                ? "Below a fissure, magma rises through a long, thin sheet-like crack called a dyke. Its width here is exaggerated."
                : "Magma and gas rise from the chamber to the vent through this pipe. Its width here is exaggerated."
            }
            occlude={false}
          />
        )}
        {sliced && cut < 0.05 && !fissure && (
          <Tag
            pos={[-0.7, height * 0.2, cut]}
            text={composite ? "Ash and lava layers" : "Thin basalt flows"}
            note={
              composite
                ? "A composite cone (stratovolcano) is built from alternating explosive ash layers and viscous lava flows."
                : "A shield is built from many thin, fluid basalt flows; dark lines mark weathered tops of older flows."
            }
            occlude={false}
          />
        )}
        {plume &&
          Array.from({ length: 11 }, (_, i) => {
            const u = (t + i / 11) % 1,
              rise = 0.08 + u * 2,
              a = i * 2.399,
              width = 0.1 + rise * 0.24;
            return (
              <CloudVolume
                key={i}
                position={[
                  (fissure ? -1.4 + (i % 5) * 0.7 : 0) + Math.cos(a) * rise * 0.08 + u * 0.35,
                  (fissure ? 0.05 : craterY) + rise,
                  Math.sin(a) * rise * 0.07,
                ]}
                scale={[width, 0.28 + rise * 0.12, width]}
                seed={i * 7 + 3}
                opacity={0.7 * (1 - u * 0.55)}
                tint="#8a8075"
              />
            );
          })}
      </ScienceStudio>
      <ScienceReadout>
        {"Viscosity "}
        {v.toFixed(2)} {"· Gas drive "}
        {gas.toFixed(2)} ·{" "}
        {fissure ? "fissure vents" : composite ? "steeper composite cone" : "broad shield"}.{" "}
        {plume
          ? "Gas is shattering the magma into an ash plume (shown qualitatively)."
          : fountaining
            ? "Gas-rich fluid basalt throws up lava fountains."
            : fissure
              ? "Lava emerges along the linear opening."
              : "The lava flow advances as the Process slider moves forward."}{" "}
        {
          "Use Cutaway to look inside the volcano. Gas, contact with water and ascent conditions also affect how explosive an eruption is; basalt can erupt explosively too."
        }
      </ScienceReadout>
    </>
  );
}
