import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { SectionMaterial } from "../shared/section-material";
import { landscapeNoise, landscapeRandom as random } from "../shared/landscape-noise";
import { GraniteMaterial } from "./granite-material";

/**
 * A broken hand specimen: the intersection of randomly oriented fracture planes gives flat,
 * chipped faces, with a little roughness on top. Scale stretches it into a block or slab.
 */
function rockGeometry(seed: number, scale: [number, number, number], planes = 14) {
  const g = new THREE.IcosahedronGeometry(1, 5),
    p = g.attributes.position,
    cuts = Array.from({ length: planes }, (_, k) => {
      const u = random(seed * 31 + k * 7) * 2 - 1,
        a = random(seed * 17 + k * 13) * Math.PI * 2,
        r = Math.sqrt(1 - u * u);
      return {
        n: new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a)),
        h: 0.78 + 0.2 * random(seed * 5 + k * 3),
      };
    }),
    d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let r = 1.15;
    for (const c of cuts) {
      const k = d.dot(c.n);
      if (k > 0.05) r = Math.min(r, c.h / k);
    }
    r *= 1 + 0.025 * (landscapeNoise(d.x * 6 + seed, d.y * 6 + d.z * 4) - 0.5);
    p.setXYZ(i, d.x * r * scale[0], d.y * r * scale[1], d.z * r * scale[2]);
  }
  g.computeVertexNormals();
  return g;
}

