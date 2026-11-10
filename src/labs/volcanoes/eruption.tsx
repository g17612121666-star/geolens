import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cloudNoiseGLSL } from "../shared/cloud-material";
import { fbm } from "../shared/hazard-utils";
import { useKeyLight } from "../shared/key-light";

type V3 = [number, number, number];

const COLUMN_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;

const COLUMN_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uMin,uMax,uVent,uSun;
uniform float uH,uPower,uWind,uTime,uOpacity,uGasPlume;
varying vec3 vWorld;
${cloudNoiseGLSL}
// Density of an eruption column: a turbulent jet that widens as it entrains air and bends
// downwind, then spreads as an umbrella cloud where it is no longer buoyant. Ash falls out
// in streaks beneath the downwind umbrella.
float plume(vec3 w){
  vec3 p=w-uVent;
  p.x*=sign(uWind);
  float wind=abs(uWind),y=p.y,hy=y/uH;
  if(uGasPlume>.5){
    // A bent-over plume of steam and gas: it rises a little, then drifts and spreads downwind.
    float drift=wind*pow(max(hy,0.),1.4)*1.6;
    vec2 d=vec2(p.x-drift,p.z);
    float travel=max(p.x,0.)+y;
    float rad=.05+.16*travel;
    float n=cloudNoise(vec3(p.x*3.2-uTime*.6,y*3.2,p.z*3.2));
    float g=(1.-length(vec2(d.x*.55,d.y))/rad)*1.2+(n-.5)*1.3;
    return g*smoothstep(-.01,.06,y)*(1.-smoothstep(.75,1.,hy));
  }
  float bend=wind*hy*hy*.4;
  vec2 d=vec2(p.x-bend,p.z);
  float rad=mix(.085,.34,clamp(hy,0.,1.))*(.75+.5*uPower);
  // Billows rise with the jet; the dense core near the vent is less ragged.
  float n=cloudNoise(vec3(d.x*3.,(y-uTime*.8)*2.4,d.y*3.));
  float col=(1.-length(d)/rad)*1.3+(n-.55)*mix(.7,1.5,smoothstep(0.,.5,hy));
  col=min(col,(1.06-hy)*5.);
  // Umbrella: a domed, flat-bottomed cloud spreading outward, stretched downwind.
  vec3 u=vec3(p.x-bend-wind*.75,y-uH-.04,p.z);
  float spanX=(u.x<0.?.45:.85+.8*wind)+.4*uPower,spanZ=.5+.3*uPower;
  float thick=(u.y>0.?.24:.1)+.07*uPower;
  float n2=cloudNoise(vec3(p.x*2.1-uTime*.25,y*2.6,p.z*2.1)+7.);
  float umb=(1.-length(vec3(u.x/spanX,u.y/thick,u.z/spanZ)))*1.5+(n2-.5)*1.2;
  // Faint curtains of falling ash under the downwind half of the umbrella.
  float under=smoothstep(.02,-.06,u.y)*smoothstep(-.55,-.1,u.y)
    *smoothstep(.0,.35,u.x/spanX)*(1.-smoothstep(.5,.95,length(vec2(u.x/spanX-.45,u.z/spanZ*1.4))));
  float streaks=smoothstep(.45,.75,cloudNoise(vec3(p.x*4.,y*.5-uTime*.4,p.z*4.)));
  float fall=under*streaks*.2;
  return max(max(col,umb),fall);
}
void main(){
  vec3 ro=cameraPosition,rd=normalize(vWorld-cameraPosition);
  vec3 inv=1./rd,t0=(uMin-ro)*inv,t1=(uMax-ro)*inv,tn=min(t0,t1),tf=max(t0,t1);
  float a=max(max(tn.x,tn.y),max(tn.z,0.)),b=min(min(tf.x,tf.y),tf.z);
  if(b<=a)discard;
  float stepSize=(b-a)/float(STEPS),T=1.;
  float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  vec3 acc=vec3(0.);
  vec3 dark=mix(vec3(.2,.18,.17),vec3(.5,.56,.62),uGasPlume);
  vec3 lit=mix(vec3(.66,.61,.56),vec3(.97,.98,.99),uGasPlume);
  for(int i=0;i<STEPS;i++){
    vec3 p=ro+rd*(a+(float(i)+jitter)*stepSize);
    float d=plume(p);
    if(d>.02){
      float dens=smoothstep(.0,.55,d);
      float shade=exp(-max(plume(p+uSun*.11),0.)*1.5);
      float hy=(p.y-uVent.y)/uH;
      vec3 c=mix(dark,lit,shade*(.55+.45*smoothstep(-.2,1.1,hy)));
      // Incandescent fragments light the base of an ash column from inside.
      c+=vec3(1.,.42,.12)*exp(-max(hy,0.)*7.)*1.1*(1.-uGasPlume);
      float alpha=1.-exp(-dens*stepSize*uOpacity*20.);
      acc+=T*alpha*c;T*=1.-alpha;
      if(T<.02)break;
    }
  }
  float alpha=1.-T;if(alpha<.01)discard;
  gl_FragColor=vec4(pow(acc/alpha,vec3(2.2)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Ray-marched eruption column with an umbrella cloud, or (gas) a pale plume of steam and
 * volcanic gases drifting from a lava lake. Shapes are illustrative, not modeled.
 */
export function EruptionColumn({
  vent,
  height,
  power,
  wind,
  time,
  gas = false,
  opacity = 1,
  steps = 44,
}: {
  vent: V3;
  /** Height of the umbrella above the vent, scene units. */
  height: number;
  power: number;
  /** Drift of the umbrella along x (negative: toward -x), scene units. */
  wind: number;
  time: number;
  gas?: boolean;
  opacity?: number;
  steps?: number;
}) {
  const sun = useKeyLight();
  // Extents along the wind (positive downwind), then mapped to world x.
  const w = Math.abs(wind),
    dir = Math.sign(wind) || 1,
    up = -(0.5 + 0.4 * power),
    down = w * 1.15 + 0.85 + 0.8 * w + 0.4 * power + 0.2,
    min: V3 = [vent[0] + Math.min(up * dir, down * dir), vent[1], -0.62 - 0.35 * power],
    max: V3 = [
      vent[0] + Math.max(up * dir, down * dir),
      vent[1] + height + 0.36 + 0.1 * power,
      0.62 + 0.35 * power,
    ];
  const uniforms = useMemo(
    () => ({
      uMin: { value: new THREE.Vector3() },
      uMax: { value: new THREE.Vector3() },
      uVent: { value: new THREE.Vector3() },
      uSun: { value: sun },
      uH: { value: 1 },
      uPower: { value: 0.5 },
      uWind: { value: 0.5 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uGasPlume: { value: 0 },
    }),
    [sun],
  );
  uniforms.uMin.value.set(...min);
  uniforms.uMax.value.set(...max);
  uniforms.uVent.value.set(...vent);
  uniforms.uH.value = height;
  uniforms.uPower.value = power;
  uniforms.uWind.value = wind;
  uniforms.uTime.value = time;
  uniforms.uOpacity.value = opacity;
  uniforms.uGasPlume.value = gas ? 1 : 0;
  return (
    <mesh
      position={[(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]}
      scale={[max[0] - min[0], max[1] - min[1], max[2] - min[2]]}
      renderOrder={6}
      frustumCulled={false}
    >
      <boxGeometry />
      <shaderMaterial
        vertexShader={COLUMN_VERTEX}
        fragmentShader={COLUMN_FRAGMENT}
        defines={{ STEPS: steps }}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/**
 * Incandescent lava clots on ballistic paths: a Hawaiian fountain from a central vent or a
 * "curtain of fire" along a fissure. Positions come from the clock in the vertex shader.
 */
export function LavaFountain({
  origins,
  height,
  spread,
  time,
  size = 0.034,
}: {
  /** Launch point of each clot. */
  origins: V3[];
  height: number;
  /** Horizontal reach as a fraction of the height. */
  spread: number;
  time: number;
  size?: number;
}) {
  const count = origins.length;
  const geometry = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute("position", quad.attributes.position);
    g.setAttribute("uv", quad.attributes.uv);
    g.instanceCount = count;
    const launch = new Float32Array(count * 4),
      origin = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = (n: number) => {
        const s = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };
      launch.set([r(1) * Math.PI * 2, r(2) ** 1.6, 0.55 + 0.45 * Math.sqrt(r(3)), r(4)], i * 4);
      origin.set(origins[i], i * 3);
    }
    g.setAttribute("aLaunch", new THREE.InstancedBufferAttribute(launch, 4));
    g.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(origin, 3));
    return g;
  }, [count, origins]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: 1 },
      uSpread: { value: 0.3 },
      uSize: { value: 0.02 },
    }),
    [],
  );
  uniforms.uTime.value = time;
  uniforms.uHeight.value = height;
  uniforms.uSpread.value = spread;
  uniforms.uSize.value = size;
  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={7}>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={
          /* glsl */ `
attribute vec4 aLaunch; attribute vec3 aOrigin;
uniform float uTime,uHeight,uSpread,uSize;
varying float vAge; varying vec2 vUv;
void main(){
  float u=fract(uTime*(.5+.3*aLaunch.z)+aLaunch.w);
  float h=uHeight*aLaunch.z*aLaunch.z;
  float reach=aLaunch.y*uHeight*uSpread*u;
  vec3 pos=aOrigin+vec3(sin(aLaunch.x)*reach,4.*h*u*(1.-u),cos(aLaunch.x)*reach);
  vAge=u; vUv=uv;
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  mv.xy+=position.xy*uSize*(1.15-.5*u)*(.6+.8*fract(aLaunch.w*7.3));
  gl_Position=projectionMatrix*mv;
}`
        }
        fragmentShader={
          /* glsl */ `
varying float vAge; varying vec2 vUv;
void main(){
  float d=length(vUv-.5)*2.;
  float core=1.-smoothstep(.0,.5,d),halo=(1.-smoothstep(.15,1.,d))*.4;
  float a=max(core,halo)*(1.-smoothstep(.8,1.,vAge)*.7);
  if(a<.02)discard;
  vec3 hot=vec3(1.,.86,.5),mid=vec3(1.,.5,.12),cool=vec3(.55,.12,.04);
  vec3 c=vAge<.4?mix(hot,mid,vAge/.4):mix(mid,cool,(vAge-.4)/.6);
  a*=smoothstep(.0,.06,vAge);
  gl_FragColor=vec4(pow(c,vec3(2.2))*(.85+.35*core),a);
  #include <colorspace_fragment>
}`
        }
      />
    </mesh>
  );
}

