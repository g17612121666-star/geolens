import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { usePreferences } from "@/lib/preferences";
import { CloudVolume, RainStreaks } from "../atmosphere-layers/weather-volumes";
import { airTemperature, ridge, temperatureColor, toScene } from "./terrain";

const STREAK_VERTEX = /* glsl */ `
attribute vec3 aColor;
varying vec3 vColor; varying vec2 vUv;
void main(){
  vColor=aColor; vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);
}`;
const STREAK_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor; varying vec2 vUv;
void main(){
  // Bright head, fading tail, soft edges.
  float head=smoothstep(0.,.85,vUv.x)*(1.-smoothstep(.92,1.,vUv.x));
  float edge=smoothstep(0.,.5,1.-abs(vUv.y-.5)*2.);
  gl_FragColor=vec4(pow(vColor,vec3(2.2))*1.15,head*edge*uOpacity);
  #include <colorspace_fragment>
}`;

/**
 * Streaks of air flowing over the range in lanes either side of the parcel's path, colored by
 * the air's temperature: it cools as it rises and warms as it sinks on the lee.
 */
export function AirStreaks({
  crest,
  humidity,
  f,
  lanes = [-0.85, 0.85],
}: {
  crest: number;
  humidity: number;
  f: number;
  lanes?: number[];
}) {
  const perLane = 34,
    count = lanes.length * perLane,
    ref = useRef<THREE.InstancedMesh>(null),
    light = usePreferences((s) => s.resolvedTheme) === "light";
  const { geometry, colors } = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0.5, 0, 0);
    const a = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    g.setAttribute("aColor", a);
    return { geometry: g, colors: a };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0.7 } }), []);
  uniforms.uOpacity.value = light ? 0.9 : 0.7;
  // The air's height above the ridge: lifted over it, as along the parcel's path.
  const lift = (x: number) => toScene(ridge(x, crest), f) + 0.12;
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
      basis: new THREE.Matrix4(),
      c: new THREE.Color(),
    }),
    [],
  );
  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = useLabControls.getState().t,
      { m, q, s, p, d, c } = tmp;
    let k = 0;
    lanes.forEach((z, li) => {
      for (let i = 0; i < perLane; i++, k++) {
        // Each streak keeps its own height above the ridge, depth and length.
        const r1 = Math.sin(i * 12.9898 + li * 78.233) * 43758.5453,
          r2 = Math.sin(i * 39.346 + li * 11.135) * 24634.6345,
          ra = r1 - Math.floor(r1),
          rb = r2 - Math.floor(r2),
          u = (i / perLane + t * 5 + li * 0.37) % 1,
          x = -2.95 + 5.9 * u,
          dx = 0.02,
          above = 0.12 + 0.3 * ra;
        p.set(x, lift(x) + above, z + 0.3 * (rb - 0.5));
        d.set(dx, lift(x + dx) - lift(x), 0).normalize();
        tmp.toCam.subVectors(camera.position, p).normalize();
        tmp.side.crossVectors(d, tmp.toCam).normalize();
        tmp.normal.crossVectors(tmp.side, d);
        tmp.basis.makeBasis(d, tmp.side, tmp.normal);
        q.setFromRotationMatrix(tmp.basis);
        s.set(0.12 + 0.12 * rb, 0.018, 1);
        m.compose(p, q, s);
        mesh.setMatrixAt(k, m);
        temperatureColor(airTemperature(x, crest, humidity), c);
        // The color attribute takes sRGB values; the shader converts them.
        c.convertLinearToSRGB();
        colors.setXYZ(k, c.r, c.g, c.b);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    colors.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      frustumCulled={false}
      renderOrder={5}
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

/**
 * Cloud that forms where the rising air passes cloud base: a bank hugging the windward slope
 * from cloud base to above the crest, ending just past the crest where the air starts to sink
 * and warm. Rain falls from it onto the windward slope.
 */
export function OrographicCloud({
  crest,
  lcl,
  f,
}: {
  crest: number;
  lcl: number;
  f: number;
}) {
  // Where the ground along the parcel's path rises to cloud base.
  const start = -Math.sqrt(-1.05 * Math.log(Math.min(0.999, lcl / crest))),
    end = 0.2,
    n = THREE.MathUtils.clamp(Math.round((end - start) / 0.24) + 1, 2, 7),
    base = toScene(lcl, f),
    crestY = toScene(crest, f);
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const cx = start + ((end - start) * i) / (n - 1),
          slope = toScene(ridge(cx, crest), f),
          floor = Math.max(base, slope - 0.05),
          // The bank hugs the slope; it is thickest over the upper windward slope and crest.
          top = Math.min(crestY + 0.42, Math.max(slope + 0.5, floor + 0.36)),
          height = top - floor,
          width = Math.max(0.5, ((end - start) / (n - 1)) * 1.9);
        return (
          <group key={i}>
            <CloudVolume
              position={[cx, floor + height * 0.48, -0.05]}
              scale={[width / 2, height / 1.15, 0.8]}
              seed={i + 2}
              density={40}
            />
            {cx < 0.02 && slope < floor - 0.02 && (
              <RainStreaks
                position={[cx, floor + 0.05, -0.05]}
                width={width * 0.7}
                depth={0.9}
                height={floor + 0.05 - slope}
                count={34}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

/** The air parcel: a translucent bubble tinted by its temperature, misted white in cloud. */
export function ParcelBubble({
  position,
  temperature,
  saturated,
}: {
  position: [number, number, number];
  temperature: number;
  saturated: boolean;
}) {
  const color = useMemo(() => temperatureColor(temperature), [temperature]);
  return (
    <group position={position}>
      <mesh renderOrder={6}>
        <sphereGeometry args={[0.1, 32, 24]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.25}
          clearcoat={1}
          transparent
          opacity={0.92}
        />
      </mesh>
      {saturated && (
        <mesh renderOrder={7}>
          <sphereGeometry args={[0.15, 32, 24]} />
          <meshStandardMaterial color="#f4f8fa" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
