import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { RockMaterial } from "../shared/rock-material";
import { WaterRibbon } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { farmland, fbm } from "../shared/hazard-utils";
import { Specimen } from "./specimens";
import { BASE, BODIES, FRONT, PER_KM, SX, SZ, riverZ, routePath, surface } from "./terrain";

type V3 = [number, number, number];
const smooth = THREE.MathUtils.smoothstep;
const RES = 720;

const SECTION_GLSL = /* glsl */ `
varying vec3 rcWorld;
uniform sampler2D uProfile;
uniform float uFrom,uTo,uTime,uTsel,uDsel,uPerKm;
float rcH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float rcN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(rcH(i),rcH(i+vec2(1.,0.)),f.x),mix(rcH(i+vec2(0.,1.)),rcH(i+vec2(1.,1.)),f.x),f.y);}
float rcSurface(float x){return texture2D(uProfile,vec2(clamp((x+${(SX / 2).toFixed(2)})/${SX.toFixed(2)},0.,1.),.5)).r;}
float rcRange(float x){return texture2D(uProfile,vec2(clamp((x+${(SX / 2).toFixed(2)})/${SX.toFixed(2)},0.,1.),.5)).g;}
float rcTemp(float x,float y){
  float g=17.+15.*exp(-pow((x-${BODIES.chamber.x.toFixed(2)})/.95,2.));
  return 12.+g*max(-y/uPerKm,0.);
}
// Rock colors along the section; id: 0 igneous, 1 sedimentary, 2 metamorphic, 3 sediment,
// 4 magma or partial melt, 5 older crust, 6 seawater.
vec3 rcRock(vec2 p,float ys,out vec3 glow,out float id){
  glow=vec3(0.);
  float g=rcN(p*90.)*.5+rcN(p*23.)*.5;
  if(p.y>ys){id=6.;return mix(vec3(.08,.3,.42),vec3(.12,.4,.52),smoothstep(-.25,0.,p.y));}
  vec2 ce=vec2((p.x-${BODIES.chamber.x.toFixed(2)})/${BODIES.chamber.a.toFixed(2)},(p.y-(${BODIES.chamber.y.toFixed(2)}))/${BODIES.chamber.b.toFixed(2)});
  float conduit=step(abs(p.x-${BODIES.chamber.x.toFixed(2)}+(p.y+.6)*.04),.032)*step(${BODIES.chamber.y.toFixed(2)},p.y);
  if(length(ce)<1.||conduit>.5){
    id=4.;
    vec3 m=mix(vec3(.72,.12,.03),vec3(1.,.55,.12),rcN(p*16.+vec2(0.,-uTime*.25)));
    glow=m*.9;return m*.35;
  }
  float meltTop=${BODIES.meltTop.toFixed(2)}+.1*exp(-pow((p.x-2.4)/.9,2.));
  if(p.y<meltTop&&p.x>1.25){
    // Migmatite: gray rock threaded with veins of melt.
    id=4.;
    float vein=smoothstep(.64,.7,rcN(vec2(p.x*15.,p.y*46.)+vec2(0.,uTime*.1)))*.85;
    glow=vec3(1.,.38,.07)*vein*.75;
    return mix(vec3(.4,.36,.35)*(.85+.3*g),vec3(.9,.42,.12),vein);
  }
  vec2 pe=vec2((p.x-${BODIES.pluton.x.toFixed(2)})/${BODIES.pluton.a.toFixed(2)},(p.y-(${BODIES.pluton.y.toFixed(2)}))/${BODIES.pluton.b.toFixed(2)});
  if(length(pe)<1.){
    id=0.;
    vec3 c=mix(vec3(.86,.72,.68),vec3(.78,.64,.6),g);
    c=mix(c,vec3(.12,.11,.12),step(.83,rcN(p*170.))*.85);
    return mix(c,vec3(.95,.93,.9),step(.86,rcN(p*120.+7.))*.6);
  }
  // Volcanic layers of the cone above the range.
  if(p.y>rcRange(p.x)+.004){
    id=0.;
    float band=fract((ys-p.y)*26.);
    return mix(vec3(.24,.22,.21),vec3(.42,.3,.25),step(.75,band))*(.85+.3*g);
  }
  if(p.x<-.85&&p.y>ys-.035){id=3.;return mix(vec3(.8,.72,.56),vec3(.66,.6,.5),rcN(p*140.));}
  float floorY=-.88+.66*smoothstep(-2.4,.95,p.x);
  if(p.y>floorY&&p.x<.95){
    // Beds thicken seaward and bend up toward the foothills; deeper beds are compacted.
    id=1.;
    float k=(p.y-floorY)/max(ys-floorY,.05),bed=k*11.,b=floor(bed);
    float kind=rcH(vec2(b,3.7));
    vec3 c=kind<.4?vec3(.8,.66,.46):kind<.75?vec3(.47,.44,.42):vec3(.78,.77,.7);
    c*=(.88+.24*g)*mix(.78,1.,k)*(.9+.1*smoothstep(0.,.08,fract(bed)));
    return c;
  }
  if(p.x>.75&&p.y>-1.32){
    // Folded, banded metamorphic rock in the root of the mountain range.
    id=2.;
    float band=fract(p.y*8.5+.5*sin(p.x*3.6+p.y*5.)+.35*rcN(p*4.5));
    vec3 c=mix(vec3(.64,.6,.57),vec3(.38,.36,.38),smoothstep(.35,.65,band));
    return mix(c,vec3(.82,.78,.74),step(.9,rcN(p*90.))*.5)*(.9+.2*g);
  }
  id=5.;
  return mix(vec3(.5,.47,.46),vec3(.42,.4,.4),rcN(p*8.))*(.88+.24*g);
}
`;

