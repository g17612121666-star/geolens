import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FIELD_GLSL, KM_TO_UNITS } from "./field";
import { liveUniforms } from "@/lib/shader-uniforms";

type StormProps = {
  spin: number;
  turn: number;
  vmax: number;
  strength: number;
  slice: number;
  /** 1 teaching view (cloud heights ×5), 0.2 physical scale. */
  vertical: number;
};

function useStormUniforms({ spin, turn, vmax, strength, slice, vertical }: StormProps) {
  const uniforms = useMemo(
    () => ({
      uSpin: { value: -1 },
      uTurn: { value: 0 },
      uVmax: { value: 60 },
      uStrength: { value: 0.7 },
      uSlice: { value: 0 },
      uVert: { value: 1 },
      uSun: { value: new THREE.Vector3(-0.55, 0.72, 0.42).normalize() },
    }),
    [],
  );
  uniforms.uSpin.value = spin;
  uniforms.uTurn.value = turn;
  uniforms.uVmax.value = vmax;
  uniforms.uStrength.value = strength;
  uniforms.uSlice.value = slice;
  uniforms.uVert.value = vertical;
  return uniforms;
}

const HEADER = /* glsl */ `
uniform float uSpin,uTurn,uVmax,uStrength,uSlice,uVert;
uniform vec3 uSun;
${FIELD_GLSL}
float tcTopAt(vec2 xz){
  float r=length(xz),a=atan(xz.y,xz.x);
  return tcCloudTop(r,tcAdvect(r,a,uTurn,uVmax),uSpin,uStrength);
}
`;

/**
 * The cloud-top surface of an idealized hurricane, seen from above: clear eye, towering
 * eyewall, smooth canopy and spiral rainbands with clear gaps where the sea shows through.
 * Shaded by a fixed low sun so the relief reads; heights from tcCloudTop.
 */
export function CloudTops(props: StormProps) {
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(0.2, 5.65, 360, 170);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useStormUniforms(props);
  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        transparent
        side={THREE.DoubleSide}
        ref={liveUniforms(uniforms)}
        uniforms={uniforms}
        vertexShader={
          HEADER +
          /* glsl */ `
varying vec3 vNormalW; varying float vKm; varying float vAngle; varying float vR; varying vec2 vQ;
void main(){
  vec3 p=position;
  float h=tcTopAt(p.xz), e=.035;
  float hx=tcTopAt(p.xz+vec2(e,0.)), hz=tcTopAt(p.xz+vec2(0.,e));
  float s=${KM_TO_UNITS.toFixed(3)}*uVert;
  vNormalW=normalize(vec3(-(hx-h)*s/e,1.,-(hz-h)*s/e));
  vKm=h; vR=length(p.xz); vAngle=atan(p.z,p.x);
  float a=tcAdvect(vR,vAngle,uTurn,uVmax); vQ=vec2(cos(a),sin(a))*vR;
  p.y=.04+h*s;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`
        }
        fragmentShader={
          HEADER +
          /* glsl */ `
varying vec3 vNormalW; varying float vKm; varying float vAngle; varying float vR; varying vec2 vQ;
void main(){
  if(tcInCut(vAngle,uSlice))discard;
  float alpha=smoothstep(.6,3.4,vKm)*(1.-smoothstep(5.2,5.65,vR));
  if(alpha<.02)discard;
  vec3 n=normalize(vNormalW);
  float sun=max(dot(n,uSun),0.), wrap=.5+.5*dot(n,uSun);
  float texture=tcFbm(vQ*22.)*.5+tcFbm(vQ*60.)*.5;
  // Tall tops are bright white; lower decks and band edges look grayer.
  float lift=smoothstep(3.,14.,vKm);
  vec3 shadow=vec3(.42,.5,.6), lit=vec3(1.,.99,.97);
  vec3 c=mix(shadow,lit,clamp(.18+.62*sun+.28*wrap*lift,0.,1.));
  c*=.9+.16*texture;
  gl_FragColor=vec4(pow(c,vec3(2.2)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
        }
      />
    </mesh>
  );
}

/**
 * The two vertical faces of the cutaway, showing the inside of the storm along the cut: tall
 * eyewall towers, the clear eye, the canopy, rainbands and rain falling beneath the clouds.
 */
export function CloudSection(props: StormProps) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 300, 64), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const base = useStormUniforms(props);
  const faces = useMemo(() => [-1, 1].map((side) => ({ ...base, uSide: { value: side } })), [base]);
  if (props.slice < 0.02) return null;
  return (
    <group>
      {faces.map((uniforms) => (
        <mesh key={uniforms.uSide.value} geometry={geometry} frustumCulled={false} renderOrder={4}>
          <shaderMaterial
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            ref={liveUniforms(uniforms)}
            uniforms={uniforms}
            vertexShader={
              HEADER +
              /* glsl */ `
uniform float uSide;
varying float vR; varying float vKm; varying float vTop;
void main(){
  float cut=1.5707963+uSide*uSlice*3.1415927*.48;
  float r=uv.x*5.6;
  float top=tcCloudTop(r,tcAdvect(r,cut,uTurn,uVmax),uSpin,uStrength);
  float s=${KM_TO_UNITS.toFixed(3)}*uVert;
  // Faces reach a little above the cloud top so the rounded top edge can be drawn in the fragment.
  float y=.04+uv.y*(max(top,1.)+.6)*s;
  vR=r; vKm=(y-.04)/s; vTop=top;
  // Nudge each face a hair into the gap so it never fights the cloud-top surface.
  vec3 p=vec3(cos(cut)*r,y,sin(cut)*r)+vec3(-sin(cut),0.,cos(cut))*(-uSide*.004);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`
            }
            fragmentShader={
              HEADER +
              /* glsl */ `
varying float vR; varying float vKm; varying float vTop;
void main(){
  float fade=1.-smoothstep(5.2,5.6,vR);
  float base=1.;
  vec3 c; float alpha;
  if(vTop>1.4&&vKm>base&&vKm<vTop){
    // Inside the cloud: darker toward the base, white near the top, with towering structure.
    float up=(vKm-base)/max(vTop-base,.5);
    float towers=tcFbm(vec2(vR*13.,vKm*.35))*.6+tcFbm(vec2(vR*41.,vKm*1.3))*.4;
    float core=smoothstep(7.,14.,vTop);
    c=mix(vec3(.46,.53,.62),vec3(.96,.97,.98),smoothstep(0.,.95,up)*.85+towers*.25);
    c=mix(c,c*vec3(.8,.85,.93),core*(1.-up)*.65);
    // A thin outline traces the cloud boundary along the cut, so it reads as a section.
    float edge=1.-smoothstep(.0,.35,vTop-vKm)+1.-smoothstep(.0,.25,vKm-base);
    c=mix(c,vec3(.3,.38,.48),clamp(edge,0.,1.)*.55);
    alpha=.96*fade;
  }else if(vKm<=base&&vTop>5.){
    // Rain shafts under deep clouds: streaks slanting slightly with the inflow.
    float rate=smoothstep(5.,13.,vTop);
    float streak=step(.62,fract(vR*70.+vKm*.6+tcNoise(vec2(vR*9.,1.))*2.));
    c=vec3(.62,.7,.78);
    alpha=(.18+.3*streak)*rate*fade;
  }else discard;
  if(alpha<.01)discard;
  gl_FragColor=vec4(pow(c,vec3(2.2)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
            }
          />
        </mesh>
      ))}
    </group>
  );
}
