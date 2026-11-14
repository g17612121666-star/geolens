import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FIELD_GLSL, OCEAN_DEPTH_M, OCEAN_DEPTH_UNITS, OCEAN_GLSL } from "./field";
import { liveUniforms } from "@/lib/shader-uniforms";

type OceanProps = { spin: number; vmax: number; strength: number; slice: number; t: number };

function useOceanUniforms({ spin, vmax, strength, slice, t }: OceanProps) {
  const uniforms = useMemo(
    () => ({
      uSpin: { value: -1 },
      uVmax: { value: 60 },
      uStrength: { value: 0.7 },
      uSlice: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );
  uniforms.uSpin.value = spin;
  uniforms.uVmax.value = vmax;
  uniforms.uStrength.value = strength;
  uniforms.uSlice.value = slice;
  uniforms.uTime.value = t;
  return uniforms;
}

const HEADER = /* glsl */ `
uniform float uSpin,uVmax,uStrength,uSlice,uTime;
${FIELD_GLSL}
${OCEAN_GLSL}
`;

/**
 * Sea surface under the storm: deep blue with wind-driven foam streaks spiraling inward,
 * strongest under the eyewall. It fades out at its edge rather than ending in a hard rim,
 * and the cutaway wedge opens a notch so the warm surface layer shows beneath.
 */
export function OceanSurface(props: OceanProps) {
  const uniforms = useOceanUniforms(props);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
      <circleGeometry args={[6.4, 200]} />
      <shaderMaterial
        transparent
        ref={liveUniforms(uniforms)}
        uniforms={uniforms}
        vertexShader={`varying vec2 vP; void main(){vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={
          HEADER +
          /* glsl */ `
varying vec2 vP;
void main(){
  // The circle lies in the xy plane before rotation: world x = x, world z = -y.
  float r=length(vP),a=atan(-vP.y,vP.x);
  if(r<5.6&&tcInCut(a,uSlice))discard;
  float w=tcWind(r,uVmax)/80.;
  float spiral=a+uSpin*.36*log(max(r,.05))*3.;
  float streak=smoothstep(.62,.95,tcNoise(vec2(spiral*46.,r*1.6+uTime*3.)))*smoothstep(.35,.8,tcNoise(vec2(spiral*9.,r*14.)));
  float foam=streak*smoothstep(.08,.7,w);
  float ripple=tcFbm(vec2(spiral*30.,r*8.))*.5+tcFbm(vP*14.)*.5;
  vec3 sea=mix(vec3(.04,.2,.33),vec3(.07,.32,.45),ripple);
  sea=mix(sea,vec3(.9,.95,.97),foam*.65);
  sea=pow(sea,vec3(2.2));
  float alpha=1.-smoothstep(5.0,6.4,r);
  gl_FragColor=vec4(sea,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
        }
      />
    </mesh>
  );
}

/**
 * Ocean faces of the cutaway: water temperature from the warm mixed layer down to the cooler
 * thermocline, cooled and shoaled under the core where strong winds mix up cooler water. The
 * dashed line marks 26.5 °C, the warmth usually needed for a tropical cyclone to form.
 */
export function OceanSection(props: OceanProps) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 220, 40), []),
    floor = useMemo(() => new THREE.CircleGeometry(5.6, 96), []);
  useEffect(
    () => () => {
      geometry.dispose();
      floor.dispose();
    },
    [geometry, floor],
  );
  const base = useOceanUniforms(props);
  const faces = useMemo(() => [-1, 1].map((side) => ({ ...base, uSide: { value: side } })), [base]);
  if (props.slice < 0.02) return null;
  const fragment =
    HEADER +
    /* glsl */ `
varying float vR; varying float vDepth;
void main(){
  float T=tcOceanT(vR,vDepth,uStrength);
  vec3 c=tcOceanColor(T);
  // 26.5 °C isotherm, dashed.
  float iso=1.-smoothstep(.0,.22,abs(T-26.5));
  float dash=step(.5,fract(vR*7.));
  c=mix(c,vec3(1.),iso*dash*.9);
  // Faint depth contours every 25 m help read the vertical scale.
  c*=.94+.06*step(.06,fract(vDepth/25.));
  c=pow(c,vec3(2.2));
  float alpha=1.-smoothstep(5.0,5.6,vR);
  gl_FragColor=vec4(c,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
  return (
    <group>
      {faces.map((uniforms) => (
        <mesh key={uniforms.uSide.value} geometry={geometry} frustumCulled={false} renderOrder={1}>
          <shaderMaterial
            transparent
            side={THREE.DoubleSide}
            ref={liveUniforms(uniforms)}
            uniforms={uniforms}
            vertexShader={
              HEADER +
              /* glsl */ `
uniform float uSide;
varying float vR; varying float vDepth;
void main(){
  float cut=1.5707963+uSide*uSlice*3.1415927*.48;
  float r=uv.x*5.6, y=-(1.-uv.y)*${OCEAN_DEPTH_UNITS.toFixed(3)};
  vR=r; vDepth=-y/${OCEAN_DEPTH_UNITS.toFixed(3)}*${OCEAN_DEPTH_M.toFixed(1)};
  gl_Position=projectionMatrix*modelViewMatrix*vec4(cos(cut)*r,y,sin(cut)*r,1.);
}`
            }
            fragmentShader={fragment}
          />
        </mesh>
      ))}
      <mesh
        geometry={floor}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -OCEAN_DEPTH_UNITS, 0]}
        renderOrder={1}
      >
        <shaderMaterial
          transparent
          side={THREE.DoubleSide}
          ref={liveUniforms(base)}
          uniforms={base}
          vertexShader={`varying vec2 vP; void main(){vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
          fragmentShader={
            HEADER +
            /* glsl */ `
varying vec2 vP;
void main(){
  float r=length(vP),a=atan(-vP.y,vP.x);
  if(!tcInCut(a,uSlice))discard;
  vec3 c=pow(tcOceanColor(tcOceanT(r,${OCEAN_DEPTH_M.toFixed(1)},uStrength))*.85,vec3(2.2));
  gl_FragColor=vec4(c,1.-smoothstep(5.0,5.6,r));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
          }
        />
      </mesh>
    </group>
  );
}
