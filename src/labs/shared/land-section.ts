/**
 * Cut-face shaders for landform blocks: turf, topsoil and stony subsoil that follow the ground
 * surface, over bedrock whose beds stay horizontal so valleys and cliffs visibly cut through them.
 * Use with `<SectionMaterial surface …>` on a geometry prepared by `withSurfaceY`.
 */
export type Bedrock = "sandstone" | "limestone" | "granite" | "chalk" | "sand" | "shale" | "till";
export type SoilTone = "loam" | "peat" | "sandy" | "thin";

export interface LandSection {
  rock?: Bedrock;
  /** Topsoil thickness in local units; 0 removes it. */
  soil?: number;
  /** Stony weathered layer between topsoil and solid rock. */
  regolith?: number;
  soilTone?: SoilTone;
  /** Beds per local unit of height. */
  beds?: number;
  /** Vertical offset of the bedding pattern, to line a chosen bed up with a feature. */
  bedOffset?: number;
  /** GLSL body of `vec3 bedrockColour(vec3 p, float g)`, replacing the named rock. */
  custom?: string;
}

const f = (n: number) => (Number.isInteger(n) ? `${n}.` : `${n}`);
const v = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `vec3(${f(((n >> 16) & 255) / 255)},${f(((n >> 8) & 255) / 255)},${f((n & 255) / 255)})`.replace(
    /(\d\.\d{3})\d+/g,
    "$1",
  );
};

const SOILS: Record<SoilTone, [string, string, string, string]> = {
  // turf, topsoil A, topsoil B, subsoil
  loam: ["#4d5a32", "#5a4331", "#6b5038", "#8f7656"],
  peat: ["#4a4a2c", "#2f2620", "#3d3026", "#6f6150"],
  sandy: ["#8a8a55", "#8c7553", "#9e8762", "#b59f78"],
  thin: ["#5d6a3c", "#6a5440", "#76604a", "#9a8a72"],
};

/** Bedrock color at local position p; g is fine grain noise, 0–1. */
const ROCKS: Record<Bedrock, string> = {
  sandstone: `
  float y=p.y*BEDS+BEDOFF+.12*sNoise(vec2(p.x+p.z,1.)*1.7);
  float i=floor(y),fy=fract(y),h=sHash(vec2(i,3.));
  vec3 c=h<.38?${v("#c2a27a")}:h<.7?${v("#a88762")}:${v("#8a7563")};
  c*=mix(.86,1.08,g)*mix(.94,1.04,sNoise(vec2(p.x+p.z,p.y)*vec2(3.,9.)));
  c*=mix(.66,1.,smoothstep(0.,.07,fy));
  float jc=(p.x+p.z)*2.2+h*.7+.15*sNoise(vec2(p.y*6.,i));
  float jf=fract(jc);
  if(sHash(vec2(floor(jc),i))>.55)c*=mix(.74,1.,smoothstep(0.,.02,min(jf,1.-jf)));
  return c;`,
  limestone: `
  float y=p.y*BEDS+BEDOFF+.06*sNoise(vec2(p.x+p.z,1.)*2.);
  float i=floor(y),fy=fract(y),h=sHash(vec2(i,5.));
  vec3 c=mix(${v("#cfcabd")},${v("#b9b3a5")},h);
  c*=mix(.9,1.05,g)*mix(.95,1.04,sNoise(vec2(p.x+p.z,p.y)*vec2(2.,6.)));
  if(fy<.05)c=mix(${v("#857f73")},c,fy/.05);
  // Joints: spacing, offset and presence vary bed by bed, and they wander slightly.
  float jc=(p.x+p.z)*(1.2+1.1*h)+h*7.+.12*sNoise(vec2(p.y*5.,i));
  float jf=fract(jc);
  if(sHash(vec2(floor(jc),i))>.5)c*=mix(.72,1.,smoothstep(0.,.014,min(jf,1.-jf)));
  return c;`,
  granite: `
  vec2 q=vec2(p.x+p.z,p.y);
  vec3 c=mix(${v("#aaa39b")},${v("#8f8983")},g);
  c*=mix(.9,1.06,sNoise(q*4.));
  c=mix(c,${v("#4a4645")},smoothstep(.74,.84,sNoise(q*38.))*.28);
  c=mix(c,${v("#c8a596")},smoothstep(.74,.84,sNoise(q*30.+7.))*.25);
  float j=fract((p.x+p.z)*.9+.3*sNoise(vec2(p.y*2.,0.)));
  float s=fract(p.y*1.4+.2*sNoise(vec2(p.x+p.z,0.)*2.));
  c*=mix(.62,1.,smoothstep(0.,.015,min(min(j,1.-j),min(s,1.-s))));
  return c;`,
  chalk: `
  float y=p.y*BEDS+BEDOFF+.05*sNoise(vec2(p.x+p.z,1.)*2.);
  float fy=fract(y);
  vec3 c=mix(${v("#efede4")},${v("#ddd8c9")},g);
  float flint=smoothstep(.55,.7,sNoise(vec2((p.x+p.z)*18.,floor(y)*3.)))*(1.-smoothstep(.0,.05,abs(fy-.5)));
  c=mix(c,${v("#3c3f44")},flint);
  float j=fract((p.x+p.z)*1.6);
  c*=mix(.8,1.,smoothstep(0.,.02,min(j,1.-j)));
  return c;`,
  sand: `
  float bset=floor(p.y*BEDS*.5+BEDOFF);
  float lam=fract((p.y+(p.x+p.z)*(.35+.2*sHash(vec2(bset,2.))))*38.);
  vec3 c=mix(${v("#dcbf8e")},${v("#c9a673")},g*.6+.4*smoothstep(.0,.25,lam)*smoothstep(.6,.3,lam));
  float bound=fract(p.y*BEDS*.5+BEDOFF);
  c*=mix(.82,1.,smoothstep(0.,.04,bound));
  return c;`,
  shale: `
  float y=p.y*BEDS*3.+BEDOFF;
  float h=sHash(vec2(floor(y),9.));
  vec3 c=mix(${v("#6f6c69")},${v("#575552")},h)*mix(.9,1.08,g);
  c*=mix(.8,1.,smoothstep(0.,.15,fract(y)));
  return c;`,
  till: `
  vec2 q=vec2(p.x+p.z,p.y);
  vec3 c=mix(${v("#8f8475")},${v("#a59985")},g);
  float big=smoothstep(.7,.74,sNoise(q*9.)),small=smoothstep(.66,.7,sNoise(q*26.+4.));
  c=mix(c,${v("#6e6c6a")},big*.9);
  c=mix(c,${v("#b9b2a6")},small*.8);
  return c;`,
};