const VORONOI_GLSL = /* glsl */ `
vec2 lvHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
// Distance to the nearest edge between drifting crust plates.
float lvEdge(vec2 x,float time){
  vec2 n=floor(x),f=fract(x),mg=vec2(0.),mr=vec2(0.);
  float md=8.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j)),o=lvHash(n+g);
    o=.5+.38*sin(time+6.2831*o);
    vec2 r=g+o-f;float d=dot(r,r);
    if(d<md){md=d;mr=r;mg=g;}
  }
  md=8.;
  for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){
    vec2 g=mg+vec2(float(i),float(j)),o=lvHash(n+g);
    o=.5+.38*sin(time+6.2831*o);
    vec2 r=g+o-f;
    if(dot(mr-r,mr-r)>1e-5)md=min(md,dot(.5*(mr+r),normalize(r-mr)));
  }
  return md;
}`;

/** Shared hook: a MeshStandardMaterial whose color and glow come from a GLSL snippet. */
function useLavaShader(
  key: string,
  uniforms: Record<string, THREE.IUniform>,
  header: string,
  body: string,
  vertexVarying = "",
  vertexBody = "",
) {
  return useMemo(
    () => ({
      onBeforeCompile: (s: THREE.WebGLProgramParametersWithUniforms) => {
        Object.assign(s.uniforms, uniforms);
        s.vertexShader = (
          "varying vec3 lvWorld;\n" +
          vertexVarying +
          "\n" +
          s.vertexShader
        ).replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\nlvWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n${vertexBody}`,
        );
        s.fragmentShader = ("varying vec3 lvWorld;\n" + header + "\n" + s.fragmentShader)
          .replace(
            "#include <clipping_planes_fragment>",
            `#include <clipping_planes_fragment>\n  vec3 lvColor=vec3(1.),lvGlow=vec3(0.);\n${body}`,
          )
          .replace(
            "#include <color_fragment>",
            "#include <color_fragment>\n  diffuseColor.rgb*=pow(lvColor,vec3(2.2));",
          )
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\n  totalEmissiveRadiance+=pow(lvGlow,vec3(2.2))*1.5;",
          );
      },
      customProgramCacheKey: () => key,
    }),
    // The uniforms object is stable for the material's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, uniforms],
  );
}

