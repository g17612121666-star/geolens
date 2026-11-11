import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { usePreferences } from "@/lib/preferences";
import { cellPoint, type Cell } from "./cell";

type V3 = [number, number, number];

const STREAK_VERTEX = /* glsl */ `
attribute float aWarm;
varying float vWarm; varying vec2 vUv;
void main(){
  vWarm=aWarm; vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);
}`;
const STREAK_FRAGMENT = /* glsl */ `
uniform float uOpacity,uLight;
varying float vWarm; varying vec2 vUv;
void main(){
  // Bright head, fading tail along the streak.
  float along=vUv.x,head=smoothstep(0.,.85,along)*(1.-smoothstep(.92,1.,along));
  // Deeper hues on the light theme, where pale streaks would vanish into the page.
  vec3 cool=mix(vec3(.62,.84,.95),vec3(.2,.5,.78),uLight),warm=mix(vec3(1.,.66,.4),vec3(.93,.45,.12),uLight);
  vec3 c=mix(cool,warm,vWarm);
  gl_FragColor=vec4(pow(c,vec3(2.2))*1.3,head*uOpacity);
  #include <colorspace_fragment>
}`;

/**
 * Streaks of air moving around the cells, in lanes across the block. Air warms as it
 * crosses the heated ground and rises (orange), then cools aloft and sinks (blue).
 */
