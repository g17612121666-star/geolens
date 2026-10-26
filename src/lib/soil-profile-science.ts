export type SoilHorizon={code:string;bottom:number;color:string;description:string};
export const SOIL_PROFILES:{name:string;context:string;horizons:SoilHorizon[]}[]=[
 {name:'Temperate brown soil',context:'Illustrative temperate profile; brown earth is not a USDA soil order.',horizons:[
  {code:'O',bottom:.04,color:'#30251b',description:'Organic litter at the surface; its thickness varies seasonally.'},
  {code:'A',bottom:.26,color:'#5c4531',description:'Mineral topsoil mixed with organic matter and roots.'},
  {code:'Bw',bottom:.95,color:'#936947',description:'Subsoil altered by weathering and soil formation; w indicates weak development.'},
  {code:'C',bottom:2,color:'#b09b78',description:'Relatively little altered parent material, not necessarily solid bedrock.'}]},
 {name:'Mollisol example',context:'Illustrative grassland soil with a thick dark mineral surface; classification requires more than color.',horizons:[
  {code:'A',bottom:.65,color:'#3e3429',description:'Thick, dark, organic-rich mineral topsoil. A mollic epipedon also has diagnostic chemical and structural criteria.'},
  {code:'Bw',bottom:1.2,color:'#76664e',description:'A weathered subsoil in this example; not every Mollisol has this exact sequence.'},
  {code:'C',bottom:2,color:'#ad9872',description:'Parent material beneath the soil-forming horizons.'}]},
 {name:'Oxisol example',context:'Illustrative highly weathered soil; broad gradual transitions, not six compulsory layers.',horizons:[
  {code:'A',bottom:.18,color:'#79503b',description:'Mineral topsoil with organic matter.'},
  {code:'Bo',bottom:1.65,color:'#a35c3f',description:'Highly weathered subsoil in this teaching example. Oxic diagnostic properties cannot be identified from red color alone.'},
  {code:'C',bottom:2,color:'#ab7455',description:'A schematic transition toward weathered parent material. Actual Oxisols can extend much deeper.'}]},
];
/** Illustrative catena on uniform parent material, not a predictive soil-erosion model. */
export function catenaProfile(x:number,slope:number){
 const u=(x+3)/6,s=Math.max(.2,Math.min(1,slope));
 // Smoothstep hill: gentle crest, steepest backslope (where soil is thinnest), concave foot.
 const v=Math.min(1,Math.max(0,u/.95)),surface=1.7*s*(1-v*v*(3-2*v));
 const thicknessM=.55-.35*s*Math.exp(-(((u-.38)/.2)**2))+(.4+.3*s)*Math.exp(-(((u-.9)/.18)**2));
 return {surface,thicknessM};
}
