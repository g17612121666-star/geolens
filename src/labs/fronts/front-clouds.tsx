import { useMemo } from "react";
import * as THREE from "three";
import { cloudNoiseGLSL } from "../shared/cloud-material";

const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uMin,uMax,uSun;
uniform float uCold,uWarm,uF,uCeil,uOcc,uTime,uPart;
varying vec3 vWorld;
${cloudNoiseGLSL}
// Frontal surfaces in km: heights of the cold and cool air below the warm air.
float coolTop(float xk){return clamp((xk-uWarm)/150.,0.,uCeil);}
// Cloud density at a world point. Structure is set in km (1 scene unit = 100 km across;
// heights scaled by uF); the billows use the teaching-view shape so they stay round.
float cell(float dx,float dz,float hk,float rad,float topK,float n){
  // A broad, flat-based tower that bulges toward the top.
  float r=rad*(.85+.35*smoothstep(.3,1.,hk/topK));
  float c=(1.-length(vec2(dx,dz))/r)*1.3+(n-.5)*1.5;
  return c*smoothstep(1.,1.35,hk)*(1.-smoothstep(topK-.5,topK+.05,hk));
}
float clouds(vec3 w){
  float xk=w.x*100.,zk=w.z*100.,hk=w.y*100./uF;
  vec3 q=vec3(w.x*3.,hk*.55,w.z*3.);
  // Domain warping gives cauliflower billows instead of smooth blobs.
  vec3 warp=vec3(cloudNoise(q*1.7+1.3),cloudNoise(q*1.7+7.1),cloudNoise(q*1.7+3.7))-.5;
  float n=cloudNoise(q*1.6+warp*.9+vec3(uTime*.04,0.,0.)),n2=cloudNoise(q*2.2+4.);
  // Clouds end in rounded edges before the front and back faces of the section.
  float ends=1.-smoothstep(52.,86.,abs(zk));
  // Each box draws only its own cloud, so where the boxes overlap nothing is drawn twice.
  // Cold front: separate cumulonimbus cells just ahead of the surface front, where warm air
  // is forced up steeply. They tower toward the top of the section and spread forward as
  // anvils under it.
  float cb=0.;
  if(uOcc<.5&&uPart<.5){
    float dx=xk-(uCold+16.);
    cb=max(cell(dx,zk+46.,hk,17.,uCeil-.25,n),
       max(cell(dx-6.,zk-2.,hk,20.,uCeil,n),cell(dx+4.,zk-44.,hk,15.,uCeil-1.,n)));
    // The anvil spreads forward under the tropopause: thin, flat-topped and fraying at its tip.
    float ax=(dx-10.)/(dx>10.?135.:30.);
    float anvil=(1.-length(vec2(ax,(hk-(uCeil-.55))/.32)))*1.3+(n2-.5)*.8;
    anvil*=1.-smoothstep(uCeil-.2,uCeil,hk);
    cb=max(cb,anvil)*ends;
  }
  if(uPart<.5)return cb;
  // Warm front: warm air glides up over the cool air. Thick, rain-bearing nimbostratus sits
  // on the frontal surface near the surface front; ahead, the cloud base rises above the
  // surface through altostratus to thin, streaky cirrus.
  float ahead=xk-uWarm;
  // Nimbostratus (thick, low base) → altostratus (base about 2–3 km) → cirrostratus and
  // cirrus (thin, high) with distance ahead of the surface front.
  float gap=mix(.3,1.6,smoothstep(40.,130.,ahead))+mix(0.,2.4,smoothstep(140.,240.,ahead));
  float baseK=coolTop(xk)+gap+.45*(1.-smoothstep(-40.,30.,ahead));
  float thick=mix(3.2,1.4,smoothstep(30.,110.,ahead));
  thick=mix(thick,.4,smoothstep(150.,240.,ahead));
  float topK=min(uCeil-.05,baseK+thick);
  float layer=smoothstep(baseK-.1,baseK+.35,hk)*(1.-smoothstep(topK-.45,topK+.05,hk));
  float span=smoothstep(-80.,-25.,ahead)*(1.-smoothstep(330.,370.,ahead));
  float sheet=cloudNoise(vec3(w.x*1.8+uTime*.03,hk*1.4,w.z*2.4)+warp*.6+2.);
  float streak=cloudNoise(vec3(w.x*1.2+uTime*.03,hk*2.4,w.z*9.)+5.);
  float tex=mix(sheet,streak,smoothstep(110.,240.,ahead));
  float deck=layer*span*ends*(.62+(tex-.5)*2.)*mix(1.,.62,smoothstep(40.,140.,ahead))*mix(1.,.7,smoothstep(150.,240.,ahead));
  // Stratiform cloud forms in sheets: thin laminae run along the sloping frontal surface.
  float sheets=.72+.28*sin((hk-coolTop(xk))*7.+tex*2.5);
  return deck*mix(1.,sheets,smoothstep(20.,90.,ahead));
}
void main(){
  vec3 ro=cameraPosition,rd=normalize(vWorld-cameraPosition);
  vec3 inv=1./rd,t0=(uMin-ro)*inv,t1=(uMax-ro)*inv,tn=min(t0,t1),tf=max(t0,t1);
  float a=max(max(tn.x,tn.y),max(tn.z,0.)),b=min(min(tf.x,tf.y),tf.z);
  if(b<=a)discard;
  float stepSize=(b-a)/float(STEPS),T=1.;
  float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  vec3 acc=vec3(0.);
  for(int i=0;i<STEPS;i++){
    vec3 p=ro+rd*(a+(float(i)+jitter)*stepSize);
    float d=clouds(p);
    if(d>.02){
      float dens=smoothstep(0.,.5,d);
      // Two samples toward a high sun: cloud above a point shades it, so bases turn gray.
      float shade=exp(-(max(clouds(p+uSun*.05),0.)+max(clouds(p+uSun*.14),0.))*2.);
      float hk=p.y*100./uF,ahead=p.x*100.-uWarm;
      // Deep storm clouds are dark underneath; thin high cloud is bright.
      vec3 dark=mix(vec3(.26,.29,.34),vec3(.58,.63,.7),smoothstep(1.,5.,hk));
      // Rain-bearing nimbostratus near the warm front is gray even where lit; the thin
      // altostratus and cirrus farther ahead are bright.
      vec3 lit=uPart<.5?vec3(.98,.98,1.):mix(mix(vec3(.6,.63,.68),vec3(.8,.82,.86),smoothstep(30.,110.,ahead)),vec3(.98,.98,1.),smoothstep(140.,240.,ahead));
      vec3 c=mix(dark,lit,shade);
      // Towering cumulonimbus is dense; the stratiform deck lets light through where thin.
      float alpha=1.-exp(-dens*stepSize*(uPart<.5?48.:30.));
      acc+=T*alpha*c;T*=1.-alpha;
      if(T<.02)break;
    }
  }
  float alpha=1.-T;if(alpha<.01)discard;
  gl_FragColor=vec4(pow(acc/alpha,vec3(2.2)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Clouds are lit by a high sun from the upper left, not the camera-following key light, so
 * their bases darken and towers keep their shape from any viewpoint. */
const SUN = new THREE.Vector3(-0.35, 1, 0.2).normalize();

type Props = {
  /** Surface positions of the fronts, km along the section. */
  cold: number;
  warm: number;
  occluded: boolean;
  /** Vertical scale: 20 in the teaching view, 1 at true scale. */
  factor: number;
  ceiling: number;
  time: number;
};

/**
 * Cloud along a mid-latitude frontal section, ray-marched through two boxes: towering
 * cumulonimbus with anvils along the steep cold front, and the layered nimbostratus,
 * altostratus and cirrus that spread ahead of the gently sloping warm front. Illustrative:
 * the shapes follow the frontal surfaces, but cloud amounts are not calculated.
 */
export function FrontClouds(props: Props) {
  const { cold, warm, factor, ceiling } = props;
  const top = (ceiling * factor) / 100 + 0.04;
  const boxes: [number, number][] = [
    [(cold - 60) / 100, (cold + 160) / 100],
    [(warm - 85) / 100, Math.min(3, (warm + 350) / 100)],
  ];
  return (
    <>
      {boxes.map(([x0, x1], i) =>
        x1 > x0 && (i === 1 || !props.occluded) ? (
          <CloudBox key={i} part={i} x0={x0} x1={x1} y1={top} steps={i ? 72 : 52} {...props} />
        ) : null,
      )}
    </>
  );
}

function CloudBox({
  x0,
  x1,
  y1,
  steps,
  cold,
  warm,
  occluded,
  factor,
  ceiling,
  time,
  part,
}: Props & { x0: number; x1: number; y1: number; steps: number; part: number }) {
  const uniforms = useMemo(
    () => ({
      uMin: { value: new THREE.Vector3() },
      uMax: { value: new THREE.Vector3() },
      uSun: { value: SUN },
      uCold: { value: 0 },
      uWarm: { value: 0 },
      uF: { value: 20 },
      uCeil: { value: 6.5 },
      uOcc: { value: 0 },
      uTime: { value: 0 },
      uPart: { value: 0 },
    }),
    [],
  );
  const y0 = 0.02;
  uniforms.uMin.value.set(x0, y0, -0.9);
  uniforms.uMax.value.set(x1, y1, 0.9);
  uniforms.uCold.value = cold;
  uniforms.uWarm.value = warm;
  uniforms.uF.value = factor;
  uniforms.uCeil.value = ceiling;
  uniforms.uOcc.value = occluded ? 1 : 0;
  uniforms.uTime.value = time;
  uniforms.uPart.value = part;
  return (
    <mesh
      position={[(x0 + x1) / 2, (y0 + y1) / 2, 0]}
      scale={[x1 - x0, y1 - y0, 1.8]}
      renderOrder={4}
      frustumCulled={false}
    >
      <boxGeometry />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        defines={{ STEPS: steps }}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