/** A lava lake: dark crust plates drifting apart over glowing lava, brightest at the edges. */
export function LavaLake({
  position,
  radius,
  time,
  clip,
}: {
  position: V3;
  radius: number;
  time: number;
  clip: THREE.Plane[];
}) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 0.1 },
    }),
    [],
  );
  uniforms.uTime.value = time;
  uniforms.uCenter.value.set(...position);
  uniforms.uRadius.value = radius;
  const shader = useLavaShader(
    "volcano-lava-lake",
    uniforms,
    `uniform float uTime,uRadius; uniform vec3 uCenter;\n${VORONOI_GLSL}`,
    `vec2 lq=(lvWorld.xz-uCenter.xz)/uRadius;
  float lr=length(lq);
  float edge=lvEdge(lq*3.2+vec2(uTime*.05,0.),uTime*.35);
  float crack=1.-smoothstep(.015,.07,edge);
  float rim=smoothstep(.72,1.,lr);
  float heat=max(crack,rim*.9);
  lvColor=mix(vec3(.12,.1,.09),vec3(.9,.3,.06),heat);
  lvGlow=mix(vec3(1.,.4,.08),vec3(1.,.72,.3),crack*crack)*heat;`,
  );
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 48]} />
      <meshStandardMaterial
        color="white"
        roughness={0.55}
        metalness={0.1}
        clippingPlanes={clip}
        clipIntersection
        {...shader}
      />
    </mesh>
  );
}

