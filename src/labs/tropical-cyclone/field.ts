/**
 * Idealized hurricane structure, shared by the cloud tops, the cutaway faces and the tests.
 * 1 scene unit = 50 km. Heights are in kilometers; the teaching view draws 1 km as 0.1 unit
 * (×5 relative to the horizontal scale), physical scale as 0.02 unit.
 *
 * Structure (typical of a mature hurricane, not one storm): a clear eye inside 15 km, the
 * eyewall peaking near the 30 km radius of maximum wind with tops near 15 km, a cirrus canopy
 * over the inner core, a weaker moat, then spiral rainbands out to about 270 km.
 */
export const KM_TO_UNITS = 0.1;
export const EYE_RADIUS = 0.3;
export const OCEAN_DEPTH_UNITS = 0.48;
/** Meters of ocean represented by OCEAN_DEPTH_UNITS (depth exaggeration is noted in the scale). */
export const OCEAN_DEPTH_M = 150;

export const FIELD_GLSL = /* glsl */ `
float tcSq(float x){return x*x;}
float tcWind(float r,float vmax){return r<=.6?vmax*r/.6:vmax*.6/max(r,.001);}
float tcHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float tcNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(tcHash(i),tcHash(i+vec2(1.,0.)),f.x),mix(tcHash(i+vec2(0.,1.)),tcHash(i+vec2(1.,1.)),f.x),f.y);}
float tcFbm(vec2 p){return .5*tcNoise(p)+.3*tcNoise(p*2.03+3.7)+.2*tcNoise(p*4.11-1.3);}

/**
 * Cloud-top height (km) at radius r and azimuth a, where a is the azimuth the cloud had before
 * the vortex turned it. spin = -1 Northern Hemisphere (counterclockwise from above), +1 Southern.
 * strength runs 0..1 with the Intensity slider.
 */
float tcCloudTop(float r,float a,float spin,float strength){
  vec2 q=vec2(cos(a),sin(a))*r;
  float n=tcFbm(q*1.7+5.),cells=tcFbm(q*6.3+11.);
  float eye=smoothstep(.27,.45,r);
  // Eyewall: tallest towers just inside the radius of maximum wind; the inner face slopes
  // outward with height (the "stadium" seen from aircraft).
  float wall=exp(-tcSq((r-.64)/(.2+.06*strength)));
  float hWall=(12.5+3.*strength)*wall;
  // Cirrus canopy spread by the outflow over the inner core.
  float canopy=(1.-smoothstep(.9+.45*strength,1.9+.6*strength,r+(n-.5)*.7))*smoothstep(.32,.6,r);
  float hCanopy=(10.5+2.*strength)*canopy;
  // Spiral rainbands wind inward cyclonically: along a band the azimuth turns with the
  // flow as the radius falls. Pitch about 20 degrees: phase = a + spin * 2.75 * ln r.
  // The offset places a band across each default cutaway face (about 120 and 190 km out).
  float phase=a+spin*2.75*log(max(r,.05))+(spin<0.?-1.67:-.2);
  float wave=.5+.5*cos(2.*phase+(n-.5)*1.2);
  float band=smoothstep(.42,.95,wave)*smoothstep(1.25,1.9,r)*(1.-smoothstep(4.5,5.5,r));
  float hBand=(6.+2.5*cells+1.5*strength)*band;
  // Scattered cumulus between the bands.
  float hCu=2.6*smoothstep(.7,.9,tcFbm(q*2.2+2.))*smoothstep(1.5,2.2,r)*(1.-smoothstep(4.8,5.6,r));
  float h=max(max(hWall,hCanopy),max(hBand,hCu))*eye;
  // Cauliflower texture on convective towers.
  h+=(cells-.5)*1.4*smoothstep(3.,8.,h);
  return clamp(h,0.,16.5);
}

/** Radius-dependent turning of the cloud pattern after the vortex has run for 'turn'. */
float tcAdvect(float r,float a,float turn,float vmax){return a-turn*tcWind(r,vmax)/max(r,.05);}

/** Whether a point at fixed azimuth a lies inside the cutaway wedge that faces the viewer (+z). */
bool tcInCut(float a,float slice){
  return abs(atan(sin(a-1.5707963),cos(a-1.5707963)))<slice*3.1415927*.48;
}
`;

/** Ocean temperature (°C) at radius r (units) and depth (m): a warm mixed layer, cooled and
 * shoaled under the core where the storm's winds mix up cooler water. */
export function oceanTemperature(r: number, depthM: number, strength: number) {
  const core = Math.exp(-(((r - 0.7) / 1.1) ** 2)),
    surface = 29 - 2.2 * strength * core,
    mixed = 55 - 28 * strength * core;
  return depthM <= mixed ? surface : Math.max(16, surface - (depthM - mixed) * 0.085);
}

export const OCEAN_GLSL = /* glsl */ `
float tcOceanT(float r,float depth,float strength){
  float core=exp(-tcSq((r-.7)/1.1)),surface=29.-2.2*strength*core,mixed=55.-28.*strength*core;
  return depth<=mixed?surface:max(16.,surface-(depth-mixed)*.085);
}
vec3 tcOceanColor(float T){
  vec3 cold=vec3(.06,.2,.42),cool=vec3(.08,.42,.58),warm=vec3(.95,.72,.32),hot=vec3(.92,.38,.18);
  vec3 c=mix(cold,cool,smoothstep(16.,22.,T));
  c=mix(c,warm,smoothstep(24.,27.,T));
  return mix(c,hot,smoothstep(27.5,29.,T));
}
`;
