/** Local linear density approximation, not TEOS-10. Common reference pressure;
 * Absolute Salinity in g/kg, temperature in °C, density in kg/m³. */
export function classroomDensity(temperature:number,salinity:number){
  return 1027*(1-2e-4*(temperature-10)+7.6e-4*(salinity-35));
}
/** Prescribed teaching states, not ENSO-index regressions. */
export function ensoSection(phase:number){
  const p=Math.max(-1,Math.min(1,phase));
  return {westDepth:180-60*p,eastDepth:60+50*p,westTemperature:29-.5*p,eastTemperature:24+3*p,
    tradeStrength:1-.65*p,upwelling:1-.7*p,ascentX:-1.7+1.4*Math.max(0,p),
    phase:p<-.3?'La Niña':p>.3?'El Niño':'Neutral'};
}
export const SUBTROPICAL_GYRES = [
  {name:'North Atlantic',centre:[28,-45],western:'Gulf Stream',eastern:'Canary Current',points:[[15,-55],[20,-70],[25,-79],[29,-78],[35,-72],[40,-55],[43,-35],[36,-20],[25,-20],[15,-30],[15,-55]]},
  {name:'South Atlantic',centre:[-25,-15],western:'Brazil Current',eastern:'Benguela Current',points:[[-8,-34],[-20,-38],[-35,-45],[-40,-20],[-35,5],[-20,10],[-5,-5],[-8,-34]]},
  {name:'North Pacific',centre:[28,185],western:'Kuroshio',eastern:'California Current',points:[[15,150],[15,130],[25,130],[35,142],[40,160],[40,200],[32,230],[20,240],[15,220],[15,150]]},
  {name:'South Pacific',centre:[-25,220],western:'East Australian Current',eastern:'Peru / Humboldt Current',points:[[-10,165],[-18,158],[-30,155],[-40,170],[-40,210],[-35,260],[-15,277],[-8,250],[-10,165]]},
  {name:'Indian Ocean',centre:[-25,75],western:'Agulhas Current',eastern:'West Australian Current',points:[[-10,65],[-17,53],[-30,46],[-35,30],[-40,60],[-35,100],[-20,108],[-10,100],[-10,65]]},
] as const;
/** Segment indices are tied to the geographic branches, not array position. */
export const GYRE_BRANCHES = [
  {warm:[2,3,4],cool:[6,7,8]}, {warm:[0,1],cool:[4,5]},
  {warm:[1,2,3],cool:[5,6,7]}, {warm:[0,1,2],cool:[5,6]},
  {warm:[1,2],cool:[5,6]},
];