/** The front face of the block: the rock-cycle cross-section with isotherms. */
function SectionFace({
  from,
  to,
  time,
  temp,
  depth,
}: {
  from: number;
  to: number;
  time: number;
  temp: number;
  depth: number;
}) {
  const profile = useMemo(() => {
    const t = new THREE.DataTexture(
      new Float32Array(RES * 2),
      RES,
      1,
      THREE.RGFormat,
      THREE.FloatType,
    );
    t.magFilter = t.minFilter = THREE.NearestFilter;
    const data = t.image.data as Float32Array;
    for (let i = 0; i < RES; i++) {
      const x = -SX / 2 + (i / (RES - 1)) * SX;
      data[i * 2] = surface(x, FRONT);
      data[i * 2 + 1] = surface(x, FRONT, false);
    }
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => profile.dispose(), [profile]);
  const top = useMemo(() => {
    let m = 0;
    for (let i = 0; i < RES; i++) m = Math.max(m, (profile.image.data as Float32Array)[i * 2]);
    return m + 0.02;
  }, [profile]);
  const uniforms = useMemo(
    () => ({
      uProfile: { value: profile },
      uFrom: { value: 0 },
      uTo: { value: 0 },
      uTime: { value: 0 },
      uTsel: { value: 500 },
      uDsel: { value: -0.5 },
      uPerKm: { value: PER_KM },
    }),
    [profile],
  );
  uniforms.uFrom.value = from;
  uniforms.uTo.value = to;
  uniforms.uTime.value = time;
  uniforms.uTsel.value = temp;
  uniforms.uDsel.value = -depth * PER_KM;
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "varying vec3 rcWorld;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nrcWorld=(modelMatrix*vec4(transformed,1.)).xyz;",
        );
      s.fragmentShader = (SECTION_GLSL + s.fragmentShader)
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
  vec2 rp=rcWorld.xy;
  float rys=rcSurface(rp.x);
  if(rp.y>max(rys,rp.x<-1.15?0.:rys))discard;
  vec3 rGlow;float rId;
  vec3 rCol=rcRock(rp,rys,rGlow,rId);
  // The route's start and end bodies brighten gently.
  float rLit=(abs(rId-uFrom)<.5||abs(rId-uTo)<.5)?1.:0.;
  rCol*=1.+rLit*(.18+.08*sin(uTime*4.));
  float rT=rcTemp(rp.x,min(rp.y,rys));
  float rIso=(1.-smoothstep(1.5,5.,abs(rT-200.*floor(rT/200.+.5))))*step(.45,fract(rp.x*7.))*step(rp.y,rys-.01)*step(.5,rT/200.);
  rCol=mix(rCol,vec3(1.,.78,.55),rIso*.6);
  float rSel=(1.-smoothstep(2.,7.,abs(rT-uTsel)))*step(rp.y,rys-.005);
  rCol=mix(rCol,vec3(1.,.55,.15),rSel*.9);
  float rDep=(1.-smoothstep(.003,.008,abs(rp.y-uDsel)))*step(.5,fract(rp.x*9.));
  rCol=mix(rCol,vec3(1.),rDep*.9);`,
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\n  diffuseColor.rgb*=pow(rCol,vec3(2.2));",
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n  totalEmissiveRadiance+=pow(rGlow,vec3(2.2))*1.4+vec3(1.,.5,.15)*rSel*.25;",
        );
    },
    [uniforms],
  );
  return (
    <mesh position={[0, (BASE + top) / 2, FRONT + 0.001]} scale={[SX, top - BASE, 1]}>
      <planeGeometry />
      <meshStandardMaterial
        color="white"
        roughness={0.9}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "rock-cycle-section-v1"}
      />
    </mesh>
  );
}

function paint(g: THREE.BufferGeometry, n: number) {
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3),
    col = new THREE.Color(),
    tone = new THREE.Color(),
    top = (n + 1) * (n + 1);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      nz = fbm(x * 2.3 + 1, z * 2.3);
    if (i >= top) {
      col.set("#6f6156");
    } else if (x < -1.15 && y < 0.01) {
      col.set("#9c8f74").lerp(tone.set("#c9b88e"), smooth(y, -0.12, 0));
    } else {
      col.copy(farmland(x, z, 0.4)).lerp(tone.set("#4c6a3a"), smooth(nz, 0.5, 0.62) * 0.9);
      col.lerp(tone.set("#d8c8a0"), 1 - smooth(x, -1.15, -0.9));
      col.lerp(tone.set("#5e7449"), smooth(y, 0.12, 0.28));
      col.lerp(tone.set("#857a6c").lerp(tone.clone().set("#6c645b"), nz), smooth(y, 0.36, 0.55));
      col.lerp(tone.set("#eef1f2"), smooth(y, 0.7, 0.8) * smooth(nz, 0.25, 0.5));
      // The cone is dark lava and ash, red-brown near the crater.
      const dv = Math.hypot(x - BODIES.volcano.x, (z - BODIES.volcano.z) * 1.1) / BODIES.volcano.r;
      if (dv < 1)
        col.lerp(tone.set(dv < 0.2 ? "#6a3426" : "#3f3934"), (1 - smooth(dv, 0.75, 1)) * 0.9);
      // Granite exposed by erosion on the foothills near the front.
      const gr = Math.hypot((x - BODIES.pluton.x) / 0.42, (z - FRONT) / 0.7);
      if (gr < 1) col.lerp(tone.set("#c9aea3"), (1 - smooth(gr, 0.6, 1)) * 0.85);
    }
    c.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
}

/**
 * The rock cycle in its landscape: the selected pathway runs between the places where it
 * happens, while the temperature and pressure sliders mark an isotherm and a depth.
 */
export function RockLandscape({
  route,
  from,
  to,
  t,
  temp,
  depthKm,
}: {
  route: number;
  from: number;
  to: number;
  t: number;
  temp: number;
  depthKm: number;
}) {
  const n = 220;
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(surface, SX, SZ, n, BASE);
    paint(g, n);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const river = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i): V3 => {
        const x = 1.55 - (i / 69) * 2.8,
          z = riverZ(x);
        return [x, surface(x, z) + 0.012, z];
      }),
    [],
  );
  const trees = useMemo(() => {
    const out: V3[] = [];
    for (let i = 0; out.length < 150 && i < 3000; i++) {
      const x = -1 + 3.6 * ((i * 0.618034) % 1),
        z = -SZ / 2 + 0.1 + (SZ - 0.2) * ((i * 0.7548777) % 1),
        y = surface(x, z);
      const dv = Math.hypot(x - BODIES.volcano.x, (z - BODIES.volcano.z) * 1.1) / BODIES.volcano.r;
      if (
        y > 0.04 &&
        y < 0.5 &&
        dv > 1 &&
        fbm(x * 2.3 + 1, z * 2.3) > 0.52 &&
        Math.abs(z - riverZ(x)) > 0.12
      )
        out.push([x, y - 0.005, z]);
    }
    return out;
  }, []);
  const path = useMemo(() => routePath(route), [route]);
  const points = useMemo(() => path.map(([x, y]): V3 => [x, y, FRONT + 0.03]), [path]);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q))),
    [points],
  );
  const k = 0.08 + t * 0.84,
    token = curve.getPoint(k);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d6d6d6" vertexColors />
        <RockMaterial attach="material-1" color="#8e7f72" strata />
      </mesh>
      <SectionFace from={from} to={to} time={t * 20} temp={temp} depth={depthKm} />
      <mesh position={[-(SX / 2 + 1.15) / 2, -0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SX / 2 - 1.15, SZ]} />
        <FlowWaterMaterial color="#1f5f7a" opacity={0.86} speed={0.15} />
      </mesh>
      <WaterRibbon path={river} width={0.07} color="#3f86a2" />
      <PlantStand kind="conifer" positions={trees} scale={0.06} seed={17} />
      {/* The volcano's vent glows faintly. */}
      <mesh
        position={[
          BODIES.volcano.x,
          surface(BODIES.volcano.x, BODIES.volcano.z) + 0.012,
          BODIES.volcano.z,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.06, 24]} />
        <meshStandardMaterial color="#b8461d" emissive="#ff6a1f" emissiveIntensity={1.2} />
      </mesh>
      <Line points={points} color="#ffe2a8" lineWidth={3.2} dashed dashSize={0.07} gapSize={0.04} />
      <mesh position={token}>
        <sphereGeometry args={[0.07, 24, 16]} />
        <meshBasicMaterial color="#ffe9b8" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <group position={token} scale={0.11}>
        <Specimen kind={k < 0.5 ? from : to} />
      </group>
    </group>
  );
}
