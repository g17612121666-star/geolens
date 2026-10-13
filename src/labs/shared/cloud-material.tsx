import {useMemo} from 'react';
import * as THREE from 'three';

export const cloudNoiseGLSL=`
float hash3(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cloudNoise(vec3 p){return noise3(p)*.57+noise3(p*2.07)*.28+noise3(p*4.13)*.15;}
`;

/** Camera-facing density fragments: continuous cloud banks without bead-shaped shells. */
export function CloudPuffMaterial({opacity=.75}:{opacity?:number}){
 const uniforms=useMemo(()=>({opacity:{value:opacity}}),[opacity]);
 return <shaderMaterial transparent depthWrite={false} uniforms={uniforms} vertexShader={`
  varying vec2 puffUv;varying float puffSeed;
  void main(){
   puffUv=uv;puffSeed=float(gl_InstanceID)*.173;
   mat4 mv=modelViewMatrix*instanceMatrix;vec4 centre=mv*vec4(0.,0.,0.,1.);
   centre.xy+=position.xy*vec2(length(mv[0].xyz),length(mv[1].xyz));
   gl_Position=projectionMatrix*centre;
  }
 `} fragmentShader={`
  varying vec2 puffUv;varying float puffSeed;uniform float opacity;
  ${cloudNoiseGLSL}
  void main(){
   vec2 p=(puffUv-.5)*2.;float n=cloudNoise(vec3(p*3.,puffSeed));
   float edge=1.-length(p)+(n-.5)*.4;
   float density=smoothstep(0.,.6,edge);
   float alpha=(1.-exp(-density*2.))*opacity;if(alpha<.008)discard;
   float sun=smoothstep(-.9,.9,p.y)*.45+.3+n*.25;
   gl_FragColor=vec4(mix(vec3(.33,.42,.47),vec3(.88,.94,.95),sun),alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `}/>;
}

export const cloudVertex=`
 varying vec3 rayOrigin; varying vec3 rayPoint;
 void main(){rayOrigin=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;rayPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
export const cloudFragment=`
 precision highp float;
 varying vec3 rayOrigin; varying vec3 rayPoint;
 uniform float seed; uniform float opacity;
 ${cloudNoiseGLSL}
 float densityAt(vec3 p){
  float body=1.-length(p*vec3(1.15,1.8,1.65));
  float tower=.82-length((p-vec3(-.25,.2,.02))*vec3(1.8,1.9,2.));
  float n=cloudNoise(p*6.+vec3(seed));
  return smoothstep(.02,.4,max(body,tower)+(n-.53)*.66)*smoothstep(-.39,-.25,p.y);
 }
 void main(){
  vec3 direction=normalize(rayPoint-rayOrigin), inv=1./direction;
  vec3 bounds=vec3(1.,.7,.75),lo=(-bounds-rayOrigin)*inv,hi=(bounds-rayOrigin)*inv;
  vec3 nearV=min(lo,hi),farV=max(lo,hi);
  float entry=max(max(nearV.x,nearV.y),nearV.z),exitT=min(min(farV.x,farV.y),farV.z);
  entry=max(0.,entry);if(exitT<=entry)discard;
  float stepSize=(exitT-entry)/40.,transmission=1.;vec3 colour=vec3(0.);
  vec3 sun=normalize(vec3(-.5,.85,.5));
  for(int i=0;i<40;i++){
   vec3 p=rayOrigin+direction*(entry+(float(i)+.5)*stepSize);
   float density=densityAt(p);
   if(density>.005){
    float shade=exp(-(densityAt(p+sun*.12)+densityAt(p+sun*.28))*1.1);
    vec3 light=mix(vec3(.33,.43,.50),vec3(.94,.97,.96),shade)*(.86+.14*smoothstep(-.3,.35,p.y));
    float alpha=1.-exp(-density*stepSize*opacity*15.);
    colour+=transmission*alpha*light;transmission*=1.-alpha;
    if(transmission<.025)break;
   }
  }
  float alpha=1.-transmission;if(alpha<.008)discard;
  gl_FragColor=vec4(colour/max(alpha,.001),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;