/**
 * An active lava flow draped over the ground: an incandescent channel near the vent under a
 * crust that thickens and darkens downstream and toward the margins. `front` (0..1) sets how
 * far it has advanced; viscous flows are crustier and blockier.
 */
export function LavaFlow({
  points,
  surface,
  width,
  thickness,
  front,
  viscosity,
  time,
  clip,
}: {
  points: [number, number][];
  surface: (x: number, z: number) => number;
  width: number;
  thickness: number;
  front: number;
  viscosity: number;
  time: number;
  clip: THREE.Plane[];
}) {
  const { geometry, length } = useMemo(() => {
    const across = [-1, -0.5, 0, 0.5, 1],
      pos: number[] = [],
      flow: number[] = [],
      index: number[] = [];
    let s = 0;
    points.forEach(([x, z], j) => {
      const [ax, az] = points[Math.max(0, j - 1)],
        [bx, bz] = points[Math.min(points.length - 1, j + 1)],
        tl = Math.hypot(bx - ax, bz - az) || 1,
        nx = -(bz - az) / tl,
        nz = (bx - ax) / tl,
        w = width * (0.75 + 0.5 * (j / points.length));
      if (j) s += Math.hypot(x - points[j - 1][0], z - points[j - 1][1]);
      for (const c of across) {
        const px = x + nx * c * w,
          pz = z + nz * c * w;
        pos.push(px, surface(px, pz) + 0.006 + thickness * (1 - c * c), pz);
        flow.push(s, c);
      }
    });
    for (let j = 0; j < points.length - 1; j++)
      for (let i = 0; i < across.length - 1; i++) {
        const a = j * across.length + i,
          b = a + across.length;
        index.push(a, a + 1, b, a + 1, b + 1, b);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aFlow", new THREE.Float32BufferAttribute(flow, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return { geometry: g, length: s };
  }, [points, surface, width, thickness]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFront: { value: 1 },
      uWidth: { value: 0.06 },
      uLength: { value: 1 },
      uVisc: { value: 0 },
    }),
    [],
  );
  uniforms.uTime.value = time;
  uniforms.uFront.value = front * length;
  uniforms.uWidth.value = width;
  uniforms.uLength.value = length;
  uniforms.uVisc.value = viscosity;
  const shader = useLavaShader(
    "volcano-lava-flow",
    uniforms,
    `uniform float uTime,uFront,uWidth,uLength,uVisc; varying vec2 vFlow;
float lfH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float lfN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(lfH(i),lfH(i+vec2(1.,0.)),f.x),mix(lfH(i+vec2(0.,1.)),lfH(i+vec2(1.,1.)),f.x),f.y);}`,
    `float fs=vFlow.x,fc=vFlow.y;
  float tip=uFront-uWidth*.9*(1.-sqrt(max(0.,1.-fc*fc)));
  if(fs>tip)discard;
  float down=fs/max(uFront,.05);
  // Crust plates ride downstream; their joints glow where the crust has torn.
  vec2 cq=vec2((fs-uTime*.08*(1.-.7*uVisc))/uWidth*1.6,fc*1.7);
  float plates=lfN(cq*2.)*.6+lfN(cq*5.3)*.4;
  float joint=1.-smoothstep(.03,.12,abs(plates-.5));
  float channel=(1.-smoothstep(.2,.9,abs(fc)))*(1.-smoothstep(.1,.8,down))*(1.-uVisc*.8);
  float front=smoothstep(.0,uWidth*1.5,uFront-fs);
  float heat=clamp(max(channel,joint*(.55-.35*down))*(1.-uVisc*.45),0.,1.)*front;
  float blocks=lfN(vec2(fs,fc*uWidth)*55.);
  lvColor=mix(vec3(.11,.095,.09)*(.8+.4*blocks),vec3(.85,.28,.06),heat);
  lvGlow=mix(vec3(.95,.32,.06),vec3(1.,.66,.25),channel)*heat;`,
    "attribute vec2 aFlow; varying vec2 vFlow;",
    "vFlow=aFlow;",
  );
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="white"
        roughness={0.8}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        clippingPlanes={clip}
        clipIntersection
        {...shader}
      />
    </mesh>
  );
}

