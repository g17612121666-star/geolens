import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { latLonToXYZ } from "@/lib/geo";
import { useCloudMap } from "@/labs/shared/materials";
import { useQuality } from "@/labs/shared/perf";
import { useLabControls } from "@/lib/store/lab-controls";

const DAY = "/textures/earth-day.jpg";
const NIGHT = "/textures/earth-night.jpg";
const BUMP = "/textures/earth-bump.jpg";

const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vObj;
  void main() {
    vUv = uv;
    vObj = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D bumpMap;
  uniform float cloudAmount;
  uniform float cloudShift;
  uniform vec3 sunDirection;
  uniform bool eclipseEnabled;
  uniform vec3 occultingPosition;
  uniform float occultingRadius;
  uniform vec3 solarPosition;
  uniform float solarRadius;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vObj;
  float eh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float en(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(eh(i),eh(i+vec3(1,0,0)),f.x),mix(eh(i+vec3(0,1,0)),eh(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(eh(i+vec3(0,0,1)),eh(i+vec3(1,0,1)),f.x),mix(eh(i+vec3(0,1,1)),eh(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float ef(vec3 p){return .5*en(p)+.25*en(p*2.03)+.13*en(p*4.07)+.07*en(p*8.1)+.05*en(p*16.3);}
  /** Illustrative cloud cover arranged in Earth's climatological belts: the equatorial
   * convergence band, clearer subtropics and swirling mid-latitude storm tracks. */
  float cloudAt(vec3 q){
    float c=cos(cloudShift),s=sin(cloudShift);
    q=vec3(c*q.x-s*q.z,q.y,s*q.x+c*q.z);
    float lat=abs(q.y);
    float itcz=exp(-pow((q.y-.08)/.09,2.));
    float storms=exp(-pow((lat-.74)/.14,2.));
    float subtropics=exp(-pow((lat-.42)/.12,2.));
    vec3 warp=vec3(ef(q*3.+1.),ef(q*3.+5.),ef(q*3.+9.));
    float d=ef(q*7.+warp*(1.2+1.6*storms));
    float cover=.3+.32*itcz+.38*storms-.28*subtropics+.1*smoothstep(.85,.95,lat);
    return smoothstep(1.-cover-.12,1.-cover+.22,d)*.85*cloudAmount;
  }
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 sun = normalize(sunDirection);
    float ndl = dot(n, sun);
    float dayF = smoothstep(-0.03, 0.06, ndl);
    vec3 day = texture2D(dayMap, vUv).rgb;
    // The day map stores oceans as near-black navy; lift them to the deep blue seen from orbit.
    float sea = smoothstep(.002, .005, day.b - max(day.r, day.g)) * (1. - smoothstep(.03, .08, max(day.r, day.g)));
    day = mix(day, vec3(.008, .035, .1), sea);
    vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.45, 1.2, 0.85);
    // Perturb the lighting normal from the actual terrain map; keep the
    // geometric normal for the day/night boundary and eclipse calculation.
    float height = texture2D(bumpMap, vUv).r;
    vec3 dp1=dFdx(vPosW), dp2=dFdy(vPosW);
    vec3 r1=cross(dp2,n), r2=cross(n,dp1);
    float det=dot(dp1,r1);
    vec3 surfaceNormal=abs(det)<1e-12?n:normalize(abs(det)*n-sign(det)*.002*(dFdx(height)*r1+dFdy(height)*r2));
    float diffuse=max(dot(surfaceNormal,sun),0.0);
    // Clouds: lit by the same Sun, casting a soft shadow slightly away from it.
    float cloud = cloudAt(vObj);
    float shadow = cloudAt(normalize(vObj + vec3(-0.012, 0.006, 0.0))) * 0.4;
    vec3 ground = day * (0.08 + 0.92 * sqrt(diffuse)) * (1.0 - shadow);
    vec3 view = normalize(cameraPosition - vPosW);
    float ocean = smoothstep(0.015, 0.09, day.b - max(day.r, day.g));
    float glint = pow(max(dot(reflect(-sun, n), view), 0.0), 40.0);
    float fresnelS = 0.04 + 0.96 * pow(1.0 - max(dot(n, view), 0.0), 5.0);
    ground += vec3(1.0, 0.92, 0.8) * (glint * 0.6 + fresnelS * 0.05) * ocean * dayF * (1.0 - cloud);
    vec3 cloudLit = vec3(0.97, 0.98, 1.0) * (0.06 + 0.94 * smoothstep(-0.05, 0.6, ndl));
    vec3 lit = mix(ground, cloudLit, cloud);
    vec3 dark = night * 0.7 * (1.0 - cloud * 0.8) + day * 0.012 + cloud * vec3(0.02, 0.025, 0.035);
    vec3 color = mix(dark, lit, dayF);
    // Twilight: a warm band where sunlight crosses the most air.
    float twilight = exp(-pow((ndl - 0.02) / 0.09, 2.0));
    color += vec3(1.0, 0.42, 0.16) * twilight * 0.09;
    // Atmospheric haze towards the limb on the day side.
    float rim = pow(1.0 - max(dot(n, view), 0.0), 2.4);
    color = mix(color, vec3(0.42, 0.68, 1.0), rim * 0.3 * smoothstep(-0.15, 0.4, ndl));
    if(eclipseEnabled && ndl>0.0){
      vec3 a=solarPosition-vPosW, b=occultingPosition-vPosW;
      float r=asin(clamp(solarRadius/length(a),0.0,1.0));
      float m=asin(clamp(occultingRadius/length(b),0.0,1.0));
      float d=acos(clamp(dot(normalize(a),normalize(b)),-1.0,1.0));
      float overlap=0.0;
      if(d<=abs(r-m))overlap=min(r*r,m*m)/(r*r);
      else if(d<r+m){
        float c1=acos(clamp((d*d+r*r-m*m)/(2.0*d*r),-1.0,1.0));
        float c2=acos(clamp((d*d+m*m-r*r)/(2.0*d*m),-1.0,1.0));
        float lens=.5*sqrt(max(0.0,(-d+r+m)*(d+r-m)*(d-r+m)*(d+r+m)));
        overlap=(r*r*c1+m*m*c2-lens)/(3.14159265359*r*r);
      }
      color*=1.0-.97*clamp(overlap,0.0,1.0);
    }
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Sun-aware atmosphere shell: blue on the day limb, reddening near the terminator. */
const haloVert = /* glsl */ `
  varying vec3 vN; varying vec3 vP;
  void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }
`;
const haloFrag = /* glsl */ `
  uniform vec3 sunDirection; varying vec3 vN; varying vec3 vP;
  void main(){
    vec3 v=normalize(cameraPosition-vP), n=normalize(vN);
    float edge=pow(1.0-abs(dot(n,v)),2.6);
    float ndl=dot(n,normalize(sunDirection));
    float lit=smoothstep(-0.35,0.35,ndl);
    vec3 c=mix(vec3(1.0,0.5,0.25),vec3(0.38,0.66,1.0),smoothstep(-0.1,0.4,ndl));
    gl_FragColor=vec4(c, edge*lit*0.85);
  }
`;

export function EarthMesh({
  sunDirection = new THREE.Vector3(4, 0.4, 2),
  radius = 1,
  segments,
  clouds,
  occluder,
  lighting = "sun",
  halo = true,
  cloudCover = 1,
}: {
  /** Scales cloud opacity, for globes shown large (such as the home page). */
  cloudCover?: number;
  /** Sun-aware atmosphere rim. */
  halo?: boolean;
  sunDirection?: THREE.Vector3;
  radius?: number;
  segments?: number;
  /** Sun-lit cloud cover; on by default for Sun-lit globes, off for viewer-lit map globes. */
  clouds?: boolean;
  occluder?: {
    position: THREE.Vector3;
    radius: number;
    sunPosition: THREE.Vector3;
    sunRadius: number;
  };
  /**
   * "sun": light comes from `sunDirection` (day/night labs).
   * "viewer": light comes from just above-left of the camera, so the face a student is
   * looking at is always lit — for labs where day and night are not the subject.
   */
  lighting?: "sun" | "viewer";
}) {
  const [dayMap, nightMap, bumpMap] = useTexture([DAY, NIGHT, BUMP]);
  const showClouds = clouds ?? lighting === "sun";
  const q = useQuality();
  const segs = segments ?? q.sphere;
  const mat = useRef<THREE.ShaderMaterial>(null);
  const sunRef = useRef(sunDirection);
  sunRef.current = sunDirection;
  const eclipseRef = useRef(occluder);
  eclipseRef.current = occluder;

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 16;
    nightMap.anisotropy = 16;
    bumpMap.anisotropy = 8;
  }, [dayMap, nightMap, bumpMap]);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      bumpMap: { value: bumpMap },
      cloudAmount: { value: 1 },
      cloudShift: { value: 0 },
      sunDirection: { value: sunDirection.clone() },
      eclipseEnabled: { value: false },
      occultingPosition: { value: new THREE.Vector3() },
      occultingRadius: { value: 0 },
      solarPosition: { value: new THREE.Vector3() },
      solarRadius: { value: 0 },
    }),
    [dayMap, nightMap, bumpMap],
  );
  const haloUniforms = useMemo(() => ({ sunDirection: { value: new THREE.Vector3(1, 0, 0) } }), []);

  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (mat.current) {
      if (lighting === "viewer" && mesh.current) {
        const centre = mesh.current.getWorldPosition(VIEW_CENTRE);
        const up = VIEW_UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
        const right = VIEW_RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion);
        mat.current.uniforms.sunDirection.value
          .copy(camera.position)
          .sub(centre)
          .normalize()
          .addScaledVector(up, 0.55)
          .addScaledVector(right, -0.45)
          .normalize();
      } else mat.current.uniforms.sunDirection.value.copy(sunRef.current);
      const e = eclipseRef.current,
        u = mat.current.uniforms;
      u.cloudAmount.value = showClouds ? cloudCover : 0;
      u.cloudShift.value = useLabControls.getState().t * 0.25;
      haloUniforms.sunDirection.value.copy(u.sunDirection.value);
      u.eclipseEnabled.value = Boolean(e);
      if (e) {
        u.occultingPosition.value.copy(e.position);
        u.occultingRadius.value = e.radius;
        u.solarPosition.value.copy(e.sunPosition);
        u.solarRadius.value = e.sunRadius;
      }
    }
  });

  return (
    <group>
      {/* Three's equirectangular u=.5 points +X; our geographic Greenwich is −Z. */}
      <mesh ref={mesh} rotation={[0, Math.PI / 2, 0]}>
        <sphereGeometry args={[radius, segs, segs]} />
        <shaderMaterial
          ref={mat}
          vertexShader={earthVert}
          fragmentShader={earthFrag}
          uniforms={uniforms}
        />
      </mesh>
      {halo && (
        <mesh scale={1.035} raycast={() => null}>
          <sphereGeometry args={[radius, 64, 48]} />
          <shaderMaterial
            vertexShader={haloVert}
            fragmentShader={haloFrag}
            uniforms={haloUniforms}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

const VIEW_CENTRE = new THREE.Vector3();
const VIEW_UP = new THREE.Vector3();
const VIEW_RIGHT = new THREE.Vector3();

export function CloudLayer({ radius = 1.012 }: { radius?: number }) {
  const map = useCloudMap();
  const q = useQuality();
  const t = useLabControls((s) => s.t);
  return (
    <mesh rotation={[0, Math.PI / 2 + t * 0.08, 0]}>
      <sphereGeometry args={[radius, q.sphere, q.sphere]} />
      <meshStandardMaterial
        map={map}
        transparent
        opacity={0.55}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

export function Atmosphere({ radius = 1.035 }: { radius?: number }) {
  const q = useQuality();
  return (
    <mesh>
      <sphereGeometry args={[radius, q.sphere, q.sphere]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        vertexShader={
          /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `
        }
        fragmentShader={
          /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vWorld;
          void main() {
            vec3 view = normalize(cameraPosition - vWorld);
            float f = pow(1.0 - max(dot(normalize(vNormal), view), 0.0), 3.4);
            gl_FragColor = vec4(0.36, 0.7, 1.0, clamp(f * 0.6, 0.0, 0.36));
          }
        `
        }
      />
    </mesh>
  );
}

export function AxisLine({
  radius = 1.18,
  tiltDeg = 23.44,
  markerRadius = 0.028,
}: {
  radius?: number;
  tiltDeg?: number;
  markerRadius?: number;
}) {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -radius, 0),
      new THREE.Vector3(0, radius, 0),
    ]);
    const m = new THREE.LineBasicMaterial({
      color: 0xf4efe6,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.Line(g, m);
  }, [radius]);
  useEffect(
    () => () => {
      obj.geometry.dispose();
      obj.material.dispose();
    },
    [obj],
  );
  return (
    <group rotation={[0, 0, THREE.MathUtils.degToRad(tiltDeg)]}>
      <primitive object={obj} />
      <mesh position={[0, radius, 0]}>
        <sphereGeometry args={[markerRadius, 16, 16]} />
        <meshBasicMaterial color="#7FD4FF" />
      </mesh>
    </group>
  );
}

export function CityMarker({
  lat,
  lon,
  radius = 1.01,
  color = "#3EE0C6",
}: {
  lat: number;
  lon: number;
  radius?: number;
  color?: string;
}) {
  const pos = useMemo(() => latLonToXYZ(lat, lon, radius), [lat, lon, radius]);
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.016, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export function Graticule({ radius = 1.004 }: { radius?: number }) {
  const obj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 3) {
        pts.push(new THREE.Vector3(...latLonToXYZ(lat, lon, radius)));
        pts.push(new THREE.Vector3(...latLonToXYZ(lat, lon + 3, radius)));
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -80; lat < 80; lat += 3) {
        pts.push(new THREE.Vector3(...latLonToXYZ(lat, lon, radius)));
        pts.push(new THREE.Vector3(...latLonToXYZ(lat + 3, lon, radius)));
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({
      color: 0x8b9a97,
      transparent: true,
      opacity: 0.32,
    });
    return new THREE.LineSegments(g, m);
  }, [radius]);
  useEffect(
    () => () => {
      obj.geometry.dispose();
      obj.material.dispose();
    },
    [obj],
  );
  return <primitive object={obj} />;
}

export function Starfield({ count }: { count?: number }) {
  const q = useQuality();
  const n = count ?? q.stars;
  const positions = useMemo(() => {
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const random = (offset: number) => {
        const v = Math.sin((i + 1) * 127.1 + offset * 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      const r = 28 + random(1) * 40;
      const theta = random(2) * Math.PI * 2;
      const phi = Math.acos(2 * random(3) - 1);
      a[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      a[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      a[i * 3 + 2] = r * Math.cos(phi);
    }
    return a;
  }, [n]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <points geometry={geom}>
      <pointsMaterial color="#F4EFE6" size={0.045} sizeAttenuation />
    </points>
  );
}