export function landSectionGlsl({
  rock = "sandstone",
  soil = 0.045,
  regolith = 0.11,
  soilTone = "loam",
  beds = 6,
  bedOffset = 0,
  custom,
}: LandSection = {}) {
  const [turf, a, b, sub] = SOILS[soilTone];
  return `#define BEDS ${f(beds)}
#define BEDOFF ${f(bedOffset)}
vec3 bedrockColour(vec3 p,float g){${custom ?? ROCKS[rock]}
}
vec3 sectionColour(vec3 p,vec3 w){
  float d=sectionDepth,g=grain(p.xy+p.zy);
  float wob=sNoise(vec2(p.x+p.z,.5)*5.)-.5;
  float soilB=${f(soil)}*(1.+.5*wob),regB=soilB+${f(regolith)}*(1.+.9*wob);
  vec3 c;
  if(d<min(.007,soilB))c=${v(turf)};
  else if(d<soilB)c=mix(${v(a)},${v(b)},g)*mix(.82,1.,smoothstep(0.,soilB,d));
  else if(d<regB){
    float st=smoothstep(.6,.68,sNoise(vec2(p.x+p.z,p.y)*vec2(28.,36.)));
    float frac=smoothstep(soilB,regB,d);
    c=mix(${v(sub)},bedrockColour(p,g),frac*frac*.6);
    c=mix(c,bedrockColour(p,g)*1.05,st*(.4+.5*frac));
  }else c=bedrockColour(p,g);
  float e=min(abs(d-soilB),abs(d-regB)*2.);
  return c*mix(.84,1.,smoothstep(0.,.008,e));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
}

/** Exposed-rock surface color for each bedrock, used on steep slopes. */
export const ROCK_FACE: Record<Bedrock, string> = {
  sandstone: "#a58a6a",
  limestone: "#bdb8ab",
  granite: "#9d948d",
  chalk: "#e3e0d4",
  sand: "#d2b383",
  shale: "#6b6965",
  till: "#948a7b",
};

/** Bedrock seen on steep ground: used by a terrain surface's `cliff` blend. */
export function cliffFaceGlsl(section: LandSection = {}) {
  const body = landSectionGlsl(section);
  return (
    body.slice(0, body.indexOf("vec3 sectionColour")) +
    `vec3 sectionColour(vec3 p,vec3 w){return bedrockColour(p,grain(p.xy+p.zy))*.92;}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`
  );
}
