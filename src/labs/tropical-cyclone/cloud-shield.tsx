import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Shared GLSL: Rankine wind (m/s) at radius r scene units (1 unit = 50 km, max wind at 0.6). */
const VORTEX = `
float sq(float x){return x*x;}
float windAt(float r,float vmax){return r<=.6?vmax*r/.6:vmax*.6/max(r,.001);}
float shHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float shNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(shHash(i),shHash(i+vec2(1.,0.)),f.x),mix(shHash(i+vec2(0.,1.)),shHash(i+vec2(1.,1.)),f.x),f.y);}
float shFbm(vec2 p){return .55*shNoise(p)+.3*shNoise(p*2.1+3.7)+.15*shNoise(p*4.3-1.3);}
/** Cloud-top density: clear eye, eyewall, dense overcast and two trailing rainbands. */
float shieldDensity(float r,float a,float spin,float turn,float vmax){
  float aa=a-turn*windAt(r,vmax)/max(r,.05);
  vec2 q=vec2(cos(aa),sin(aa))*r;
  float n=shFbm(q*2.6+7.);
  float eye=smoothstep(.36,.62,r);
  float wall=exp(-sq((r-.78)/.2));
  float overcast=.8*exp(-sq((r-1.3)/1.05));
  float arm=.5+.5*cos(2.*(aa+spin*1.75*log(max(r,.1)))+1.3*n);
  float bands=smoothstep(.3,.9,arm)*exp(-sq((r-2.8)/1.7))*smoothstep(.9,1.7,r);
  float d=max(max(wall,overcast),bands*1.05)*eye;
  d*=.7+.6*n;
  return d*(1.-smoothstep(4.6,5.4,r));
}`;

/** One continuous, lit cloud-top surface. Flat shading gives the cauliflower texture of convection. */
export function CloudShield({
  slice,
  spin,
  t,
  maximum,
  vertical,
}: {
  slice: number;
  spin: number;
  t: number;
  maximum: number;
  vertical: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(0.3, 5.5, 220, 110);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uSpin: { value: 1 },
      uTurn: { value: 0 },
      uVmax: { value: 60 },
      uSlice: { value: 0 },
      uVertical: { value: 1 },
    }),
    [],
  );
  uniforms.uSpin.value = spin;
  uniforms.uTurn.value = (spin * t * 7200) / 50000;
  uniforms.uVmax.value = maximum;
  uniforms.uSlice.value = slice;
  uniforms.uVertical.value = vertical;
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        `uniform float uSpin,uTurn,uVmax,uVertical; varying float vDensity; varying float vAngle;\n${VORTEX}\n` +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
  float sr=length(transformed.xz),sa=atan(transformed.z,transformed.x);
  float sd=shieldDensity(sr,sa,uSpin,uTurn,uVmax);
  vDensity=sd; vAngle=sa;
  float tower=exp(-sq((sr-.8)/.22));
  transformed.y=uVertical*(.18+sd*(.72+.55*tower));`,
        );
      s.fragmentShader =
        "uniform float uSlice; varying float vDensity; varying float vAngle;\n" +
        s.fragmentShader
          .replace(
            "#include <clipping_planes_fragment>",
            `#include <clipping_planes_fragment>
  if(vDensity<.14)discard;
  if(abs(atan(sin(vAngle-1.5707963),cos(vAngle-1.5707963)))<uSlice*3.1415927*.48)discard;`,
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
  diffuseColor.rgb*=mix(vec3(.66,.7,.75),vec3(1.),smoothstep(.15,.75,vDensity));
  diffuseColor.a*=smoothstep(.14,.32,vDensity);`,
          );
    },
    [uniforms],
  );
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial
        color="#f4f6f8"
        roughness={0.95}
        flatShading
        transparent
        side={THREE.DoubleSide}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "cyclone-shield-v1"}
      />
    </mesh>
  );
}

/** Wind-driven foam streaks on the sea, strongest under the eyewall, spiraling inward. */
export function WindSea({ spin, maximum, t }: { spin: number; maximum: number; t: number }) {
  const uniforms = useMemo(
    () => ({ uSpin: { value: 1 }, uVmax: { value: 60 }, uTime: { value: 0 } }),
    [],
  );
  uniforms.uSpin.value = spin;
  uniforms.uVmax.value = maximum;
  uniforms.uTime.value = t;
  return (
    <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[5.9, 160]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec2 vP; void main(){vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={`varying vec2 vP; uniform float uSpin,uVmax,uTime;
${VORTEX}
void main(){
  // The circle lies in the xy plane before rotation; world z = -y.
  float r=length(vP),a=atan(-vP.y,vP.x);
  float w=windAt(r,uVmax)/80.;
  float spiral=a+uSpin*.36*log(max(r,.05))*3.;
  // Adding time moves each streak to smaller r along its spiral: surface inflow.
  float streak=smoothstep(.62,.95,shNoise(vec2(spiral*46.,r*1.6+uTime*3.)))*smoothstep(.35,.8,shNoise(vec2(spiral*9.,r*14.)));
  float foam=streak*smoothstep(.08,.7,w)*(1.-smoothstep(4.8,5.8,r));
  gl_FragColor=vec4(vec3(.93,.96,.97),foam*.6);
}`}
      />
    </mesh>
  );
}

/** Falling rain under the dense cloud: short streaks, densest beneath the eyewall. */
export function RainCurtains({ vertical, maximum }: { vertical: number; maximum: number }) {
  const COUNT = 900;
  const base = useMemo(() => {
    const out: { r: number; a: number; speed: number }[] = [];
    for (let i = 0; out.length < COUNT && i < COUNT * 20; i++) {
      const u = (i * 0.618034) % 1,
        r = 0.55 + 4 * Math.sqrt((i * 0.7548777) % 1),
        a = u * Math.PI * 2,
        wall = Math.exp(-(((r - 0.8) / 0.2) ** 2)),
        band = Math.exp(-(((r - 2.6) / 1.5) ** 2)) * 0.5;
      if ((i * 0.5698403) % 1 < Math.max(wall, band))
        out.push({ r, a, speed: 0.8 + ((i * 0.31) % 0.4) });
    }
    return out;
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(base.length * 6), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    return g;
  }, [base]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useRef<THREE.LineBasicMaterial>(null);
  useFrame(({ clock }) => {
    const p = geometry.attributes.position as THREE.BufferAttribute,
      top = 0.18 * vertical,
      time = clock.elapsedTime;
    base.forEach((d, i) => {
      const y = top * (1 - ((time * d.speed * 0.6 + i * 0.37) % 1)),
        x = d.r * Math.cos(d.a),
        z = d.r * Math.sin(d.a),
        len = 0.05 * vertical;
      p.setXYZ(i * 2, x, y, z);
      p.setXYZ(i * 2 + 1, x, Math.max(0.005, y - len), z);
    });
    p.needsUpdate = true;
    if (material.current) material.current.opacity = 0.25 + (maximum / 80) * 0.35;
  });
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial ref={material} color="#b9cbd6" transparent opacity={0.45} />
    </lineSegments>
  );
}