function useRock(seed: number, scale: [number, number, number]) {
  const key = scale.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(() => rockGeometry(seed, scale), [seed, key]);
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

/** Sandstone: sets of cross-laminae between flat bedding surfaces, with grain speckle. */
const SANDSTONE = `
vec3 sectionColour(vec3 p,vec3 w){
  float bedY=p.y*5.2+.08*sNoise(vec2(p.x*2.,p.z*2.));
  float bset=floor(bedY),f=fract(bedY),h=sHash(vec2(bset,1.7));
  float lam=fract((p.y+(p.x*.55+p.z*.2)*(.6+.5*h))*46.);
  vec3 c=mix(vec3(.78,.62,.43),vec3(.66,.50,.34),h);
  c*=mix(.9,1.06,smoothstep(.2,.8,lam));
  c*=mix(.7,1.,smoothstep(0.,.06,f));
  float g=grain(p.xy*1.4+p.zy);
  c*=mix(.9,1.1,g);
  c=mix(c,vec3(.95,.92,.86),smoothstep(.82,.9,sNoise(p.xz*90.+p.y*40.))*.5);
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/** Gneiss: folded dark (biotite-rich) and pale (quartz-feldspar) bands with feldspar augen. */
const GNEISS = `
vec3 sectionColour(vec3 p,vec3 w){
  float fold=.08*sin(p.x*3.4+p.z*1.3)+.03*sin(p.x*9.+p.z*7.);
  float b=fract((p.y+fold)*7.5+.2*sNoise(vec2(p.x*3.,p.z*3.)));
  float dark=smoothstep(.55,.62,b)*(1.-smoothstep(.8,.86,b))*(.75+.25*sNoise(vec2(p.x*6.,p.y*20.)));
  vec3 light=mix(vec3(.86,.83,.78),vec3(.80,.70,.64),sNoise(vec2(p.x*20.,p.y*30.)));
  vec3 c=mix(light,vec3(.27,.27,.28),dark);
  // Pink feldspar augen strung out along the light bands.
  float aug=smoothstep(.72,.8,sNoise(vec2((p.x+p.z)*9.,(p.y+fold)*26.)))*(1.-dark);
  c=mix(c,vec3(.84,.58,.50),aug*.8);
  return c*mix(.9,1.08,grain(p.xy+p.zy));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

function Igneous() {
  const g = useRock(3, [0.6, 0.55, 0.52]);
  return (
    <mesh geometry={g} castShadow receiveShadow>
      <GraniteMaterial />
    </mesh>
  );
}

function Sedimentary() {
  const g = useRock(11, [0.68, 0.46, 0.5]);
  return (
    <mesh geometry={g} castShadow receiveShadow>
      <SectionMaterial glsl={SANDSTONE} cacheKey="specimen-sandstone" roughness={0.95} />
    </mesh>
  );
}

function Metamorphic() {
  const g = useRock(23, [0.66, 0.44, 0.52]);
  return (
    <mesh geometry={g} castShadow receiveShadow rotation={[0.15, 0.4, -0.12]}>
      <SectionMaterial glsl={GNEISS} cacheKey="specimen-gneiss" roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

/** Loose sediment: a heap mixing sand, granules and rounded pebbles of several rock types. */
const SEDIMENT_PALETTE = ["#d9cdb2", "#c9a882", "#a88d6c", "#8b8073", "#c79a7a", "#e6dfd0"];
function Sediment() {
  const ref = useRef<THREE.InstancedMesh>(null),
    count = 420;
  useLayoutEffect(() => {
    if (!ref.current) return;
    const o = new THREE.Object3D(),
      c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 0.52 * Math.sqrt(random(i + 3)),
        a = random(i + 91) * Math.PI * 2,
        pebble = random(i + 47) > 0.93,
        size = pebble ? 0.035 + 0.025 * random(i + 5) : 0.012 + 0.012 * random(i + 9);
      o.position.set(
        r * Math.cos(a),
        0.26 * (1 - (r / 0.52) ** 1.4) * random(i + 13) ** 0.4 + size * 0.5,
        r * Math.sin(a),
      );
      o.scale.set(size * (1 + 0.3 * random(i)), size * (0.7 + 0.3 * random(i + 1)), size);
      o.rotation.set(random(i + 2) * 6, random(i + 4) * 6, random(i + 6) * 6);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
      ref.current.setColorAt(i, c.set(SEDIMENT_PALETTE[Math.floor(random(i + 8) * 6)]));
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

/** Magma: a dark chilled crust broken by glowing cracks; the glow is a visual cue for heat. */
function Magma() {
  const g = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.56, 6),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        v = 1 + 0.06 * (landscapeNoise(x * 4 + 2, z * 4 + y * 3) - 0.5);
      p.setXYZ(i, x * v, y * v * 0.72, z * v);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => g.dispose(), [g]);
  const clock = useMemo(() => ({ value: 0 }), []);
  useFrame(() => {
    clock.value = useLabControls.getState().t * 6;
  });
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.uniforms.uClock = clock;
      s.vertexShader =
        "varying vec3 lavaP;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nlavaP=position;",
        );
      s.fragmentShader =
        `varying vec3 lavaP; uniform float uClock;
vec3 lavaHash(vec3 p){return fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453);}
float lavaCrack(vec3 q){
  vec3 c=floor(q),f=fract(q);float a=9.,b=9.;
  for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){
    vec3 n=vec3(float(i),float(j),float(k)),o=lavaHash(c+n);
    float d=length(n+o-f);if(d<a){b=a;a=d;}else b=min(b,d);}
  return b-a;
}\n` +
        s.fragmentShader
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
float crack=1.-smoothstep(.01,.06,lavaCrack(lavaP*7.+vec3(0.,uClock*.05,0.)));
diffuseColor.rgb=mix(vec3(.10,.08,.08),vec3(.35,.12,.05),crack);`,
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
float glow=1.-smoothstep(.01,.07,lavaCrack(lavaP*7.+vec3(0.,uClock*.05,0.)));
float pulse=.85+.15*sin(uClock*2.+lavaP.x*9.);
totalEmissiveRadiance+=mix(vec3(1.,.32,.05),vec3(1.,.75,.3),glow*glow)*glow*1.1*pulse+vec3(.06,.015,0.);`,
          );
    },
    [clock],
  );
  return (
    <mesh geometry={g} castShadow>
      <meshStandardMaterial
        color="white"
        roughness={0.85}
        emissive="#000000"
        onBeforeCompile={compile}
        customProgramCacheKey={() => "magma-crust-v1"}
      />
    </mesh>
  );
}

/** A low stone display plinth so each specimen reads as an object rather than floating. */
function Plinth() {
  return (
    <mesh position={[0, -0.5, 0]} receiveShadow>
      <cylinderGeometry args={[0.55, 0.6, 0.08, 48]} />
      <meshStandardMaterial color="#d9d4ca" roughness={0.7} />
    </mesh>
  );
}

export function Specimen({ kind, plinth = false }: { kind: number; plinth?: boolean }) {
  return (
    <>
      {kind === 0 ? (
        <Igneous />
      ) : kind === 1 ? (
        <Sedimentary />
      ) : kind === 2 ? (
        <Metamorphic />
      ) : kind === 3 ? (
        <group position={[0, -0.46, 0]}>
          <Sediment />
        </group>
      ) : (
        <Magma />
      )}
      {plinth && kind !== 4 && <Plinth />}
    </>
  );
}
