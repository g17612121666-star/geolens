import type { LandSection } from "../shared/land-section";

/** Massive, jointed sandstone cap over thinly bedded mudstone with occasional sandstone beds. */
export const CAP_ROCK: LandSection = {
  soil: 0.05,
  regolith: 0.04,
  custom: `
  if(p.y>1.42){
    vec3 c=mix(vec3(.80,.73,.58),vec3(.70,.63,.49),g);
    float jc=(p.x+p.z)*1.3+.2*sNoise(vec2(p.y*3.,1.));
    float jf=fract(jc);
    if(sHash(vec2(floor(jc),2.))>.4)c*=mix(.62,1.,smoothstep(0.,.02,min(jf,1.-jf)));
    c*=mix(.55,1.,smoothstep(0.,.02,p.y-1.42));
    return c;
  }
  float y=p.y*16.+.3*sNoise(vec2((p.x+p.z)*2.,0.));
  vec3 c=mix(vec3(.43,.41,.40),vec3(.35,.34,.33),sHash(vec2(floor(y),4.)))*mix(.9,1.1,g);
  c*=mix(.82,1.,smoothstep(0.,.2,fract(y)));
  if(fract(p.y*2.7+.1)<.09)c=mix(vec3(.62,.55,.45),vec3(.55,.49,.40),g);
  return c;`,
};

/** Water-worn sandstone for the pothole slab: thick cross-bedded sets and a few joints. */
export const POTHOLE_ROCK: LandSection = {
  soil: 0,
  regolith: 0,
  custom: `
  float set = floor(p.y * 2.2);
  float dip = .35 * (sHash(vec2(set, 3.)) - .5);
  float lam = fract((p.y + (p.x + p.z) * dip) * 26.);
  vec3 c = mix(vec3(.74, .62, .46), vec3(.66, .54, .4), g * .6 + .4 * smoothstep(.2, .8, lam));
  c *= mix(.9, 1.04, sNoise(vec2(p.x + p.z, p.y) * 3.));
  c *= mix(.8, 1., smoothstep(0., .03, fract(p.y * 2.2)));
  float j = fract((p.x + p.z) * .55 + .2 * sNoise(vec2(p.y, 2.)));
  c *= mix(.75, 1., smoothstep(0., .01, min(j, 1. - j)));
  return c;`,
};
