import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BASE, CHAMBER, type Face, type Landscape } from "./landscape";

export type SectionState = {
  L: Landscape;
  style: number;
  gas: number;
  /** Seconds-like clock for moving bubbles and ash. */
  time: number;
  /** Height where rising magma shatters into ash and gas (explosive eruptions only). */
  fragmentation: number;
  /** Chamber and conduit half-width, scaled for a planar cut that misses the center. */
  chamberScale: number;
};

/**
 * Faces of the wedge cutaway (or of a straight cut across a fissure). Each face shows the
 * volcano's interior along the cut: layers that built the edifice, older crust beneath, the
 * magma chamber and the conduit or dike, with bubbles that grow as the magma rises.
 */
export function SectionFaces({ faces, state }: { faces: Face[]; state: SectionState }) {
  return (
    <>
      {faces.map((face, i) => (
        <SectionFace key={i} face={face} state={state} />
      ))}
    </>
  );
}

const RES = 1024;

function SectionFace({ face, state }: { face: Face; state: SectionState }) {
  const { L } = state;
  const profile = useMemo(() => {
    const t = new THREE.DataTexture(
      new Float32Array(RES),
      RES,
      1,
      THREE.RedFormat,
      THREE.FloatType,
    );
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  }, []);
  useEffect(() => () => profile.dispose(), [profile]);
  const data = profile.image.data as Float32Array;
  let top = 0;
  for (let i = 0; i < RES; i++) {
    const s = (i / (RES - 1)) * face.length;
    data[i] = L.h(face.origin[0] + face.dir[0] * s, face.origin[1] + face.dir[1] * s);
    top = Math.max(top, data[i]);
  }
  profile.needsUpdate = true;
  top += 0.02;

  const uniforms = useMemo(
    () => ({
      uProfile: { value: profile },
      uOrigin: { value: new THREE.Vector2() },
      uDir: { value: new THREE.Vector2(1, 0) },
      uLength: { value: 1 },
      uMode: { value: 0 },
      uForm: { value: 0 },
      uGas: { value: 0.5 },
      uStyle: { value: 0 },
      uTime: { value: 0 },
      uConduitW: { value: 0.06 },
      uVentY: { value: 0 },
      uFragY: { value: 0 },
      uChamber: { value: new THREE.Vector3(CHAMBER.y, CHAMBER.a, CHAMBER.b) },
    }),
    [profile],
  );
  uniforms.uOrigin.value.set(...face.origin);
  uniforms.uDir.value.set(...face.dir);
  uniforms.uLength.value = face.length;
  uniforms.uMode.value = L.fissure ? 1 : 0;
  uniforms.uForm.value = L.fissure ? 0 : L.e.form;
  uniforms.uGas.value = state.gas;
  uniforms.uStyle.value = state.style;
  uniforms.uTime.value = state.time;
  uniforms.uConduitW.value = L.fissure ? 0.05 : 0.095;
  uniforms.uVentY.value = L.vent;
  uniforms.uFragY.value = state.fragmentation;
  uniforms.uChamber.value.set(
    CHAMBER.y,
    (L.fissure ? 0.9 : CHAMBER.a) * state.chamberScale,
    CHAMBER.b * (L.fissure ? 0.75 : 1) * Math.sqrt(state.chamberScale),
  );

  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader =
        "varying vec3 cutWorld;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ncutWorld=(modelMatrix*vec4(transformed,1.)).xyz;",
        );
      s.fragmentShader = (SECTION_GLSL + s.fragmentShader)
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
  float cutS=dot(cutWorld.xz-uOrigin,uDir);
  float cutTop=texture2D(uProfile,vec2(clamp(cutS/uLength,0.,1.),.5)).r;
  if(cutWorld.y>cutTop)discard;
  vec3 cutRock,cutGlow;
  sectionColor(cutWorld,cutS,cutTop,cutRock,cutGlow);`,
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\n  diffuseColor.rgb*=pow(cutRock,vec3(2.2));",
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n  totalEmissiveRadiance+=pow(cutGlow,vec3(2.2));",
        );
    },
    [uniforms],
  );

  const angle = Math.atan2(-face.dir[1], face.dir[0]);
  return (
    <mesh
      position={[
        face.origin[0] + (face.dir[0] * face.length) / 2,
        (BASE + top) / 2,
        face.origin[1] + (face.dir[1] * face.length) / 2,
      ]}
      rotation={[0, angle, 0]}
      scale={[face.length, top - BASE, 1]}
      receiveShadow
    >
      <planeGeometry />
      <meshStandardMaterial
        color="white"
        roughness={0.92}
        side={THREE.DoubleSide}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "volcano-section-v2"}
      />
    </mesh>
  );
}

const SECTION_GLSL = /* glsl */ `
varying vec3 cutWorld;
uniform sampler2D uProfile;
uniform vec2 uOrigin,uDir;
uniform float uLength,uMode,uForm,uGas,uStyle,uTime,uConduitW,uVentY,uFragY;
uniform vec3 uChamber;
float vh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(vh(i),vh(i+vec2(1.,0.)),f.x),mix(vh(i+vec2(0.,1.)),vh(i+vec2(1.,1.)),f.x),f.y);}
float vfbm(vec2 p){return .5*vn(p)+.3*vn(p*2.03+3.7)+.2*vn(p*4.11-1.3);}