export function FlowStreaks({
  cells,
  strength,
  lanes = [-0.85, 0, 0.85],
}: {
  cells: Cell[];
  strength: number;
  lanes?: number[];
}) {
  const perCell = 54,
    count = cells.length * lanes.length * perCell,
    ref = useRef<THREE.InstancedMesh>(null);
  const { geometry, warm } = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0.5, 0, 0);
    const a = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    g.setAttribute("aWarm", a);
    return { geometry: g, warm: a };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0.8 }, uLight: { value: 0 } }), []);
  uniforms.uOpacity.value = 0.25 + 0.65 * strength;
  uniforms.uLight.value = usePreferences((st) => st.resolvedTheme) === "light" ? 1 : 0;
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      p: new THREE.Vector3(),
      d: new THREE.Vector3(),
      toCam: new THREE.Vector3(),
      side: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      look: new THREE.Matrix4(),
    }),
    [],
  );
  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = useLabControls.getState().t,
      { m, q, s, p, d } = tmp;
    let k = 0;
    cells.forEach((cell, ci) =>
      lanes.forEach((z, li) => {
        for (let i = 0; i < perCell; i++, k++) {
          const u = (i / perCell + t * (4 + 2 * strength) + li * 0.17 + ci * 0.31) % 1,
            a = cellPoint(cell, u, z),
            b = cellPoint(cell, (u + 0.004) % 1, z);
          p.set(...a);
          d.set(b[0] - a[0], b[1] - a[1], 0).normalize();
          // Orient the streak along the flow, facing the camera as far as it can.
          tmp.toCam.subVectors(camera.position, p).normalize();
          tmp.side.crossVectors(d, tmp.toCam).normalize();
          tmp.normal.crossVectors(tmp.side, d);
          tmp.look.makeBasis(d, tmp.side, tmp.normal);
          q.setFromRotationMatrix(tmp.look);
          const len = 0.1 + 0.12 * strength;
          s.set(len, 0.016 + 0.01 * strength, 1);
          m.compose(p, q, s);
          mesh.setMatrixAt(k, m);
          // Warm from the middle of the surface branch, through the rise and the top.
          warm.setX(k, u > 0.12 && u < 0.62 ? 1 : 0);
        }
      }),
    );
    mesh.instanceMatrix.needsUpdate = true;
    warm.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      frustumCulled={false}
      renderOrder={6}
    >
      <shaderMaterial
        vertexShader={STREAK_VERTEX}
        fragmentShader={STREAK_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

const SECTION_VERTEX = /* glsl */ `
varying vec2 vXY;
void main(){vec4 w=modelMatrix*vec4(position,1.);vXY=w.xy;gl_Position=projectionMatrix*viewMatrix*w;}`;
const SECTION_FRAGMENT = /* glsl */ `
uniform float uContrast,uStrength,uUrban,uCity,uF,uTop,uHalf,uLight;
varying vec2 vXY;
// 0 over the cooler side, 1 over the warmer ground.
float heat(float x){
  return uUrban>.5?exp(-pow((x-uCity)/1.1,2.)):smoothstep(-.9,.9,x*sign(uContrast+1e-4));
}
void main(){
  float x=vXY.x,y=vXY.y/uF,h=heat(x),m=uUrban>.5?.3:.5,s=uStrength;
  // Temperature anomaly: largest near the ground over the heated side, fading with height.
  float anomaly=s*(h-m)*exp(-y/.55);
  vec3 neutral=vec3(.86,.89,.92),warm=vec3(.98,.66,.42),cool=vec3(.56,.74,.9);
  vec3 c=anomaly>0.?mix(neutral,warm,clamp(anomaly*2.6,0.,1.)):mix(neutral,cool,clamp(-anomaly*2.6,0.,1.));
  // Isobars: heated air expands, so pressure falls off more slowly with height over the warm
  // side. Near the ground the warm side has lower pressure; aloft, higher pressure.
  float scaleH=1.+.62*s*(h-m),lp=log(1.-.07*s*(h-m))-y/scaleH;
  float line=abs(fract(lp*4.2+.5)-.5);
  float iso=1.-smoothstep(.012,.03,line);
  // White lines on the dark theme's gray backdrop; slate lines on the light theme's pale one.
  c=mix(c,mix(vec3(1.),vec3(.32,.42,.52),uLight),iso*.8);
  float edge=(1.-smoothstep(uTop*.78,uTop,vXY.y))*(1.-smoothstep(uHalf-.35,uHalf,abs(x)));
  gl_FragColor=vec4(pow(c,vec3(2.2)),(.4+.4*min(1.,abs(anomaly)*2.6)+.3*iso)*edge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Cross-section of the air at the back of the block: tinted by how much warmer or cooler
 * it is than average, with isobars that dip near the ground and bulge aloft over the
 * heated side. The pattern is a schematic of the pressure field, not a model output.
 */
export function AirSection({
  contrast,
  strength,
  urban,
  city,
  factor,
  width,
  depth,
  top,
}: {
  contrast: number;
  strength: number;
  urban: boolean;
  city: number;
  factor: number;
  width: number;
  depth: number;
  top: number;
}) {
  const uniforms = useMemo(
    () => ({
      uContrast: { value: 0 },
      uStrength: { value: 0 },
      uUrban: { value: 0 },
      uCity: { value: 0 },
      uF: { value: 1 },
      uTop: { value: 1 },
      uHalf: { value: 3 },
      uLight: { value: 0 },
    }),
    [],
  );
  uniforms.uLight.value = usePreferences((st) => st.resolvedTheme) === "light" ? 1 : 0;
  uniforms.uContrast.value = contrast;
  uniforms.uStrength.value = strength;
  uniforms.uUrban.value = urban ? 1 : 0;
  uniforms.uCity.value = city;
  uniforms.uF.value = factor;
  uniforms.uTop.value = top;
  uniforms.uHalf.value = width / 2;
  return (
    <mesh position={[0, top / 2, -depth / 2 - 0.02]} renderOrder={1}>
      <planeGeometry args={[width, top]} />
      <shaderMaterial
        vertexShader={SECTION_VERTEX}
        fragmentShader={SECTION_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/** A flag on a pole: it streams downwind as the surface breeze strengthens. */
export function WindFlag({
  position,
  wind,
}: {
  position: V3;
  /** Signed surface wind along +x, 0..1. */
  wind: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.2, 0.11, 8, 1);
    g.translate(0.1, 0, 0);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const strength = Math.abs(wind),
    // A slack flag hangs down the pole; a stiff breeze holds it out level.
    droop = (1 - Math.min(1, strength * 1.4)) * 1.25;
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.4, 8]} />
        <meshStandardMaterial color="#d8d6cf" metalness={0.4} roughness={0.4} />
      </mesh>
      <group position={[0, 0.36, 0]} rotation={[0, wind < 0 ? Math.PI : 0, -droop]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#d9583a" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