/** A lava dome: a steep pile of sticky lava with a blocky crust and glowing cracks. */
export function LavaDome({
  position,
  radius,
  time,
  clip,
}: {
  position: V3;
  radius: number;
  time: number;
  clip: THREE.Plane[];
}) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 72, 36);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        bump =
          1 +
          0.16 * (fbm(x * 2.2 + 3, z * 2.2 + y * 1.7) - 0.5) +
          0.07 * (fbm(x * 7, z * 7 - y * 5) - 0.5);
      p.setXYZ(i, x * bump, Math.max(-0.4, y) * 0.72 * bump, z * bump);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  uniforms.uTime.value = time;
  const shader = useLavaShader(
    "volcano-lava-dome",
    uniforms,
    `uniform float uTime;
float ldH(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float ldN(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(ldH(i),ldH(i+vec3(1,0,0)),f.x),mix(ldH(i+vec3(0,1,0)),ldH(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(ldH(i+vec3(0,0,1)),ldH(i+vec3(1,0,1)),f.x),mix(ldH(i+vec3(0,1,1)),ldH(i+vec3(1,1,1)),f.x),f.y),f.z);}`,
    `vec3 dp=lvWorld*38.;
  float blocks=ldN(dp)*.6+ldN(dp*2.3)*.4;
  float crack=1.-smoothstep(.02,.09,abs(blocks-.5));
  float pulse=.75+.25*sin(uTime*1.3+blocks*9.);
  lvColor=mix(vec3(.24,.21,.19),vec3(.42,.38,.34),ldN(dp*.7))*(.85+.3*blocks);
  lvGlow=vec3(1.,.4,.08)*crack*pulse*.9;
  if(!gl_FrontFacing){lvColor=vec3(.4,.1,.03);lvGlow=vec3(.95,.32,.06)*(.7+.3*blocks);}`,
  );
  return (
    <mesh geometry={geometry} position={position} scale={radius} castShadow>
      <meshStandardMaterial
        color="white"
        roughness={0.9}
        side={THREE.DoubleSide}
        clippingPlanes={clip}
        clipIntersection
        {...shader}
      />
    </mesh>
  );
}