// Layers that built the volcano drape its surface, so they follow depth below the top,
// pinching and swelling along the cut. Shield: thin basalt flows with red, rubbly tops.
// Composite cone: pale ash and pumice layers alternating with darker lava flows.
vec3 edificeRock(vec2 q,float dd,float form){
  float T=mix(.024,.06,form);
  float L=dd/T+(vfbm(vec2(q.x*2.6,dd*2.2))-.5)*.9;
  float id=floor(L),f=fract(L),hue=vh(vec2(id,3.1));
  float grain=vn(q*95.)*.5+vn(q*27.)*.5;
  vec3 basalt=mix(vec3(.16,.145,.14),vec3(.25,.225,.21),hue)*(.8+.32*grain);
  vec3 clinker=mix(vec3(.46,.21,.12),vec3(.32,.16,.11),grain);
  vec3 shield=mix(basalt,clinker,(1.-smoothstep(.0,.22,f))*.9);
  float isAsh=step(.42,vh(vec2(id,7.7)));
  vec3 ash=mix(vec3(.68,.62,.52),vec3(.56,.51,.44),hue)*(.88+.22*grain);
  ash=mix(ash,vec3(.84,.8,.72),step(.86,vn(q*170.+id*13.))*.6);
  ash*=.82+.18*f;
  vec3 lava=mix(vec3(.24,.22,.21),vec3(.34,.31,.29),hue)*(.8+.3*grain);
  return mix(shield,mix(lava,ash,isAsh),form);
}
// Older crust under the volcano: gently folded beds.
vec3 basementRock(vec2 q,float y){
  float grain=vn(q*80.)*.45+vn(q*19.)*.35+vn(q*4.)*.2;
  float warp=(vfbm(vec2(q.x*.9,y*1.3))-.5)*.5;
  float bed=y*6.+.1*sin(q.x*1.1)+warp;
  float id=floor(bed),f=fract(bed),hue=vh(vec2(id,1.9));
  vec3 c=mix(vec3(.47,.4,.33),vec3(.38,.33,.28),hue);
  c=mix(c,vec3(.56,.5,.42),step(.86,vh(vec2(id,5.3)))*.45);
  return c*(.84+.26*grain)*(.93+.07*smoothstep(.0,.05,f));
}
// 1 inside a bubble. Cells drift upward with the magma; radius in cell units.
float bubble(vec2 q,float cell,float speed,float radius,float seed){
  vec2 p=vec2(q.x,q.y-uTime*speed)/cell;
  vec2 id=floor(p),f=fract(p)-.5,off=(vec2(vh(id+1.3+seed),vh(id+7.1+seed))-.5)*.45;
  float present=step(.3,vh(id+4.2+seed));
  return present*(1.-smoothstep(radius-.07,radius,length(f-off)));
}
vec3 magma(vec2 q,float heat){
  float flick=vn(q*16.+vec2(0.,-uTime*.5));
  vec3 c=mix(vec3(.72,.1,.02),vec3(1.,.46,.08),heat);
  return mix(c,vec3(1.,.78,.32),smoothstep(.62,1.,heat*(.75+.5*flick)));
}

void sectionColor(vec3 w,float s,float top,out vec3 rock,out vec3 glow){
  vec2 q=vec2(s,w.y);
  float r=uMode<.5?length(w.xz):abs(w.x);
  float dd=top-w.y;
  glow=vec3(0.);
  // The pre-volcano land surface sags slightly under the volcano's weight; a dark buried soil
  // marks it. On the fissure plateau, older flood-basalt flows reach deeper.
  float groundY=uMode<.5?-.015-.05*exp(-r*r*.6):-.24+.03*sin(q.x*1.7);
  rock=w.y>groundY?edificeRock(q,dd,uForm):basementRock(q,w.y);
  rock*=1.-.45*(1.-smoothstep(.0,.008,abs(w.y-groundY)));
  // Magma chamber (schematic): molten core, crystal mush at the margin, gas bubbles under
  // the roof when the magma is gas-rich.
  vec2 ce=vec2(r/max(uChamber.y,.001),(w.y-uChamber.x)/uChamber.z);
  float e=length(ce);
  float conduitTop=uMode<.5?uVentY:top;
  float inConduit=step(r,uConduitW)*step(uChamber.x,w.y)*step(w.y,conduitTop+.002);
  // Rock next to the magma is baked and reddened.
  float near=min(max(e-1.,0.)*uChamber.z*2.2,max(r-uConduitW,0.)+step(w.y,uChamber.x)*9.);
  rock=mix(rock,rock*vec3(1.35,.85,.7),exp(-near*28.)*.55);
  if(e<1.){
    float mush=smoothstep(.6,.98,e);
    vec3 m=magma(q,.55+.45*(1.-e));
    float crystals=step(.9,vn(q*150.));
    float roof=smoothstep(-.1,.75,ce.y)*smoothstep(.15,.6,uGas);
    float b=bubble(q,.04,.012,.32,0.)*step(.5,roof+vh(floor(q/.04))*.5*roof);
    vec3 molten=mix(m,m*.55,crystals*.7);
    rock=mix(molten*.4,vec3(.36,.22,.15),mush*.7);
    glow=mix(molten,molten*.2,mush)*(1.-b*.85)*.85;
    rock=mix(rock,vec3(.95,.92,.82),b*.8);
  } else if(inConduit>.5){
    float span=max(conduitTop-uChamber.x-uChamber.z*.7,.05);
    float up=clamp((w.y-uChamber.x-uChamber.z*.7)/span,0.,1.);
    float edge=smoothstep(uConduitW*.55,uConduitW,r);
    if(uStyle>2.5&&w.y>uFragY){
      // Above the fragmentation level the froth has burst into fast-rising ash and gas.
      vec2 a=vec2(q.x*70.,(q.y-uTime*1.6)*7.);
      float streak=vn(a)*.6+vn(a*2.3)*.4;
      rock=mix(vec3(.3,.28,.27),vec3(.66,.62,.58),streak);
      float clast=step(.84,vn(vec2(q.x*110.,(q.y-uTime*1.6)*45.)));
      glow=vec3(1.,.42,.1)*clast*.9+vec3(.5,.18,.05)*(1.-up)*.25;
    } else {
      // Bubbles nucleate and grow as pressure falls on the way up; gas-rich magma froths.
      // Degassed dome lava keeps only a few small bubbles.
      float amount=uStyle>1.5&&uStyle<2.5?.25:.35+.9*uGas;
      float size=mix(.12,.34+.08*uGas,up)*min(1.,amount);
      float b=bubble(q,mix(.028,.045,up),.035+.05*up,size,3.)*step(.12,up*amount);
      if(uStyle>2.5)b=max(b,smoothstep(uFragY-.12,uFragY,w.y)*bubble(q,.018,.08,.42,9.));
      vec3 m=magma(q,.9-.35*up);
      rock=m*.4;
      glow=m*(1.-b*.9)*(1.-edge*.5)*.9;
      rock=mix(rock,vec3(.95,.92,.82),b*.85);
    }
    rock*=1.-edge*.25;
  }
}
`;