/**
 * Pyroclastic flows: avalanches of hot ash, pumice and gas that hug the ground as they race
 * down the flanks, with ash billowing up from their tops. Drawn as billboard puffs that
 * stream along each path; `reach` (0..1) sets how far the fronts have run.
 */
export function PyroclasticFlows({
  paths,
  surface,
  reach,
  time,
  perPath = 46,
}: {
  paths: [number, number][][];
  surface: (x: number, z: number) => number;
  reach: number;
  time: number;
  perPath?: number;
}) {
  const count = paths.length * perPath,
    ref = useRef<THREE.InstancedMesh>(null);
  const { geometry, heat } = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1),
      a = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    g.setAttribute("aHeat", a);
    return { geometry: g, heat: a };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const sun = useKeyLight();
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      v = new THREE.Vector3(),
      s = new THREE.Vector3();
    let k = 0;
    for (const path of paths) {
      const n = path.length;
      for (let i = 0; i < perPath; i++, k++) {
        const seed = Math.sin((k + 1) * 91.7) * 43758.5453,
          r = seed - Math.floor(seed),
          // Puffs stream down the path; the front only gets as far as `reach` allows.
          u = ((i / perPath + time * 0.22 + r * 0.05) % 1) * reach,
          j = Math.min(n - 1, Math.floor(u * (n - 1))),
          [x, z] = path[j],
          [x2, z2] = path[Math.min(n - 1, j + 1)],
          tl = Math.hypot(x2 - x, z2 - z) || 1,
          side = (r - 0.5) * (0.05 + 0.32 * u),
          px = x - ((z2 - z) / tl) * side,
          pz = z + ((x2 - x) / tl) * side,
          size = 0.12 + 0.3 * u + 0.06 * r,
          lift = size * 0.4 + 0.22 * u * u * (0.5 + r);
        v.set(px, surface(px, pz) + lift, pz);
        s.set(size, size, size);
        m.compose(v, q, s);
        mesh.setMatrixAt(k, m);
        heat.setX(k, 1 - u);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    heat.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [paths, surface, reach, time, perPath, heat]);
  const uniforms = useMemo(() => ({ uSun: { value: sun } }), [sun]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      frustumCulled={false}
      renderOrder={5}
    >
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={
          /* glsl */ `
attribute float aHeat;
varying vec2 vUv; varying float vSeed; varying float vHeat; varying vec2 vSun;
uniform vec3 uSun;
void main(){
  vUv=uv; vSeed=float(gl_InstanceID)*.173; vHeat=aHeat;
  mat4 mv=modelViewMatrix*instanceMatrix;
  vec4 center=mv*vec4(0.,0.,0.,1.);
  center.xy+=position.xy*vec2(length(mv[0].xyz),length(mv[1].xyz));
  vSun=normalize((viewMatrix*vec4(uSun,0.)).xy+vec2(1e-4));
  gl_Position=projectionMatrix*center;
}`
        }
        fragmentShader={
          /* glsl */ `
varying vec2 vUv; varying float vSeed; varying float vHeat; varying vec2 vSun;
${cloudNoiseGLSL}
void main(){
  vec2 p=(vUv-.5)*2.;
  float n=cloudNoise(vec3(p*2.4,vSeed));
  float edge=1.-length(p)+(n-.5)*.6;
  float density=smoothstep(0.,.45,edge);
  float alpha=(1.-exp(-density*2.6))*.92;
  if(alpha<.01)discard;
  float lit=smoothstep(-.9,.9,dot(p,vSun)+(n-.5)*.7);
  vec3 c=mix(vec3(.25,.22,.2),vec3(.7,.66,.61),lit);
  c+=vec3(1.,.38,.08)*vHeat*vHeat*smoothstep(.3,-.9,p.y)*.55;
  gl_FragColor=vec4(pow(c,vec3(2.2)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
        }
      />
    </instancedMesh>
  );
}
